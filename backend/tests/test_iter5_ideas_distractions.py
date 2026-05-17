"""Iter 5 backend tests — ideas journal + distraction tracker + regression spot-check."""
import os
import pytest
import requests
from pymongo import MongoClient
from datetime import date

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://minecraft-mentor.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "test_database")


@pytest.fixture(scope="session")
def mongo():
    cli = MongoClient(MONGO_URL)
    yield cli[DB_NAME]
    cli.close()


@pytest.fixture(scope="session")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="module", autouse=True)
def cleanup_today(mongo):
    """Wipe today's ideas + distractions for player_one before & after the module."""
    today = date.today().isoformat()
    mongo.ideas_log.delete_many({"user_id": "player_one", "date": today})
    mongo.distractions.delete_many({"user_id": "player_one", "date": today})
    yield
    mongo.ideas_log.delete_many({"user_id": "player_one", "date": today})
    mongo.distractions.delete_many({"user_id": "player_one", "date": today})


def _xp(session):
    r = session.get(f"{API}/profile")
    assert r.status_code == 200, r.text
    return r.json()["total_xp"]


# ---- Ideas Journal ----
class TestIdeasJournal:
    def test_post_lt3_returns_400(self, session):
        r = session.post(f"{API}/ideas/day", json={"ideas": ["one", "two", "  "]})
        assert r.status_code == 400, r.text
        body = r.json()
        assert body.get("detail") == "Need at least 3 ideas. You provided 2."

    def test_post_empty_returns_400(self, session):
        r = session.post(f"{API}/ideas/day", json={"ideas": []})
        assert r.status_code == 400
        assert r.json().get("detail") == "Need at least 3 ideas. You provided 0."

    def test_first_save_awards_30_xp_and_get_today(self, session):
        before = _xp(session)
        ideas = ["TEST_iter5 build robot arm", "TEST_iter5 read kinematics", "TEST_iter5 edit reel"]
        r = session.post(f"{API}/ideas/day", json={"ideas": ideas})
        assert r.status_code == 200, r.text
        body = r.json()
        assert body == {"ok": True, "count": 3, "xp_awarded": 30}
        after = _xp(session)
        assert after - before == 30, f"Expected +30 XP, got {after - before}"

        # Verify GET /ideas/today
        r2 = session.get(f"{API}/ideas/today")
        assert r2.status_code == 200
        td = r2.json()
        assert td["date"] == date.today().isoformat()
        assert td["ideas"] == ideas
        assert "id" in td

    def test_second_save_same_day_no_xp(self, session):
        before = _xp(session)
        ideas = ["TEST_iter5 v2 a", "TEST_iter5 v2 b", "TEST_iter5 v2 c", "TEST_iter5 v2 d"]
        r = session.post(f"{API}/ideas/day", json={"ideas": ideas})
        assert r.status_code == 200
        body = r.json()
        assert body["ok"] is True
        assert body["count"] == 4
        assert body["xp_awarded"] == 0, "Same-day update must NOT re-award XP"
        after = _xp(session)
        assert after == before, f"XP changed on update: before={before}, after={after}"

        # Verify GET reflects update
        r2 = session.get(f"{API}/ideas/today")
        assert r2.json()["ideas"] == ideas

    def test_recent_returns_today(self, session):
        r = session.get(f"{API}/ideas/recent")
        assert r.status_code == 200
        items = r.json()
        assert isinstance(items, list)
        assert len(items) >= 1
        # Sorted desc by date
        dates = [it["date"] for it in items]
        assert dates == sorted(dates, reverse=True)
        # Today should be first and contain our ideas
        today = date.today().isoformat()
        assert items[0]["date"] == today
        assert items[0]["ideas"][0].startswith("TEST_iter5 v2")


# ---- Distractions ----
class TestDistractions:
    created_ids = []

    def test_log_distraction_10min_minus20_xp(self, session):
        before = _xp(session)
        r = session.post(f"{API}/distractions", json={"source": "Instagram", "duration_mins": 10, "note": "TEST_iter5 reels"})
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["xp_penalty"] == -20
        assert body["source"] == "instagram"  # lowercased
        assert body["duration_mins"] == 10
        assert body["note"] == "TEST_iter5 reels"
        assert body["date"] == date.today().isoformat()
        assert "id" in body
        TestDistractions.created_ids.append(body["id"])
        after = _xp(session)
        assert after - before == -20, f"Expected -20 XP, got {after - before}"

    def test_log_distraction_35min_capped_minus60(self, session):
        before = _xp(session)
        r = session.post(f"{API}/distractions", json={"source": "youtube", "duration_mins": 35, "note": "TEST_iter5 yt"})
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["xp_penalty"] == -60, f"Cap at -60 expected, got {body['xp_penalty']}"
        TestDistractions.created_ids.append(body["id"])
        after = _xp(session)
        assert after - before == -60

    def test_log_distraction_invalid_duration(self, session):
        r = session.post(f"{API}/distractions", json={"source": "phone", "duration_mins": 0})
        assert r.status_code == 422
        r2 = session.post(f"{API}/distractions", json={"source": "phone", "duration_mins": 1000})
        assert r2.status_code == 422

    def test_distractions_today(self, session):
        r = session.get(f"{API}/distractions/today")
        assert r.status_code == 200
        body = r.json()
        assert body["date"] == date.today().isoformat()
        assert body["total_minutes"] == 45  # 10 + 35
        assert body["by_source"]["instagram"] == 10
        assert body["by_source"]["youtube"] == 35
        # entries sorted desc by created_at — most recent first
        assert len(body["entries"]) == 2
        assert all("_id" not in e for e in body["entries"])

    def test_distractions_stats(self, session):
        r = session.get(f"{API}/distractions/stats")
        assert r.status_code == 200
        body = r.json()
        assert "chart" in body and isinstance(body["chart"], list)
        assert len(body["chart"]) == 7
        assert body["total"] == 45
        # Today bucket should have 45 minutes
        today = date.today().isoformat()
        today_entry = next((c for c in body["chart"] if c["date"] == today), None)
        assert today_entry is not None
        assert today_entry["minutes"] == 45

    def test_delete_distraction(self, session):
        assert TestDistractions.created_ids, "previous tests should have created entries"
        eid = TestDistractions.created_ids[0]
        before = _xp(session)
        r = session.delete(f"{API}/distractions/{eid}")
        assert r.status_code == 200
        assert r.json() == {"ok": True}
        # Note: deletion does NOT refund XP — confirm XP unchanged
        after = _xp(session)
        assert after == before, "Delete should not refund XP"
        # Verify removal
        r2 = session.get(f"{API}/distractions/today")
        ids_now = [e["id"] for e in r2.json()["entries"]]
        assert eid not in ids_now


# ---- Regression spot-check ----
class TestRegression:
    def test_profile(self, session):
        r = session.get(f"{API}/profile")
        assert r.status_code == 200
        body = r.json()
        for k in ("user_id", "total_xp", "level", "xp_in_level", "xp_for_next"):
            assert k in body

    def test_dashboard_summary(self, session):
        r = session.get(f"{API}/dashboard/summary")
        assert r.status_code == 200
        body = r.json()
        assert "profile" in body and "tasks" in body
        assert "pomodoro_mins_today" in body

    def test_tasks_crud_and_toggle(self, session):
        # Create
        r = session.post(f"{API}/tasks", json={"title": "TEST_iter5 regression task", "category": "study", "xp": 25})
        assert r.status_code == 200, r.text
        task = r.json()
        tid = task["id"]
        assert task["title"] == "TEST_iter5 regression task"
        assert task["xp"] == 25
        assert task["completed"] is False

        # List shows it
        r2 = session.get(f"{API}/tasks")
        assert r2.status_code == 200
        assert any(t["id"] == tid for t in r2.json())

        # Toggle complete
        before = _xp(session)
        r3 = session.patch(f"{API}/tasks/{tid}/toggle")
        assert r3.status_code == 200
        body = r3.json()
        assert body["completed"] is True
        assert body["xp_awarded"] == 25
        after = _xp(session)
        assert after - before == 25

        # Toggle back (uncomplete) refunds
        r4 = session.patch(f"{API}/tasks/{tid}/toggle")
        assert r4.status_code == 200
        assert r4.json()["completed"] is False

        # Delete
        r5 = session.delete(f"{API}/tasks/{tid}")
        assert r5.status_code == 200
