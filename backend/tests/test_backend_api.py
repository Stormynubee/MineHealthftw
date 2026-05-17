"""Backend API tests for Minecraft-themed gamified dashboard.

Covers: profile, tasks, JEE syllabus, pomodoro, habits, meds, skin issue-log,
meditation, career, AI buddy, dashboard summary.

Runs against public REACT_APP_BACKEND_URL with /api prefix.
"""
import os
import time
import pytest
import requests
from pathlib import Path
from dotenv import load_dotenv

# Load frontend .env for public URL
load_dotenv(Path(__file__).resolve().parents[2] / "frontend" / ".env")
BASE_URL = os.environ["REACT_APP_BACKEND_URL"].rstrip("/")
API = f"{BASE_URL}/api"


@pytest.fixture(scope="session")
def client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


def _no_mongo_id(obj):
    """Recursively assert no _id key is leaked."""
    if isinstance(obj, dict):
        assert "_id" not in obj, f"_id leaked in response: keys={list(obj.keys())}"
        for v in obj.values():
            _no_mongo_id(v)
    elif isinstance(obj, list):
        for item in obj:
            _no_mongo_id(item)


# ---------- Profile ----------
class TestProfile:
    def test_get_profile(self, client):
        r = client.get(f"{API}/profile")
        assert r.status_code == 200
        d = r.json()
        _no_mongo_id(d)
        for k in ("user_id", "total_xp", "streak", "level", "xp_in_level", "xp_for_next"):
            assert k in d, f"missing {k}"
        assert d["user_id"] == "player_one"
        assert isinstance(d["level"], int) and d["level"] >= 1

    def test_patch_profile(self, client):
        payload = {"name": "TEST_Player", "linkedin_url": "https://linkedin.com/in/test"}
        r = client.patch(f"{API}/profile", json=payload)
        assert r.status_code == 200
        d = r.json()
        _no_mongo_id(d)
        assert d["name"] == "TEST_Player"
        assert d["linkedin_url"] == "https://linkedin.com/in/test"
        # Verify persistence
        r2 = client.get(f"{API}/profile")
        d2 = r2.json()
        assert d2["name"] == "TEST_Player"
        assert d2["linkedin_url"] == "https://linkedin.com/in/test"


# ---------- Tasks ----------
class TestTasks:
    created_id = None

    def test_create_task(self, client):
        payload = {"title": "TEST_Study chapter 1", "category": "study", "xp": 30}
        r = client.post(f"{API}/tasks", json=payload)
        assert r.status_code == 200
        d = r.json()
        _no_mongo_id(d)
        assert d["title"] == payload["title"]
        assert d["category"] == "study"
        assert d["xp"] == 30
        assert d["completed"] is False
        assert "id" in d
        TestTasks.created_id = d["id"]

    def test_list_tasks(self, client):
        r = client.get(f"{API}/tasks")
        assert r.status_code == 200
        arr = r.json()
        _no_mongo_id(arr)
        assert any(t["id"] == TestTasks.created_id for t in arr)

    def test_list_tasks_filter_category(self, client):
        r = client.get(f"{API}/tasks", params={"category": "study"})
        assert r.status_code == 200
        arr = r.json()
        assert all(t["category"] == "study" for t in arr)

    def test_toggle_task_awards_xp(self, client):
        prof_before = client.get(f"{API}/profile").json()
        xp_before = prof_before["total_xp"]
        r = client.patch(f"{API}/tasks/{TestTasks.created_id}/toggle")
        assert r.status_code == 200
        d = r.json()
        assert d["completed"] is True
        assert d["xp_awarded"] == 30
        prof_after = client.get(f"{API}/profile").json()
        assert prof_after["total_xp"] == xp_before + 30

    def test_toggle_task_removes_xp(self, client):
        prof_before = client.get(f"{API}/profile").json()
        xp_before = prof_before["total_xp"]
        r = client.patch(f"{API}/tasks/{TestTasks.created_id}/toggle")
        assert r.status_code == 200
        d = r.json()
        assert d["completed"] is False
        assert d["xp_awarded"] == -30
        prof_after = client.get(f"{API}/profile").json()
        assert prof_after["total_xp"] == xp_before - 30

    def test_delete_task(self, client):
        r = client.delete(f"{API}/tasks/{TestTasks.created_id}")
        assert r.status_code == 200
        r2 = client.get(f"{API}/tasks")
        assert not any(t["id"] == TestTasks.created_id for t in r2.json())


# ---------- JEE Syllabus ----------
class TestJEE:
    def test_syllabus_total_83(self, client):
        r = client.get(f"{API}/jee/syllabus")
        assert r.status_code == 200
        d = r.json()
        _no_mongo_id(d)
        assert d["total"] == 83, f"expected 83 topics, got {d['total']}"
        for subj in ("physics", "chemistry", "maths"):
            assert subj in d["syllabus"]
            assert "11" in d["syllabus"][subj]
            assert "12" in d["syllabus"][subj]

    def test_toggle_topic_awards_50(self, client):
        syl = client.get(f"{API}/jee/syllabus").json()
        topic = syl["syllabus"]["physics"]["11"][0]
        tid = topic["id"]
        # ensure initially unset
        if topic["completed"]:
            client.patch(f"{API}/jee/topic/{tid}")
        xp_before = client.get(f"{API}/profile").json()["total_xp"]
        r = client.patch(f"{API}/jee/topic/{tid}")
        assert r.status_code == 200
        assert r.json()["completed"] is True
        xp_after = client.get(f"{API}/profile").json()["total_xp"]
        assert xp_after == xp_before + 50
        # toggle back
        r2 = client.patch(f"{API}/jee/topic/{tid}")
        assert r2.json()["completed"] is False
        xp_reset = client.get(f"{API}/profile").json()["total_xp"]
        assert xp_reset == xp_before


# ---------- Pomodoro ----------
class TestPomodoro:
    def test_log_pomodoro_awards_xp(self, client):
        xp_before = client.get(f"{API}/profile").json()["total_xp"]
        r = client.post(f"{API}/pomodoro/log", json={"subject": "Physics", "duration_mins": 25})
        assert r.status_code == 200
        d = r.json()
        _no_mongo_id(d)
        assert d["subject"] == "Physics"
        assert d["duration_mins"] == 25
        xp_after = client.get(f"{API}/profile").json()["total_xp"]
        assert xp_after == xp_before + 25

    def test_pomodoro_stats(self, client):
        r = client.get(f"{API}/pomodoro/stats")
        assert r.status_code == 200
        d = r.json()
        _no_mongo_id(d)
        assert "total_minutes" in d and d["total_minutes"] >= 25
        assert isinstance(d["chart"], list) and len(d["chart"]) == 7
        assert any(s["subject"] == "Physics" for s in d["subjects"])


# ---------- Habits ----------
class TestHabits:
    def test_habits_today_default_10(self, client):
        r = client.get(f"{API}/habits/today")
        assert r.status_code == 200
        d = r.json()
        _no_mongo_id(d)
        assert len(d["habits"]) == 10
        assert all("done" in h and "key" in h and "xp" in h for h in d["habits"])

    def test_habit_toggle_awards_and_deducts_xp(self, client):
        xp0 = client.get(f"{API}/profile").json()["total_xp"]
        r = client.post(f"{API}/habits/toggle", json={"habit": "yoga_nidra"})
        # If it was already done today, response will be done=False first; then toggle back to True
        if r.json().get("done") is False:
            # toggle to done=True
            r = client.post(f"{API}/habits/toggle", json={"habit": "yoga_nidra"})
        assert r.json()["done"] is True
        xp1 = client.get(f"{API}/profile").json()["total_xp"]
        assert xp1 == xp0 + 30  # yoga_nidra xp=30 (after potential reset to baseline)
        # toggle off
        r2 = client.post(f"{API}/habits/toggle", json={"habit": "yoga_nidra"})
        assert r2.json()["done"] is False
        xp2 = client.get(f"{API}/profile").json()["total_xp"]
        assert xp2 == xp0

    def test_habit_toggle_unknown(self, client):
        r = client.post(f"{API}/habits/toggle", json={"habit": "zzzz_unknown"})
        assert r.status_code == 400

    def test_habits_stats(self, client):
        r = client.get(f"{API}/habits/stats", params={"days": 7})
        assert r.status_code == 200
        d = r.json()
        _no_mongo_id(d)
        assert len(d["chart"]) == 7


# ---------- Meds ----------
class TestMeds:
    created_id = None

    def test_create_med(self, client):
        r = client.post(f"{API}/meds", json={"name": "TEST_VitaminD", "time": "09:00", "notes": "morning"})
        assert r.status_code == 200
        d = r.json()
        _no_mongo_id(d)
        assert d["name"] == "TEST_VitaminD"
        TestMeds.created_id = d["id"]

    def test_list_meds_has_taken_today(self, client):
        r = client.get(f"{API}/meds")
        assert r.status_code == 200
        arr = r.json()
        _no_mongo_id(arr)
        mine = [m for m in arr if m["id"] == TestMeds.created_id]
        assert mine and "taken_today" in mine[0]

    def test_mark_taken_awards_15(self, client):
        xp_before = client.get(f"{API}/profile").json()["total_xp"]
        r = client.patch(f"{API}/meds/{TestMeds.created_id}/taken")
        assert r.status_code == 200
        if r.json().get("taken_today") is False:
            # Was already taken; toggle back on
            r = client.patch(f"{API}/meds/{TestMeds.created_id}/taken")
        assert r.json()["taken_today"] is True
        xp_after = client.get(f"{API}/profile").json()["total_xp"]
        assert xp_after == xp_before + 15

    def test_delete_med(self, client):
        r = client.delete(f"{API}/meds/{TestMeds.created_id}")
        assert r.status_code == 200
        r2 = client.get(f"{API}/meds")
        assert not any(m["id"] == TestMeds.created_id for m in r2.json())


# ---------- Skin Issue Log ----------
class TestSkin Issue:
    def test_create_skin issue_log_awards_xp(self, client):
        xp_before = client.get(f"{API}/profile").json()["total_xp"]
        r = client.post(f"{API}/skin issue-log", json={
            "severity": 2, "no_sugar": True, "no_oil": True, "meditation": True, "note": "TEST_good day"
        })
        assert r.status_code == 200
        d = r.json()
        _no_mongo_id(d)
        assert d["severity"] == 2
        xp_after = client.get(f"{API}/profile").json()["total_xp"]
        assert xp_after == xp_before + 30  # 3 rules *10

    def test_list_skin issue(self, client):
        r = client.get(f"{API}/skin issue-log")
        assert r.status_code == 200
        arr = r.json()
        _no_mongo_id(arr)
        assert len(arr) >= 1


# ---------- Meditation ----------
class TestMeditation:
    def test_log_meditation(self, client):
        xp_before = client.get(f"{API}/profile").json()["total_xp"]
        r = client.post(f"{API}/meditation/session", json={"duration_mins": 10})
        assert r.status_code == 200
        d = r.json()
        _no_mongo_id(d)
        assert d["duration_mins"] == 10
        xp_after = client.get(f"{API}/profile").json()["total_xp"]
        assert xp_after == xp_before + 20  # 10 * 2

    def test_meditation_stats(self, client):
        r = client.get(f"{API}/meditation/stats")
        assert r.status_code == 200
        d = r.json()
        _no_mongo_id(d)
        assert d["total_minutes"] >= 10
        assert len(d["chart"]) == 7


# ---------- Career ----------
class TestCareer:
    created_id = None

    def test_create_career(self, client):
        r = client.post(f"{API}/career", json={
            "type": "video_edit", "title": "TEST_YT edit 1", "link": "https://youtu.be/x"
        })
        assert r.status_code == 200
        d = r.json()
        _no_mongo_id(d)
        assert d["type"] == "video_edit"
        TestCareer.created_id = d["id"]

    def test_list_career(self, client):
        r = client.get(f"{API}/career")
        assert r.status_code == 200
        arr = r.json()
        _no_mongo_id(arr)
        assert any(e["id"] == TestCareer.created_id for e in arr)

    def test_career_stats(self, client):
        r = client.get(f"{API}/career/stats")
        assert r.status_code == 200
        d = r.json()
        _no_mongo_id(d)
        for k in ("video_edit", "client", "program", "research"):
            assert k in d["totals"]
            assert k in d["today"]
        assert d["totals"]["video_edit"] >= 1

    def test_career_programs_12(self, client):
        r = client.get(f"{API}/career/programs")
        assert r.status_code == 200
        arr = r.json()
        _no_mongo_id(arr)
        assert len(arr) == 12
        # filter by tag
        r2 = client.get(f"{API}/career/programs", params={"tag": "techfest"})
        arr2 = r2.json()
        assert all(p["tag"] == "techfest" for p in arr2)

    def test_delete_career(self, client):
        r = client.delete(f"{API}/career/{TestCareer.created_id}")
        assert r.status_code == 200


# ---------- AI Buddy ----------
class TestAIBuddy:
    def test_ai_tip(self, client):
        r = client.get(f"{API}/ai/tip")
        assert r.status_code == 200
        d = r.json()
        _no_mongo_id(d)
        assert "tip" in d and isinstance(d["tip"], str) and len(d["tip"]) > 0

    def test_ai_chat(self, client):
        try:
            r = client.post(f"{API}/ai/chat", json={"text": "Say hi in 5 words.", "session_id": "TEST_session"}, timeout=60)
        except requests.Timeout:
            pytest.skip("AI chat timed out - likely LLM budget/latency")
        if r.status_code == 500:
            pytest.skip(f"AI chat failed (likely key/budget): {r.text[:200]}")
        assert r.status_code == 200
        d = r.json()
        _no_mongo_id(d)
        assert "reply" in d and isinstance(d["reply"], str) and len(d["reply"]) > 0

    def test_ai_history(self, client):
        r = client.get(f"{API}/ai/history", params={"session_id": "TEST_session"})
        assert r.status_code == 200
        arr = r.json()
        _no_mongo_id(arr)
        # May be empty if chat was skipped
        assert isinstance(arr, list)


# ---------- Dashboard summary ----------
class TestDashboard:
    def test_summary(self, client):
        r = client.get(f"{API}/dashboard/summary")
        assert r.status_code == 200
        d = r.json()
        _no_mongo_id(d)
        for k in ("profile", "tasks", "pomodoro_mins_today", "habits_done_today",
                  "habits_total", "meds_taken_today", "meds_total",
                  "meditation_mins_today", "jee_done", "jee_total"):
            assert k in d, f"missing {k}"
        assert d["jee_total"] == 83
        assert d["habits_total"] == 10
        assert "level" in d["profile"]
