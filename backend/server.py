from contextlib import asynccontextmanager
from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Literal
import uuid
from datetime import datetime, timezone, date, timedelta

from jee_data import JEE_SYLLABUS, flat_topics

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# ---- Logging (must be before route handlers that reference `logger`) ----
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ---- Constants (must be before route handlers that reference them) ----
APP_VERSION = "1.0.7-secure-journal"

# Motor client and db are created inside the async lifespan to ensure
# they are created within a running event loop. Creating them at module
# import time in Vercel serverless causes event loop conflicts and crashes
# every real DB operation even though the client object exists (health said "connected").
client = None
db = None

_cached_models = None

def get_dynamic_models(api_key: str) -> list:
    global _cached_models
    if _cached_models is not None:
        return _cached_models
    try:
        import google.generativeai as genai
        genai.configure(api_key=api_key)
        models = []
        for m in genai.list_models():
            methods = getattr(m, 'supported_generation_methods', [])
            if 'generateContent' in methods:
                name = m.name.replace("models/", "")
                if "vision" not in name and "embedding" not in name and "tuning" not in name and "exp" not in name and "thinking" not in name:
                    models.append(name)
        
        priorities = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash-8b", "gemini-1.5-flash-latest", "gemini-1.5-flash", "gemini-1.5-pro"]
        sorted_models = []
        for p in priorities:
            if p in models:
                sorted_models.append(p)
                models.remove(p)
        sorted_models.extend(models)
        
        _cached_models = sorted_models if sorted_models else ["gemini-1.5-flash"]
        return _cached_models
    except Exception as e:
        logger.error(f"Failed to fetch models: {e}")
        return ["gemini-1.5-flash"]


@asynccontextmanager
async def lifespan(app):
    global client, db
    mongo_url = os.environ.get('MONGO_URL', '')
    if not mongo_url:
        logger.error("MONGO_URL not set — DB will not connect.")
    else:
        client = AsyncIOMotorClient(mongo_url)
        db = client[os.environ.get('DB_NAME', 'minehealth')]
        try:
            await db.command("ping")
            logger.info("✅ MongoDB Atlas connected successfully.")
        except Exception as e:
            logger.error(f"❌ MongoDB ping failed: {e}")
    yield
    if client:
        client.close()

app = FastAPI(lifespan=lifespan)
api_router = APIRouter(prefix="/api")

# ---- Health check — also pings the DB to confirm real connectivity ----
@app.get("/api/health")
async def health():
    db_ping = False
    db_error = None
    if db is not None:
        try:
            await db.command("ping")
            db_ping = True
        except Exception as e:
            db_error = str(e)

    gemini_ping = False
    gemini_error = None
    api_key = os.environ.get("GEMINI_API_KEY")
    if api_key:
        try:
            import google.generativeai as genai
            genai.configure(api_key=api_key)
            for m in genai.list_models():
                if 'gemini' in m.name:
                    gemini_ping = True
                    break
        except Exception as e:
            gemini_error = str(e)

    return {
        "status": "ok",
        "version": APP_VERSION,
        "mongo_ping": db_ping,
        "mongo_error": db_error,
        "gemini_ping": gemini_ping,
        "gemini_error": gemini_error,
        "env": {
            "mongo_url_set": bool(os.environ.get('MONGO_URL')),
            "gemini_key_set": bool(api_key),
            "db_name": os.environ.get('DB_NAME', 'minehealth')
        }
    }

# ---- Constants (continued) ----
DEFAULT_USER = "player_one"
XP_PER_LEVEL = 500  # classic gamey curve

# ---- Utilities ----
def now_iso():
    return datetime.now(timezone.utc).isoformat()

def today_str():
    return date.today().isoformat()

def calc_level(xp: int):
    level = 1
    remaining = xp
    threshold = XP_PER_LEVEL
    while remaining >= threshold:
        remaining -= threshold
        level += 1
        threshold = int(threshold * 1.15)
    return {"level": level, "xp_in_level": remaining, "xp_for_next": threshold}


# ---- Models ----
class Profile(BaseModel):
    model_config = ConfigDict(extra="ignore")
    user_id: str = DEFAULT_USER
    total_xp: int = 0
    streak: int = 0
    last_active_date: Optional[str] = None
    name: str = "Player One"
    bio: str = ""
    email: str = ""
    linkedin_url: str = ""
    github_url: str = ""
    avatar_color: str = "#22C55E"  # defaults to grass green
    timezone: str = "Asia/Kolkata"

class TaskCreate(BaseModel):
    title: str
    category: Literal["study", "code", "robotics", "creative"] = "study"
    xp: int = 20
    note: Optional[str] = ""
    topic_id: Optional[str] = None
    year: Optional[int] = None
    status: Optional[str] = "active"  # active | completed | archived
    link: Optional[str] = ""

class Task(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str = DEFAULT_USER
    title: str
    category: str = "study"
    xp: int = 20
    note: str = ""
    topic_id: Optional[str] = None
    year: Optional[int] = None
    status: str = "active"
    link: str = ""
    completed: bool = False
    is_boss: bool = False
    created_at: str = Field(default_factory=now_iso)
    completed_at: Optional[str] = None

class PomodoroLog(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str = DEFAULT_USER
    subject: str
    duration_mins: int
    date: str = Field(default_factory=today_str)
    created_at: str = Field(default_factory=now_iso)

class PomodoroLogCreate(BaseModel):
    subject: str = "General"
    duration_mins: int = 25

class HabitToggle(BaseModel):
    habit: str
    date: Optional[str] = None

class MedCreate(BaseModel):
    name: str
    time: str  # "HH:MM"
    notes: Optional[str] = ""

class Med(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str = DEFAULT_USER
    name: str
    time: str
    notes: str = ""
    created_at: str = Field(default_factory=now_iso)

class Skin IssueLogCreate(BaseModel):
    severity: int = 3  # 1-5
    no_sugar: bool = True
    no_oil: bool = True
    meditation: bool = False
    note: Optional[str] = ""

class MeditationSessionCreate(BaseModel):
    duration_mins: int

class CareerEntryCreate(BaseModel):
    type: Literal["video_edit", "client", "program", "research"]
    title: str
    link: Optional[str] = ""
    date: Optional[str] = None
    note: Optional[str] = ""

class CareerEntry(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str = DEFAULT_USER
    type: str
    title: str
    link: str = ""
    date: str = Field(default_factory=today_str)
    note: str = ""
    created_at: str = Field(default_factory=now_iso)

class ChatMessageCreate(BaseModel):
    text: str
    session_id: Optional[str] = "default"

class DailyGoalsSave(BaseModel):
    study_goal: str = ""
    work_goal: str = ""
    health_goal: str = ""
    creative_goal: str = ""
    personal_goal: str = ""

class ProfileUpdate(BaseModel):
    name: Optional[str] = None
    bio: Optional[str] = None
    email: Optional[str] = None
    linkedin_url: Optional[str] = None
    github_url: Optional[str] = None
    avatar_color: Optional[str] = None
    timezone: Optional[str] = None


# ---- Profile helpers ----
async def ensure_profile():
    if db is None:
        raise HTTPException(503, "Database not connected. Check MONGO_URL environment variable.")
    prof = await db.profile.find_one({"user_id": DEFAULT_USER}, {"_id": 0})
    if not prof:
        prof = Profile().model_dump()
        await db.profile.insert_one(prof.copy())
    return prof

async def award_xp(amount: int):
    prof = await ensure_profile()
    new_xp = max(0, prof.get("total_xp", 0) + amount)
    today = today_str()
    last = prof.get("last_active_date")
    streak = prof.get("streak", 0)
    if last != today:
        # if yesterday -> continue streak
        if last:
            try:
                d_last = date.fromisoformat(last)
                if (date.today() - d_last).days == 1:
                    streak += 1
                elif (date.today() - d_last).days > 1:
                    streak = 1
                else:
                    streak = max(streak, 1)
            except Exception:
                streak = 1
        else:
            streak = 1
    await db.profile.update_one(
        {"user_id": DEFAULT_USER},
        {"$set": {"total_xp": new_xp, "last_active_date": today, "streak": streak}},
    )
    return new_xp


# ---- Routes: Profile ----
@api_router.get("/profile")
async def get_profile():
    prof = await ensure_profile()
    level = calc_level(prof.get("total_xp", 0))
    return {**prof, **level}

@api_router.patch("/profile")
async def update_profile(upd: ProfileUpdate):
    fields = {k: v for k, v in upd.model_dump().items() if v is not None}
    if fields:
        await db.profile.update_one({"user_id": DEFAULT_USER}, {"$set": fields}, upsert=True)
    prof = await ensure_profile()
    level = calc_level(prof.get("total_xp", 0))
    return {**prof, **level}


# ---- Routes: Tasks ----
@api_router.post("/tasks", response_model=Task)
async def create_task(payload: TaskCreate):
    t = Task(**payload.model_dump())
    await db.tasks.insert_one(t.model_dump())
    return t

@api_router.get("/tasks", response_model=List[Task])
async def list_tasks(category: Optional[str] = None):
    q = {"user_id": DEFAULT_USER}
    if category:
        q["category"] = category
    docs = await db.tasks.find(q, {"_id": 0}).sort("created_at", -1).to_list(500)
    return docs

@api_router.patch("/tasks/{task_id}/toggle")
async def toggle_task(task_id: str):
    t = await db.tasks.find_one({"id": task_id}, {"_id": 0})
    if not t:
        raise HTTPException(404, "Task not found")
    new_completed = not t["completed"]
    update = {"completed": new_completed, "completed_at": now_iso() if new_completed else None}
    await db.tasks.update_one({"id": task_id}, {"$set": update})
    multiplier = 2 if t.get("is_boss") else 1
    xp_delta = (t["xp"] if new_completed else -t["xp"]) * multiplier
    new_xp = await award_xp(xp_delta)
    return {"ok": True, "xp_awarded": xp_delta, "total_xp": new_xp, "completed": new_completed, "is_boss": t.get("is_boss", False)}

@api_router.patch("/tasks/{task_id}/boss")
async def toggle_boss(task_id: str):
    """Mark a task as today's boss fight. Only one boss at a time — sets others to false."""
    t = await db.tasks.find_one({"id": task_id}, {"_id": 0})
    if not t:
        raise HTTPException(404, "Task not found")
    # clear all other bosses
    await db.tasks.update_many({"user_id": DEFAULT_USER, "is_boss": True}, {"$set": {"is_boss": False}})
    new_val = not t.get("is_boss", False)
    if new_val:
        await db.tasks.update_one({"id": task_id}, {"$set": {"is_boss": True}})
    return {"is_boss": new_val}

@api_router.get("/tasks/boss")
async def get_boss():
    t = await db.tasks.find_one({"user_id": DEFAULT_USER, "is_boss": True, "completed": False}, {"_id": 0})
    return t

@api_router.delete("/tasks/{task_id}")
async def delete_task(task_id: str):
    await db.tasks.delete_one({"id": task_id})
    return {"ok": True}


# ---- Routes: JEE Syllabus ----
@api_router.get("/jee/syllabus")
async def jee_syllabus():
    topics = flat_topics()
    progress_docs = await db.jee_progress.find({"user_id": DEFAULT_USER}, {"_id": 0}).to_list(1000)
    by_id = {d["topic_id"]: d for d in progress_docs}
    for t in topics:
        p = by_id.get(t["id"], {})
        t["completed"] = bool(p.get("completed"))
        t["status"] = p.get("status", 0)  # 0 not started, 1 weak, 2 medium, 3 mastered
        t["notes"] = p.get("notes", "")
        t["revisions"] = p.get("revisions", 0)
    # group by subject-class
    grouped = {}
    for t in topics:
        key = t["subject"]
        grouped.setdefault(key, {"11": [], "12": []})
        grouped[key][t["class"]].append(t)
    total = len(topics)
    done = sum(1 for t in topics if t["completed"])
    mastered = sum(1 for t in topics if t.get("status") == 3)
    return {"syllabus": grouped, "total": total, "done": done, "mastered": mastered}


class JeeStatusUpdate(BaseModel):
    status: Optional[int] = Field(default=None, ge=0, le=3)
    notes: Optional[str] = None
    revisions: Optional[int] = Field(default=None, ge=0)


@api_router.patch("/jee/topic/{topic_id}/meta")
async def update_jee_meta(topic_id: str, payload: JeeStatusUpdate):
    fields = {k: v for k, v in payload.model_dump().items() if v is not None}
    if not fields:
        return {"ok": True}
    prev = await db.jee_progress.find_one({"user_id": DEFAULT_USER, "topic_id": topic_id}, {"_id": 0}) or {}
    prev_status = prev.get("status", 0)
    # when status set, also update completed flag (status >=2 counts as covered)
    if "status" in fields:
        fields["completed"] = fields["status"] >= 2
    fields["updated_at"] = now_iso()
    fields["user_id"] = DEFAULT_USER
    fields["topic_id"] = topic_id
    await db.jee_progress.update_one(
        {"user_id": DEFAULT_USER, "topic_id": topic_id},
        {"$set": fields},
        upsert=True,
    )
    # Award Mastered bonus only on transition INTO 3 (idempotent)
    if payload.status == 3 and prev_status != 3:
        await award_xp(30)
    elif payload.status is not None and payload.status != 3 and prev_status == 3:
        await award_xp(-30)
    return {"ok": True, **fields}


@api_router.patch("/jee/topic/{topic_id}")
async def toggle_topic(topic_id: str):
    existing = await db.jee_progress.find_one({"user_id": DEFAULT_USER, "topic_id": topic_id}, {"_id": 0})
    if existing and existing.get("completed"):
        await db.jee_progress.update_one(
            {"user_id": DEFAULT_USER, "topic_id": topic_id},
            {"$set": {"completed": False, "updated_at": now_iso()}},
        )
        await award_xp(-50)
        return {"completed": False}
    await db.jee_progress.update_one(
        {"user_id": DEFAULT_USER, "topic_id": topic_id},
        {"$set": {"user_id": DEFAULT_USER, "topic_id": topic_id, "completed": True, "updated_at": now_iso()}},
        upsert=True,
    )
    await award_xp(50)
    return {"completed": True}


# ---- Routes: Pomodoro ----
@api_router.post("/pomodoro/log", response_model=PomodoroLog)
async def log_pomodoro(payload: PomodoroLogCreate):
    p = PomodoroLog(**payload.model_dump())
    await db.pomodoro.insert_one(p.model_dump())
    # 1 XP per minute
    await award_xp(p.duration_mins)
    return p

@api_router.get("/pomodoro/stats")
async def pomodoro_stats():
    docs = await db.pomodoro.find({"user_id": DEFAULT_USER}, {"_id": 0}).to_list(2000)
    total_mins = sum(d["duration_mins"] for d in docs)
    # last 7 days
    today = date.today()
    days = [(today - timedelta(days=i)).isoformat() for i in range(6, -1, -1)]
    by_day = {d: 0 for d in days}
    by_subject = {}
    for d in docs:
        if d["date"] in by_day:
            by_day[d["date"]] += d["duration_mins"]
        by_subject[d["subject"]] = by_subject.get(d["subject"], 0) + d["duration_mins"]
    chart = [{"date": k, "minutes": v} for k, v in by_day.items()]
    subjects = [{"subject": k, "minutes": v} for k, v in by_subject.items()]
    return {"total_minutes": total_mins, "chart": chart, "subjects": subjects, "sessions": len(docs)}


# ---- Routes: Habits ----
BUILT_IN_HABITS = [
    {"key": "yoga_nidra", "label": "Yoga Nidra", "xp": 30},
    {"key": "no_junk", "label": "No Junk Food", "xp": 20},
    {"key": "daily_steps", "label": "10k Steps", "xp": 25},
    {"key": "wim_hof", "label": "Wim Hof Breathing", "xp": 30},
    {"key": "huberman_sunlight", "label": "Huberman: Morning Sunlight", "xp": 20},
    {"key": "no_sugar", "label": "No Sugar", "xp": 25},
    {"key": "no_oil", "label": "No Oil", "xp": 25},
    {"key": "meditation", "label": "Meditation", "xp": 30},
    {"key": "cold_shower", "label": "Cold Shower", "xp": 20},
    {"key": "reading", "label": "Read 20 min", "xp": 20},
]

async def get_active_habits():
    """Return user's custom habits if they exist, else built-in defaults."""
    settings = await db.settings.find_one({"user_id": DEFAULT_USER}, {"_id": 0})
    if settings and settings.get("custom_habits"):
        return settings["custom_habits"]
    return BUILT_IN_HABITS

DEFAULT_HABITS = BUILT_IN_HABITS  # alias for backward compat in achievement calc

@api_router.get("/habits/today")
async def habits_today():
    today = today_str()
    active_habits = await get_active_habits()
    done_docs = await db.habits.find({"user_id": DEFAULT_USER, "date": today}, {"_id": 0}).to_list(100)
    done = {d["habit"] for d in done_docs if d.get("done")}
    return {
        "date": today,
        "habits": [{**h, "done": h["key"] in done} for h in active_habits],
    }

@api_router.post("/habits/toggle")
async def habits_toggle(payload: HabitToggle):
    date_str = payload.date or today_str()
    habit_key = payload.habit
    active_habits = await get_active_habits()
    habit_def = next((h for h in active_habits if h["key"] == habit_key), None)
    if not habit_def:
        raise HTTPException(400, "Unknown habit")
    existing = await db.habits.find_one({"user_id": DEFAULT_USER, "habit": habit_key, "date": date_str}, {"_id": 0})
    if existing and existing.get("done"):
        await db.habits.update_one(
            {"user_id": DEFAULT_USER, "habit": habit_key, "date": date_str},
            {"$set": {"done": False}},
        )
        await award_xp(-habit_def["xp"])
        return {"done": False}
    await db.habits.update_one(
        {"user_id": DEFAULT_USER, "habit": habit_key, "date": date_str},
        {"$set": {"user_id": DEFAULT_USER, "habit": habit_key, "date": date_str, "done": True, "updated_at": now_iso()}},
        upsert=True,
    )
    await award_xp(habit_def["xp"])
    return {"done": True}

@api_router.get("/habits/stats")
async def habits_stats(days: int = 7):
    today = date.today()
    date_list = [(today - timedelta(days=i)).isoformat() for i in range(days - 1, -1, -1)]
    docs = await db.habits.find(
        {"user_id": DEFAULT_USER, "date": {"$in": date_list}, "done": True},
        {"_id": 0},
    ).to_list(1000)
    counts = {d: 0 for d in date_list}
    for h in docs:
        counts[h["date"]] = counts.get(h["date"], 0) + 1
    return {"chart": [{"date": k, "count": v} for k, v in counts.items()]}


# ---- Routes: Meds ----
@api_router.get("/meds")
async def list_meds():
    docs = await db.meds.find({"user_id": DEFAULT_USER}, {"_id": 0}).to_list(100)
    today = today_str()
    taken_today = await db.meds_taken.find({"user_id": DEFAULT_USER, "date": today}, {"_id": 0}).to_list(100)
    taken_ids = {t["med_id"] for t in taken_today}
    for d in docs:
        d["taken_today"] = d["id"] in taken_ids
    return docs

@api_router.post("/meds", response_model=Med)
async def create_med(payload: MedCreate):
    m = Med(**payload.model_dump())
    await db.meds.insert_one(m.model_dump())
    return m

@api_router.delete("/meds/{med_id}")
async def delete_med(med_id: str):
    await db.meds.delete_one({"id": med_id})
    return {"ok": True}

@api_router.patch("/meds/{med_id}/taken")
async def mark_taken(med_id: str):
    today = today_str()
    existing = await db.meds_taken.find_one({"user_id": DEFAULT_USER, "med_id": med_id, "date": today}, {"_id": 0})
    if existing:
        await db.meds_taken.delete_one({"user_id": DEFAULT_USER, "med_id": med_id, "date": today})
        return {"taken_today": False}
    await db.meds_taken.insert_one({"user_id": DEFAULT_USER, "med_id": med_id, "date": today, "at": now_iso()})
    await award_xp(15)
    return {"taken_today": True}


# ---- Routes: Skin Issue Log ----
@api_router.post("/skin issue-log")
async def add_skin issue(payload: Skin IssueLogCreate):
    doc = {
        "id": str(uuid.uuid4()),
        "user_id": DEFAULT_USER,
        "date": today_str(),
        "created_at": now_iso(),
        **payload.model_dump(),
    }
    await db.skin issue_log.insert_one(doc.copy())
    rules_followed = sum([payload.no_sugar, payload.no_oil, payload.meditation])
    await award_xp(rules_followed * 10)
    doc.pop("_id", None)
    return doc

@api_router.get("/skin issue-log")
async def list_skin issue(days: int = 30):
    today = date.today()
    date_list = [(today - timedelta(days=i)).isoformat() for i in range(days - 1, -1, -1)]
    docs = await db.skin issue_log.find(
        {"user_id": DEFAULT_USER, "date": {"$in": date_list}}, {"_id": 0}
    ).sort("created_at", -1).to_list(500)
    return docs


# ---- Routes: Meditation ----
@api_router.post("/meditation/session")
async def add_meditation(payload: MeditationSessionCreate):
    doc = {
        "id": str(uuid.uuid4()),
        "user_id": DEFAULT_USER,
        "date": today_str(),
        "duration_mins": payload.duration_mins,
        "created_at": now_iso(),
    }
    await db.meditation.insert_one(doc.copy())
    await award_xp(payload.duration_mins * 2)
    doc.pop("_id", None)
    return doc

@api_router.get("/meditation/stats")
async def meditation_stats():
    docs = await db.meditation.find({"user_id": DEFAULT_USER}, {"_id": 0}).to_list(2000)
    total = sum(d["duration_mins"] for d in docs)
    today = date.today()
    date_list = [(today - timedelta(days=i)).isoformat() for i in range(6, -1, -1)]
    by_day = {d: 0 for d in date_list}
    for d in docs:
        if d["date"] in by_day:
            by_day[d["date"]] += d["duration_mins"]
    return {
        "total_minutes": total,
        "sessions": len(docs),
        "chart": [{"date": k, "minutes": v} for k, v in by_day.items()],
    }


# ---- Routes: Career ----
class IdeasSave(BaseModel):
    ideas: List[str]


@api_router.post("/ideas/day")
async def save_ideas(payload: IdeasSave):
    """Save today's creative ideas. Requires at least 3 non-empty entries."""
    non_empty = [i.strip() for i in payload.ideas if i and i.strip()]
    if len(non_empty) < 3:
        raise HTTPException(400, f"Need at least 3 ideas. You provided {len(non_empty)}.")
    today = today_str()
    existing = await db.ideas_log.find_one({"user_id": DEFAULT_USER, "date": today}, {"_id": 0})
    doc = {
        "id": existing["id"] if existing else str(uuid.uuid4()),
        "user_id": DEFAULT_USER,
        "date": today,
        "ideas": non_empty,
        "updated_at": now_iso(),
    }
    await db.ideas_log.update_one(
        {"user_id": DEFAULT_USER, "date": today},
        {"$set": doc},
        upsert=True,
    )
    # XP: 30 base + 10 per idea beyond 3
    xp = 30 + max(0, (len(non_empty) - 3)) * 10
    if not existing:
        await award_xp(xp)
    return {"ok": True, "count": len(non_empty), "xp_awarded": 0 if existing else xp}


@api_router.get("/ideas/today")
async def ideas_today():
    today = today_str()
    doc = await db.ideas_log.find_one({"user_id": DEFAULT_USER, "date": today}, {"_id": 0})
    return doc or {"date": today, "ideas": []}


@api_router.get("/ideas/recent")
async def ideas_recent(days: int = 14):
    today = date.today()
    date_list = [(today - timedelta(days=i)).isoformat() for i in range(days)]
    docs = await db.ideas_log.find(
        {"user_id": DEFAULT_USER, "date": {"$in": date_list}}, {"_id": 0}
    ).sort("date", -1).to_list(500)
    return docs


# ---- Routes: Daily Goals ----
@api_router.post("/goals")
async def save_goals(payload: DailyGoalsSave):
    """Save or update today's daily goals. +25 XP for first set of the day."""
    today = today_str()
    existing = await db.daily_goals.find_one({"user_id": DEFAULT_USER, "date": today})
    doc = {
        "user_id": DEFAULT_USER,
        "date": today,
        **payload.model_dump(),
        "updated_at": now_iso(),
    }
    await db.daily_goals.update_one(
        {"user_id": DEFAULT_USER, "date": today},
        {"$set": doc},
        upsert=True,
    )
    xp = 0
    if not existing:
        xp = 25
        await award_xp(25)
    return {"ok": True, "xp_awarded": xp}


@api_router.get("/goals/today")
async def goals_today():
    """Get today's goals."""
    today = today_str()
    doc = await db.daily_goals.find_one({"user_id": DEFAULT_USER, "date": today}, {"_id": 0})
    return doc or {"date": today, "study_goal": "", "work_goal": "", "health_goal": "", "creative_goal": "", "personal_goal": ""}


@api_router.get("/goals/recent")
async def goals_recent(days: int = 7):
    """Get goals from the last N days."""
    today = date.today()
    date_list = [(today - timedelta(days=i)).isoformat() for i in range(days)]
    docs = await db.daily_goals.find(
        {"user_id": DEFAULT_USER, "date": {"$in": date_list}}, {"_id": 0}
    ).sort("date", -1).to_list(500)
    return docs


# ---- Routes: Distractions ----
class DistractionCreate(BaseModel):
    source: str  # phone, youtube, instagram, twitter, other
    duration_mins: int = Field(ge=1, le=480)
    note: Optional[str] = ""


@api_router.post("/distractions")
async def log_distraction(payload: DistractionCreate):
    doc = {
        "id": str(uuid.uuid4()),
        "user_id": DEFAULT_USER,
        "source": payload.source.lower(),
        "duration_mins": payload.duration_mins,
        "note": payload.note or "",
        "date": today_str(),
        "created_at": now_iso(),
    }
    await db.distractions.insert_one(doc.copy())
    # Penalty XP: -2 per minute (capped at -60)
    penalty = min(60, payload.duration_mins * 2)
    await award_xp(-penalty)
    doc.pop("_id", None)
    return {**doc, "xp_penalty": -penalty}


@api_router.get("/distractions/today")
async def distractions_today():
    today = today_str()
    docs = await db.distractions.find(
        {"user_id": DEFAULT_USER, "date": today}, {"_id": 0}
    ).sort("created_at", -1).to_list(200)
    total = sum(d["duration_mins"] for d in docs)
    by_source = {}
    for d in docs:
        by_source[d["source"]] = by_source.get(d["source"], 0) + d["duration_mins"]
    return {"date": today, "entries": docs, "total_minutes": total, "by_source": by_source}


@api_router.get("/distractions/stats")
async def distractions_stats(days: int = 7):
    today = date.today()
    date_list = [(today - timedelta(days=i)).isoformat() for i in range(days - 1, -1, -1)]
    docs = await db.distractions.find(
        {"user_id": DEFAULT_USER, "date": {"$in": date_list}}, {"_id": 0}
    ).to_list(1000)
    counts = {d: 0 for d in date_list}
    for d in docs:
        counts[d["date"]] = counts.get(d["date"], 0) + d["duration_mins"]
    return {"chart": [{"date": k, "minutes": v} for k, v in counts.items()], "total": sum(d["duration_mins"] for d in docs)}


@api_router.delete("/distractions/{entry_id}")
async def delete_distraction(entry_id: str):
    await db.distractions.delete_one({"id": entry_id, "user_id": DEFAULT_USER})
    return {"ok": True}


# ---- Routes: Career ----
@api_router.post("/career", response_model=CareerEntry)
async def add_career(payload: CareerEntryCreate):
    data = payload.model_dump()
    data["date"] = data.get("date") or today_str()
    e = CareerEntry(**data)
    await db.career.insert_one(e.model_dump())
    await award_xp(40)
    return e

@api_router.get("/career")
async def list_career(type: Optional[str] = None):
    q = {"user_id": DEFAULT_USER}
    if type:
        q["type"] = type
    docs = await db.career.find(q, {"_id": 0}).sort("created_at", -1).to_list(500)
    return docs

@api_router.delete("/career/{entry_id}")
async def delete_career(entry_id: str):
    await db.career.delete_one({"id": entry_id})
    return {"ok": True}

@api_router.get("/career/stats")
async def career_stats():
    docs = await db.career.find({"user_id": DEFAULT_USER}, {"_id": 0}).to_list(1000)
    stats = {"video_edit": 0, "client": 0, "program": 0, "research": 0}
    today = today_str()
    today_counts = {"video_edit": 0, "client": 0, "program": 0, "research": 0}
    for d in docs:
        stats[d["type"]] = stats.get(d["type"], 0) + 1
        if d["date"] == today:
            today_counts[d["type"]] = today_counts.get(d["type"], 0) + 1
    return {"totals": stats, "today": today_counts}


# Curated programs — IIT/NIT/Techfest/Research - static curated, easily expandable
CURATED_PROGRAMS = [
    {"name": "IIT Bombay Techfest", "host": "IIT Bombay", "url": "https://techfest.org/", "tag": "techfest"},
    {"name": "Shaastra", "host": "IIT Madras", "url": "https://shaastra.org/", "tag": "techfest"},
    {"name": "Cognizance", "host": "IIT Roorkee", "url": "https://cognizance.org.in/", "tag": "techfest"},
    {"name": "Exodia", "host": "NIT Trichy", "url": "https://exodia.nitt.edu/", "tag": "techfest"},
    {"name": "IIT Bombay Research Internship (IITB-RIP)", "host": "IIT Bombay", "url": "https://www.iitb.ac.in/", "tag": "research"},
    {"name": "Indian Academy of Sciences - SRFP", "host": "IAS Bangalore", "url": "https://web-japps.ias.ac.in/SRFP/", "tag": "research"},
    {"name": "KVPY / INSPIRE Scholarships", "host": "DST, Govt of India", "url": "https://online-inspire.gov.in/", "tag": "research"},
    {"name": "NIT Warangal Technozion", "host": "NIT Warangal", "url": "https://technozion.org/", "tag": "techfest"},
    {"name": "Robocon India", "host": "DD India", "url": "https://www.robocon.in/", "tag": "robotics"},
    {"name": "Smart India Hackathon", "host": "Govt of India", "url": "https://sih.gov.in/", "tag": "hackathon"},
    {"name": "Google Summer of Code", "host": "Google", "url": "https://summerofcode.withgoogle.com/", "tag": "program"},
    {"name": "MIT PRIMES-USA / PRIMES India partner reads", "host": "MIT", "url": "https://math.mit.edu/research/highschool/primes/", "tag": "research"},
]

@api_router.get("/career/programs")
async def career_programs(tag: Optional[str] = None):
    if tag:
        return [p for p in CURATED_PROGRAMS if p["tag"] == tag]
    return CURATED_PROGRAMS


# ---- Routes: Dashboard summary ----
@api_router.get("/dashboard/summary")
async def dashboard_summary():
    prof = await ensure_profile()
    level = calc_level(prof.get("total_xp", 0))
    today = today_str()

    pending = await db.tasks.count_documents({"user_id": DEFAULT_USER, "completed": False})
    done_today = await db.tasks.count_documents({
        "user_id": DEFAULT_USER,
        "completed": True,
        "completed_at": {"$gte": today},
    })
    pomo_docs = await db.pomodoro.find({"user_id": DEFAULT_USER, "date": today}, {"_id": 0}).to_list(200)
    pomo_mins_today = sum(d["duration_mins"] for d in pomo_docs)
    habit_docs = await db.habits.find({"user_id": DEFAULT_USER, "date": today, "done": True}, {"_id": 0}).to_list(100)
    habit_done_today = len(habit_docs)
    med_taken = await db.meds_taken.count_documents({"user_id": DEFAULT_USER, "date": today})
    med_total = await db.meds.count_documents({"user_id": DEFAULT_USER})
    meditation_today = await db.meditation.find({"user_id": DEFAULT_USER, "date": today}, {"_id": 0}).to_list(50)
    meditation_mins_today = sum(d["duration_mins"] for d in meditation_today)
    jee_done = await db.jee_progress.count_documents({"user_id": DEFAULT_USER, "completed": True})
    jee_total = len(flat_topics())

    active_habits = await get_active_habits()

    return {
        "profile": {**prof, **level},
        "tasks": {"pending": pending, "done_today": done_today},
        "pomodoro_mins_today": pomo_mins_today,
        "habits_done_today": habit_done_today,
        "habits_total": len(active_habits),
        "meds_taken_today": med_taken,
        "meds_total": med_total,
        "meditation_mins_today": meditation_mins_today,
        "jee_done": jee_done,
        "jee_total": jee_total,
    }


# ---- Achievements ----
ACHIEVEMENTS = [
    {"id": "first_block", "name": "First Block Placed", "desc": "Complete your first quest", "icon": "🟩", "color": "var(--grass)"},
    {"id": "sprout", "name": "Sprout", "desc": "Reach Level 2", "icon": "🌱", "color": "var(--grass)"},
    {"id": "miner", "name": "Miner Novice", "desc": "Reach Level 5", "icon": "⛏️", "color": "var(--ink-muted)"},
    {"id": "diamond_mind", "name": "Diamond Mind", "desc": "Reach Level 10", "icon": "💎", "color": "var(--diamond)"},
    {"id": "obsidian_focus", "name": "Obsidian Focus", "desc": "500 pomodoro minutes", "icon": "⬛", "color": "var(--bg-0)"},
    {"id": "emerald_streak", "name": "Emerald Streak", "desc": "7-day streak", "icon": "🟢", "color": "var(--grass-2)"},
    {"id": "nether_streak", "name": "Nether Streak", "desc": "30-day streak", "icon": "🔥", "color": "var(--redstone)"},
    {"id": "grassroots", "name": "Grassroots", "desc": "All 10 habits in one day", "icon": "🌿", "color": "var(--grass)"},
    {"id": "alchemist", "name": "Alchemist", "desc": "10 skin issue logs saved", "icon": "🧪", "color": "var(--diamond)"},
    {"id": "monk", "name": "Meditation Monk", "desc": "100 meditation minutes", "icon": "🕯️", "color": "var(--gold)"},
    {"id": "chapter_slayer", "name": "Chapter Slayer", "desc": "10 JEE topics complete", "icon": "📘", "color": "var(--diamond)"},
    {"id": "jee_warrior", "name": "JEE Warrior", "desc": "50 JEE topics complete", "icon": "⚔️", "color": "var(--gold)"},
    {"id": "creator", "name": "Career Creator", "desc": "10 career entries logged", "icon": "🎬", "color": "var(--redstone)"},
]

async def compute_achievements():
    prof = await ensure_profile()
    level_info = calc_level(prof.get("total_xp", 0))
    level = level_info["level"]
    streak = prof.get("streak", 0)

    tasks_done = await db.tasks.count_documents({"user_id": DEFAULT_USER, "completed": True})
    pomo_docs = await db.pomodoro.find({"user_id": DEFAULT_USER}, {"_id": 0}).to_list(5000)
    pomo_mins = sum(d["duration_mins"] for d in pomo_docs)
    today = today_str()
    habits_today = await db.habits.count_documents({"user_id": DEFAULT_USER, "date": today, "done": True})
    skin issue_count = await db.skin issue_log.count_documents({"user_id": DEFAULT_USER})
    med_docs = await db.meditation.find({"user_id": DEFAULT_USER}, {"_id": 0}).to_list(2000)
    med_mins = sum(d["duration_mins"] for d in med_docs)
    jee_done = await db.jee_progress.count_documents({"user_id": DEFAULT_USER, "completed": True})
    career_count = await db.career.count_documents({"user_id": DEFAULT_USER})

    unlocks = {
        "first_block": tasks_done >= 1,
        "sprout": level >= 2,
        "miner": level >= 5,
        "diamond_mind": level >= 10,
        "obsidian_focus": pomo_mins >= 500,
        "emerald_streak": streak >= 7,
        "nether_streak": streak >= 30,
        "grassroots": habits_today >= 10,
        "alchemist": skin issue_count >= 10,
        "monk": med_mins >= 100,
        "chapter_slayer": jee_done >= 10,
        "jee_warrior": jee_done >= 50,
        "creator": career_count >= 10,
    }
    progress = {
        "first_block": {"cur": tasks_done, "target": 1},
        "sprout": {"cur": level, "target": 2},
        "miner": {"cur": level, "target": 5},
        "diamond_mind": {"cur": level, "target": 10},
        "obsidian_focus": {"cur": pomo_mins, "target": 500},
        "emerald_streak": {"cur": streak, "target": 7},
        "nether_streak": {"cur": streak, "target": 30},
        "grassroots": {"cur": habits_today, "target": 10},
        "alchemist": {"cur": skin issue_count, "target": 10},
        "monk": {"cur": med_mins, "target": 100},
        "chapter_slayer": {"cur": jee_done, "target": 10},
        "jee_warrior": {"cur": jee_done, "target": 50},
        "creator": {"cur": career_count, "target": 10},
    }
    return [
        {**a, "unlocked": unlocks.get(a["id"], False), "progress": progress.get(a["id"], {"cur": 0, "target": 1})}
        for a in ACHIEVEMENTS
    ]


@api_router.get("/achievements")
async def get_achievements():
    return await compute_achievements()


@api_router.get("/public-profile")
async def public_profile():
    """Read-only shareable public profile."""
    prof = await ensure_profile()
    level = calc_level(prof.get("total_xp", 0))
    achievements = await compute_achievements()
    unlocked = [a for a in achievements if a["unlocked"]]

    # recent wins: tasks completed + career entries
    recent_tasks = await db.tasks.find(
        {"user_id": DEFAULT_USER, "completed": True}, {"_id": 0}
    ).sort("completed_at", -1).limit(10).to_list(10)
    recent_career = await db.career.find({"user_id": DEFAULT_USER}, {"_id": 0}).sort("created_at", -1).limit(10).to_list(10)

    # jee + stats
    jee_done = await db.jee_progress.count_documents({"user_id": DEFAULT_USER, "completed": True})
    jee_total = len(flat_topics())
    pomo_docs = await db.pomodoro.find({"user_id": DEFAULT_USER}, {"_id": 0}).to_list(5000)
    pomo_mins = sum(d["duration_mins"] for d in pomo_docs)
    med_docs = await db.meditation.find({"user_id": DEFAULT_USER}, {"_id": 0}).to_list(5000)
    med_mins = sum(d["duration_mins"] for d in med_docs)

    return {
        "profile": {
            "name": prof.get("name", "Player One"),
            "bio": prof.get("bio", ""),
            "linkedin_url": prof.get("linkedin_url", ""),
            "github_url": prof.get("github_url", ""),
            "avatar_color": prof.get("avatar_color", "#22C55E"),
            "total_xp": prof.get("total_xp", 0),
            "streak": prof.get("streak", 0),
            **level,
        },
        "achievements": achievements,
        "unlocked_count": len(unlocked),
        "recent_tasks": recent_tasks,
        "recent_career": recent_career,
        "stats": {
            "jee_done": jee_done,
            "jee_total": jee_total,
            "pomo_mins": pomo_mins,
            "meditation_mins": med_mins,
        },
    }


# ---- Routes: AI Buddy (Gemini Brain) ----
def _sanitize_history(docs: list) -> list:
    """
    Ensure Gemini chat history strictly alternates: user → model → user → model.
    
    CRITICAL FIX (Bug #9): When a Gemini API call fails mid-flight, the user's
    message is already saved to MongoDB but the assistant reply is not. On the
    next request, this orphaned user message creates consecutive same-role turns
    in the history, which causes google-generativeai==0.8.3 to raise InvalidArgument.
    This permanently breaks the chat session for all future messages.
    
    This sanitizer:
    1. Enforces strict role alternation (user, model, user, model, ...)
    2. On any out-of-order message, resets the buffer and restarts from that point
    3. Strips any trailing 'user' messages that have no model reply (orphaned)
    """
    sanitized = []
    expected_role = "user"
    for doc in docs:
        role = "model" if doc.get("role") == "assistant" else "user"
        if role != expected_role:
            # Out-of-order: reset to avoid a cascade crash
            sanitized = []
            expected_role = "user"
            if role != "user":
                continue
        sanitized.append({"role": role, "parts": [str(doc.get("content", ""))]})
        expected_role = "model" if role == "user" else "user"
    
    # Drop any trailing "user" with no model reply (orphaned from a previous crash)
    while sanitized and sanitized[-1]["role"] == "user":
        sanitized.pop()
    
    return sanitized

async def build_buddy_system():
    prof = await ensure_profile()
    settings = await get_settings()
    
    # Get latest logs for context
    career_docs = await db.career.find({"user_id": DEFAULT_USER}, {"_id": 0}).sort("created_at", -1).to_list(3)
    skin issue_docs = await db.skin issue_log.find({"user_id": DEFAULT_USER}, {"_id": 0}).sort("date", -1).to_list(1)
    
    recent_career = "\n".join([f"- {d.get('title', '')} ({d.get('date', '')})" for d in career_docs]) if career_docs else "None recently"
    skin issue_status = f"Severity {skin issue_docs[0].get('severity')} on {skin issue_docs[0].get('date')} ({skin issue_docs[0].get('note', '')})" if skin issue_docs else "No recent logs"

    persona = settings.get("buddy_persona", "")
    persona_text = f"\nUser Custom Persona/Rules:\n{persona}" if persona else ""

    return (
        f"You are 'Blocky', a Minecraft-themed life buddy for {prof.get('name', 'Player One')}. "
        f"They are an 18-year-old JEE aspirant with severe health condition who also does robotics, coding, content creation, and career building.\n\n"
        f"--- USER CONTEXT ---\n"
        f"Bio: {prof.get('bio', 'Not provided')}\n"
        f"Current Level: {calc_level(prof.get('total_xp', 0))['level']} (XP: {prof.get('total_xp', 0)})\n"
        f"Current Streak: {prof.get('streak', 0)} days\n"
        f"Recent Career Wins:\n{recent_career}\n"
        f"Latest Skin Condition:\n{skin issue_status}\n"
        f"--------------------\n\n"
        "You are hype, kind, and concise (max 120 words). Drop pixel-gaming metaphors sparingly (e.g. 'XP', 'Level up', 'Mob'). "
        "Daily duties: remind about meds, food timing, sleep, yoga nidra, Wim Hof breathing, Huberman morning sunlight, and no sugar/no oil rule for health condition. "
        "Suggest fresh techniques (one new neuroscience/productivity/habit technique at a time). "
        "Answer JEE Physics/Chem/Maths 11/12 doubts with short step-by-step logic. "
        "For skin issue check: flag red-flag foods (sugar/oil/dairy) for health condition-prone skin. "
        "Never output medical diagnoses - recommend seeing a doctor for anything serious. End most replies with a tiny hype line.\n"
        "IMPORTANT: Output ONLY the final response text. DO NOT output any internal thoughts, drafting, or planning process."
        f"{persona_text}"
    )

@api_router.post("/ai/chat")
async def ai_chat(payload: ChatMessageCreate):
    import traceback
    try:
        try:
            import google.generativeai as genai
        except Exception as e:
            raise Exception(f"CRITICAL: Failed to import google-generativeai. Is it in requirements.txt? Error: {e}")

        api_key = os.environ.get("GEMINI_API_KEY")
        if not api_key:
            raise Exception("GEMINI_API_KEY missing from environment variables.")

        genai.configure(api_key=api_key)

        if db is None:
            raise Exception("Database not connected. Lifespan startup might have failed.")

        session_id = payload.session_id or "default"
        
        # 1. Fetch recent chat history
        history_docs = await db.chat_messages.find(
            {"user_id": DEFAULT_USER, "session_id": session_id}, {"_id": 0}
        ).sort("created_at", -1).to_list(12)
        history_docs.reverse()
        
        # 2. Append current message to local DB for persistence
        user_doc = {
            "id": str(uuid.uuid4()),
            "user_id": DEFAULT_USER,
            "session_id": session_id,
            "role": "user",
            "content": payload.text,
            "created_at": now_iso(),
        }
        await db.chat_messages.insert_one(user_doc.copy())

        # 3. Build dynamic prompt
        system_prompt = await build_buddy_system()

        # Build stable history — sanitized to prevent crash from orphaned messages
        stable_history = _sanitize_history(history_docs)

        models_to_try = get_dynamic_models(api_key)
        
        reply = None
        last_error = None
        for m_name in models_to_try:
            try:
                model = genai.GenerativeModel(
                    model_name=m_name,
                    system_instruction=system_prompt
                )
                chat = model.start_chat(history=stable_history)
                response = await chat.send_message_async(payload.text)
                reply = response.text
                break
            except Exception as e:
                last_error = str(e)
                logger.warning(f"Chat Model {m_name} failed: {e}")
                continue
                
        if not reply:
            raise Exception(f"All chat fallback models failed! Last error: {last_error}")

        ai_doc = {
            "id": str(uuid.uuid4()),
            "user_id": DEFAULT_USER,
            "session_id": session_id,
            "role": "assistant",
            "content": reply,
            "created_at": now_iso(),
        }
        await db.chat_messages.insert_one(ai_doc.copy())
        return {"reply": reply, "session_id": session_id}

    except Exception as e:
        error_detail = traceback.format_exc()
        logger.exception("AI chat failure detail")
        # CRITICAL FIX (Bug #13): Clean up the orphaned user message.
        # Without this, failed AI calls leave user messages in MongoDB that
        # pollute the 12-message history window over time, causing Blocky
        # to lose conversation context and give generic/useless replies.
        try:
            await db.chat_messages.delete_one({"id": user_doc["id"]})
            logger.info(f"Cleaned up orphaned user message {user_doc['id']}")
        except Exception:
            pass  # DB might be down too; don't mask the original error
        # Return 200 with error details to bypass Vercel's 500 override
        return {
            "error": True,
            "message": str(e),
            "traceback": error_detail,
            "hint": "Check Vercel Logs for 'ImportError' or 'Model not found'."
        }

@api_router.get("/ai/history")
async def ai_history(session_id: str = "default", limit: int = 50):
    docs = await db.chat_messages.find(
        {"user_id": DEFAULT_USER, "session_id": session_id}, {"_id": 0}
    ).sort("created_at", 1).to_list(limit)
    return docs


@api_router.post("/ai/linkedin-recap")
async def linkedin_recap():
    """Generate a LinkedIn post from the last 7 days of career log entries."""
    today = date.today()
    since = (today - timedelta(days=7)).isoformat()
    entries = await db.career.find(
        {"user_id": DEFAULT_USER, "date": {"$gte": since}}, {"_id": 0}
    ).sort("created_at", -1).to_list(50)
    if not entries:
        return {"post": "No wins logged this week yet! Go log a video edit, a client, or a program — then come back."}
    try:
        import google.generativeai as genai
        api_key = os.environ.get("GEMINI_API_KEY")
        if not api_key:
            raise RuntimeError("no key")
        genai.configure(api_key=api_key)
        summary = "\n".join([f"- [{e['type']}] {e['title']} ({e['date']}){' — ' + e['note'] if e.get('note') else ''}" for e in entries])
        
        system_msg = (
            "You are a LinkedIn caption writer for an ambitious 18-year-old JEE aspirant who codes, builds robots, "
            "edits videos, and books clients. Write posts that are authentic (not cringe), ~120-160 words, "
            "start with a hook, use short sentences, 2 emoji max, end with a soft CTA. Include 3-5 relevant hashtags. "
            "No em-dashes. No 'In today's fast-paced world' clichés. Write like a real Gen Z founder.\n"
            "IMPORTANT: Output ONLY the final post text. DO NOT output any internal thoughts, drafting, or planning process."
        )
        
        models_to_try = get_dynamic_models(api_key)
        
        reply = None
        last_error = None
        for m_name in models_to_try:
            try:
                model = genai.GenerativeModel(
                    model_name=m_name,
                    system_instruction=system_msg
                )
                response = await model.generate_content_async(
                    f"Write a LinkedIn post recapping this week's wins:\n{summary}\n\nTone: grateful but ambitious. Mention progress, not just wins."
                )
                reply = response.text
                break
            except Exception as e:
                last_error = str(e)
                continue
        if not reply:
            raise Exception(f"All models failed: {last_error}")
        
        return {"post": reply, "entries_used": len(entries)}
    except Exception as e:
        logger.exception("linkedin recap failure")
        return {"post": "🔥 This week I shipped:\n\n" + "\n".join([f"• {e['title']}" for e in entries[:6]]) + "\n\nMore coming. Building in public.\n\n#buildinpublic #jeeaspirant #robotics #contentcreator", "fallback": True, "error": str(e)}


@api_router.post("/ai/skin-analysis")
async def skin_analysis():
    """Analyze last 14 days of skin issue log + habit patterns and return insights."""
    today = date.today()
    date_list = [(today - timedelta(days=i)).isoformat() for i in range(14)]
    skin issue = await db.skin issue_log.find(
        {"user_id": DEFAULT_USER, "date": {"$in": date_list}}, {"_id": 0}
    ).sort("date", -1).to_list(100)
    habits = await db.habits.find(
        {"user_id": DEFAULT_USER, "date": {"$in": date_list}, "done": True}, {"_id": 0}
    ).to_list(500)
    if len(skin issue) < 3:
        return {"insight": "Log at least 3 skin issue entries (with food/rule details) so I can spot patterns. Right now I don't have enough data.", "ready": False}

    # Summarize data for the LLM
    skin issue_summary = "\n".join([
        f"- {a['date']}: severity {a['severity']}, no_sugar={a['no_sugar']}, no_oil={a['no_oil']}, meditation={a['meditation']}, note={a.get('note', '')[:120]}"
        for a in skin issue
    ])
    by_date = {}
    for h in habits:
        by_date.setdefault(h["date"], []).append(h["habit"])
    habit_summary = "\n".join([f"- {d}: {', '.join(hs)}" for d, hs in sorted(by_date.items(), reverse=True)])

    try:
        import google.generativeai as genai
        api_key = os.environ.get("GEMINI_API_KEY")
        if not api_key:
            raise RuntimeError("no key")
        genai.configure(api_key=api_key)

        system_msg = (
            "You are a skin-pattern analyst helping an 18-year-old with severe health condition. You receive 14 days of "
            "skin issue-severity logs + which rule-habits (no_sugar, no_oil, meditation) were followed. "
            "Find correlations: 'On days you broke the no_oil rule, severity averaged 4.2 vs 2.8 on clean days.' "
            "Give 3 concrete patterns (or honestly say 'no pattern yet — need more data') and 2 actionable nudges. "
            "NEVER diagnose. Remind them doctor visits matter. 140 words max, bullet points, punchy.\n"
            "IMPORTANT: Output ONLY the final insights text. DO NOT output any internal thoughts, drafting, or planning process."
        )
        models_to_try = get_dynamic_models(api_key)
        
        reply = None
        last_error = None
        for m_name in models_to_try:
            try:
                model = genai.GenerativeModel(
                    model_name=m_name,
                    system_instruction=system_msg
                )
                response = await model.generate_content_async(
                    f"Skin Issue log (14 days):\n{skin issue_summary}\n\nHabits completed by date:\n{habit_summary}\n\nWhat patterns do you see?"
                )
                reply = response.text
                break
            except Exception as e:
                last_error = str(e)
                continue
        if not reply:
            raise Exception(f"All models failed: {last_error}")
        return {"insight": reply, "ready": True, "days_analyzed": len(skin issue)}
    except Exception:
        logger.exception("skin analysis failure")
        avg_with_sugar = sum(a["severity"] for a in skin issue if not a["no_sugar"]) / max(1, sum(1 for a in skin issue if not a["no_sugar"]))
        avg_clean = sum(a["severity"] for a in skin issue if a["no_sugar"] and a["no_oil"]) / max(1, sum(1 for a in skin issue if a["no_sugar"] and a["no_oil"]))
        return {"insight": f"Quick correlation: avg severity when sugar was eaten = {avg_with_sugar:.1f}, when clean = {avg_clean:.1f}. Stay on the rules.", "ready": True, "fallback": True}


@api_router.get("/ai/tip")
async def ai_daily_tip(force: bool = False):
    """Return a quick cached daily tip. Generates once per day unless forced."""
    today = today_str()
    if db is None:
        return {"tip": "Database not connected. Check MONGO_URL.", "cached": False}
    
    if not force:
        existing = await db.daily_tip.find_one(
            {"user_id": DEFAULT_USER, "date": today},
            {"_id": 0},
            sort=[("created_at", -1)]
        )
        if existing:
            return {"tip": existing["tip"], "cached": True}
    
    try:
        import google.generativeai as genai
    except Exception:
        return {"tip": "Level up: start the day with 10 minutes of sunlight + 4-7-8 breathing. +30 XP vibe.", "cached": False}
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        return {"tip": "Drink water, stretch, breathe. Small XP now, massive level-ups later.", "cached": False}
    
    # Hardcoded fallback tips if AI completely fails
    FALLBACK_TIPS = [
        "Try 'Implementation Intentions' — instead of 'I'll study,' say 'If it's 5 PM, then I'll do Physics for 30 min.' This neuro-hack bypasses decision fatigue. Time to spawn progress! ⛏️",
        "Use the Pomodoro Technique: 25 min focused work, 5 min break. After 4 rounds, take a 15 min break. Your brain's dopamine system loves this rhythm. Level up your focus! 🎯",
        "Morning sunlight (10 min within 1hr of waking) sets your circadian clock, boosting cortisol at the right time and improving nighttime melatonin. Huberman-approved XP boost! ☀️",
        "Cold shower for 1-2 min increases norepinephrine by 200-300%. This sharpens focus for hours and reduces inflammation — great for health condition management. Brave the cold, warrior! 🧊",
        "Wim Hof breathing: 30 deep breaths, hold on exhale, repeat 3x. Reduces inflammation markers and boosts immune response. Your skin and focus will thank you. Breathe like a boss! 💨",
        "Time-block using 90-min Ultradian Rhythms — your brain naturally cycles focus every 90 min. Work WITH this cycle: 90 min deep work, 20 min recovery. Efficiency enchantment activated! ⚡",
        "Interleaving practice: mix Physics, Chemistry, and Maths in one session instead of blocking. Research shows 43% better retention. Shuffle your study deck like a pro! 🃏",
    ]
    
    try:
        import json, re
        # Gather user context for personalized tips
        prof = await ensure_profile()
        level_info = calc_level(prof.get("total_xp", 0))

        career_docs = await db.career.find({"user_id": DEFAULT_USER}).sort("date", -1).to_list(2)
        career_context = ", ".join([d["title"] for d in career_docs]) if career_docs else "No recent career logs"
        
        task_docs = await db.tasks.find({"user_id": DEFAULT_USER, "completed": True}).sort("completed_at", -1).to_list(2)
        task_context = ", ".join([d["title"] for d in task_docs]) if task_docs else "No recent tasks"
        
        skin issue_docs = await db.skin issue_log.find({"user_id": DEFAULT_USER}).sort("date", -1).to_list(1)
        skin issue_context = f"Severity {skin issue_docs[0].get('severity', '?')}, clean: {skin issue_docs[0].get('no_sugar', False) and skin issue_docs[0].get('no_oil', False)}" if skin issue_docs else "No recent health logs"
        
        genai.configure(api_key=api_key)
        
        # ── STRICT JSON-ONLY system instruction (no build_buddy_system()) ──
        # Using build_buddy_system() here caused reasoning models to expose their
        # internal chain-of-thought before producing the JSON. This minimal prompt
        # gives enough context while enforcing machine-readable output only.
        tip_system_prompt = (
            f"You are Blocky, a Minecraft-themed AI buddy for {prof.get('name', 'Player One')} "
            f"(18yo, Level {level_info['level']}, JEE aspirant, health condition, robotics/coding/content/career). "
            f"Status: {career_context} | {task_context} | {skin issue_context}.\n\n"
            "YOUR ONLY JOB: Output a single valid JSON object — nothing else.\n"
            "Schema: {\"tip\": \"...\"}\n"
            "Rules:\n"
            "- tip must be max 50 words\n"
            "- Blocky persona: Minecraft hype, concise, punchy\n"
            "- Do NOT mention NSDR\n"
            "- Focus on Health, Career, Focus, or Creativity\n"
            "- Use cutting-edge, researched techniques\n"
            "- Output ONLY the JSON object. Zero preamble, zero explanation, zero internal thoughts."
        )
        
        prompt = (
            "Generate ONE highly customized daily tip based on my status above.\n"
            "Output ONLY: {\"tip\": \"your tip here\"}"
        )
        
        models_to_try = get_dynamic_models(api_key)
        
        reply = None
        last_error = None
        for m_name in models_to_try:
            try:
                # DO NOT use response_mime_type — it is unreliable across models
                # in google-generativeai==0.8.3 and causes silent failures.
                model = genai.GenerativeModel(
                    model_name=m_name,
                    system_instruction=tip_system_prompt
                )
                response = await model.generate_content_async(prompt)
                raw = response.text.strip()
                logger.info(f"Tip raw response from {m_name}: {raw[:200]}")
                
                # ── Robust JSON extraction ──
                # Some reasoning models prepend chain-of-thought text before
                # the actual JSON. We extract the first {...} block containing
                # a "tip" key to guarantee we get the real answer.
                
                # Strategy 1: Try full parse first (ideal case — clean JSON)
                try:
                    data = json.loads(raw)
                    candidate = data.get("tip", "").strip()
                    if candidate and len(candidate) > 10:
                        reply = candidate
                        break
                except Exception:
                    pass
                
                # Strategy 2: Find JSON object with regex (handles leaked thinking)
                for match in re.finditer(r'\{[^{}]*"tip"[^{}]*\}', raw, re.DOTALL):
                    try:
                        data = json.loads(match.group())
                        candidate = data.get("tip", "").strip()
                        if candidate and len(candidate) > 10:
                            reply = candidate
                            break
                    except Exception:
                        continue
                if reply:
                    break
                
                # Strategy 3: Just extract any quoted string after "tip"
                tip_match = re.search(r'"tip"\s*:\s*"((?:[^"\\]|\\.)*)"', raw)
                if tip_match:
                    candidate = tip_match.group(1).strip()
                    if candidate and len(candidate) > 10:
                        reply = candidate
                        break
                    
            except Exception as e:
                last_error = str(e)
                logger.warning(f"Tip Model {m_name} failed: {e}")
                continue
                
        if not reply:
            # Use a deterministic fallback based on the day of year
            import hashlib
            day_hash = int(hashlib.md5(today.encode()).hexdigest(), 16)
            reply = FALLBACK_TIPS[day_hash % len(FALLBACK_TIPS)]
            logger.warning(f"All AI models failed for tip. Using fallback. Last error: {last_error}")
            
        # Store tip with unique ID — never delete old tips, build a history
        await db.daily_tip.insert_one({
            "id": str(uuid.uuid4()),
            "user_id": DEFAULT_USER,
            "date": today,
            "tip": reply,
            "created_at": now_iso()
        })
        return {"tip": reply, "cached": False}
    except Exception as e:
        logger.exception("daily tip failure")
        # Even on total crash, return a real tip — never return error text to UI
        import hashlib
        day_hash = int(hashlib.md5(today.encode()).hexdigest(), 16)
        fallback = FALLBACK_TIPS[day_hash % len(FALLBACK_TIPS)]
        return {"tip": fallback, "cached": False, "fallback": True}


@api_router.get("/ai/tips/history")
async def tips_history(limit: int = 30):
    """Return all past daily tips, newest first."""
    if db is None:
        return []
    docs = await db.daily_tip.find(
        {"user_id": DEFAULT_USER},
        {"_id": 0}
    ).sort("created_at", -1).to_list(limit)
    return docs


# ---- Routes: AI Morning Brief ----
@api_router.get("/ai/morning-brief")
async def morning_brief():
    """Generate a personalized morning technique + motivation brief via Gemini."""
    try:
        import google.generativeai as genai
        api_key = os.environ.get("GEMINI_API_KEY")
        if not api_key:
            raise RuntimeError("GEMINI_API_KEY not set")
        genai.configure(api_key=api_key)

        # Gather context
        prof = await ensure_profile()
        level_info = calc_level(prof.get("total_xp", 0))

        # Yesterday's goals
        yesterday = (date.today() - timedelta(days=1)).isoformat()
        yesterday_goals = await db.daily_goals.find_one(
            {"user_id": DEFAULT_USER, "date": yesterday}, {"_id": 0}
        )
        yesterday_context = ""
        if yesterday_goals:
            goals = []
            for k in ["study_goal", "work_goal", "health_goal", "creative_goal", "personal_goal"]:
                if yesterday_goals.get(k):
                    goals.append(f"- {k.replace('_goal','').title()}: {yesterday_goals[k]}")
            if goals:
                yesterday_context = f"\nYesterday's goals:\n" + "\n".join(goals)

        # Latest skin condition
        skin issue_docs = await db.skin issue_log.find({"user_id": DEFAULT_USER}, {"_id": 0}).sort("date", -1).to_list(1)
        skin issue_status = f"Severity {skin issue_docs[0].get('severity')} on {skin issue_docs[0].get('date')}" if skin issue_docs else "No recent logs"

        system_msg = (
            f"You are Blocky, a Minecraft-themed morning alarm assistant for {prof.get('name', 'Player One')}. "
            f"They are an 18-year-old JEE aspirant with health condition who codes, builds robots, and creates content.\n\n"
            f"Current Level: {level_info['level']} (XP: {prof.get('total_xp', 0)})\n"
            f"Streak: {prof.get('streak', 0)} days\n"
            f"Latest Skin: {skin issue_status}\n"
            f"{yesterday_context}\n\n"
            "Generate a morning brief with EXACTLY this structure (use these headers):\n"
            "🌅 GOOD MORNING\n"
            "- A personalized 1-line greeting mentioning their name and streak\n\n"
            "🧠 TODAY'S TECHNIQUE\n"
            "- ONE specific, actionable technique from neuroscience, Huberman, Wim Hof, or productivity research\n"
            "- Include HOW to do it (exact steps) and WHY it works (1 sentence of science)\n"
            "- Relate it to their life: JEE prep, health condition management, or coding focus\n\n"
            "💪 HEALTH REMINDER\n"
            "- A specific reminder about their health condition rules (no sugar, no oil, meds)\n"
            "- Or a Wim Hof/cold shower/sunlight nudge\n\n"
            "⚔️ BATTLE CRY\n"
            "- A 1-line Minecraft-themed motivational push to start the day\n\n"
            "Keep it under 150 words total. Be punchy, specific, and hype. No fluff.\n"
            "IMPORTANT: Output ONLY the final brief text. DO NOT output any internal thoughts, drafting, or planning process."
        )

        models_to_try = get_dynamic_models(api_key)
        
        reply = None
        last_error = None
        for m_name in models_to_try:
            try:
                model = genai.GenerativeModel(
                    model_name=m_name,
                    system_instruction=system_msg
                )
                response = await model.generate_content_async(
                    f"Generate this morning's brief for {prof.get('name', 'Player One')}. Today is {today_str()}. "
                    "Make the technique unique — not the same as yesterday."
                )
                reply = response.text
                break
            except Exception as e:
                last_error = str(e)
                continue
        if not reply:
            raise Exception(f"All models failed: {last_error}")
        return {"brief": reply, "generated": True}
    except Exception as e:
        logger.exception("morning brief failure")
        return {
            "brief": (
                "🌅 GOOD MORNING\nRise and shine, legend! A new day means new XP to earn.\n\n"
                "🧠 TODAY'S TECHNIQUE\nTry the 4-7-8 breathing: Inhale 4s, hold 7s, exhale 8s. "
                "Activates the parasympathetic nervous system, reducing cortisol and sharpening focus for JEE problems.\n\n"
                "💪 HEALTH REMINDER\nNo sugar, no oil today. Your health condition skin will thank you. "
                "Take your meds with breakfast.\n\n"
                "⚔️ BATTLE CRY\nYou're not just surviving — you're speedrunning life. Let's go! ⛏️"
            ),
            "generated": False,
            "error": str(e)
        }


# ---- Routes: Settings ----
class SettingsUpdate(BaseModel):
    meal_times: Optional[List[str]] = None  # e.g. ["08:00","13:00","19:00"]
    notifications_enabled: Optional[bool] = None
    med_reminder_enabled: Optional[bool] = None
    buddy_persona: Optional[str] = None  # custom system prompt snippet
    custom_habits: Optional[List[dict]] = None  # [{key, label, xp}]
    xp_per_level: Optional[int] = None
    alarm_time: Optional[str] = None  # "HH:MM" in IST, default "06:00"
    alarm_enabled: Optional[bool] = None


@api_router.get("/settings")
async def get_settings():
    """Return all user settings. Creates defaults if none exist."""
    # FIX (Bug #14): Guard against db=None to prevent raw 500 on /api/settings
    # when the MongoDB connection fails. Returns safe defaults instead.
    default_settings = {
        "user_id": DEFAULT_USER,
        "meal_times": ["08:00", "13:00", "19:00"],
        "notifications_enabled": True,
        "med_reminder_enabled": True,
        "buddy_persona": "",
        "custom_habits": None,
        "xp_per_level": 500,
        "alarm_time": "06:00",
        "alarm_enabled": False,
    }
    if db is None:
        logger.warning("get_settings() called with db=None — returning defaults")
        return default_settings
    settings = await db.settings.find_one({"user_id": DEFAULT_USER}, {"_id": 0})
    if not settings:
        settings = default_settings.copy()
        await db.settings.insert_one(settings.copy())
    return settings


@api_router.patch("/settings")
async def update_settings(payload: SettingsUpdate):
    fields = {k: v for k, v in payload.model_dump().items() if v is not None}
    if not fields:
        return await get_settings()
    # Validate custom_habits if provided
    if "custom_habits" in fields:
        for h in fields["custom_habits"]:
            if not h.get("key") or not h.get("label"):
                raise HTTPException(400, "Each custom habit needs a 'key' and 'label'")
            h.setdefault("xp", 20)
    fields["updated_at"] = now_iso()
    await db.settings.update_one(
        {"user_id": DEFAULT_USER},
        {"$set": {**fields, "user_id": DEFAULT_USER}},
        upsert=True,
    )
    return await get_settings()


# ---- Routes: Data Management ----
class DataResetRequest(BaseModel):
    collection: str  # tasks, habits, pomodoro, skin issue_log, meditation, career, chat_messages, meds, meds_taken, distractions, ideas_log, jee_progress, daily_tip


@api_router.post("/data/reset")
async def reset_data(payload: DataResetRequest):
    """Delete all documents for a specific collection for this user."""
    allowed = [
        "tasks", "habits", "pomodoro", "skin issue_log", "meditation", "career",
        "chat_messages", "meds", "meds_taken", "distractions", "ideas_log",
        "jee_progress", "daily_tip", "daily_goals",
    ]
    if payload.collection not in allowed:
        raise HTTPException(400, f"Invalid collection. Allowed: {', '.join(allowed)}")
    result = await db[payload.collection].delete_many({"user_id": DEFAULT_USER})
    return {"ok": True, "deleted": result.deleted_count, "collection": payload.collection}


@api_router.post("/data/reset-all")
async def reset_all_data():
    """Nuclear option — wipe ALL user data and recreate a fresh profile."""
    collections = [
        "tasks", "habits", "pomodoro", "skin issue_log", "meditation", "career",
        "chat_messages", "meds", "meds_taken", "distractions", "ideas_log",
        "jee_progress", "daily_tip", "daily_goals", "settings",
    ]
    total = 0
    for coll in collections:
        r = await db[coll].delete_many({"user_id": DEFAULT_USER})
        total += r.deleted_count
    # Reset profile to defaults
    await db.profile.delete_many({"user_id": DEFAULT_USER})
    await ensure_profile()
    return {"ok": True, "total_deleted": total}


@api_router.get("/data/export")
async def export_data():
    """Export all user data as JSON for backup."""
    collections = [
        "profile", "tasks", "habits", "pomodoro", "skin issue_log", "meditation",
        "career", "meds", "meds_taken", "distractions", "ideas_log",
        "jee_progress", "daily_goals", "settings",
    ]
    export = {}
    for coll in collections:
        docs = await db[coll].find({"user_id": DEFAULT_USER}, {"_id": 0}).to_list(5000)
        export[coll] = docs
    return export

# ---- Secure Journal Routes ----
class JournalAuth(BaseModel):
    password: str

@api_router.post("/journal/auth")
async def journal_auth(data: JournalAuth):
    if data.password != "SECRET_CODE":
        raise HTTPException(status_code=401, detail="Invalid password")
    # Return a simple deterministic token for this user
    return {"token": "minehealth_secure_vault_1337"}

from fastapi import Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
security = HTTPBearer()

def verify_journal_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    if credentials.credentials != "minehealth_secure_vault_1337":
        raise HTTPException(status_code=401, detail="Invalid token")

class JournalEntry(BaseModel):
    type: str
    content: str
    notes: Optional[str] = ""

@api_router.get("/journal/entries", dependencies=[Depends(verify_journal_token)])
async def get_journal_entries():
    if db is None:
        return []
    docs = await db.journal.find({"user_id": DEFAULT_USER}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return docs

@api_router.post("/journal/entries", dependencies=[Depends(verify_journal_token)])
async def add_journal_entry(entry: JournalEntry):
    if db is None:
        return {"error": "DB missing"}
    doc = {
        "id": str(uuid.uuid4()),
        "user_id": DEFAULT_USER,
        "type": entry.type,
        "content": entry.content,
        "notes": entry.notes,
        "created_at": now_iso()
    }
    await db.journal.insert_one(doc)
    return {"status": "ok"}

@api_router.delete("/journal/entries/{entry_id}", dependencies=[Depends(verify_journal_token)])
async def delete_journal_entry(entry_id: str):
    if db is None:
        return {"error": "DB missing"}
    await db.journal.delete_one({"user_id": DEFAULT_USER, "id": entry_id})
    return {"status": "ok"}


# Mount router
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)
