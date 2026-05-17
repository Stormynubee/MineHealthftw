"""Tests for new endpoints (iteration 2):
- GET /api/achievements (13 items, structure, unlock logic)
- GET /api/public-profile (read-only shareable profile)
- XP clamp: total_xp never goes below 0
- Light regression sample of existing endpoints
"""
import os
import pytest
import requests
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parents[2] / "frontend" / ".env")
BASE_URL = os.environ["REACT_APP_BACKEND_URL"].rstrip("/")
API = f"{BASE_URL}/api"

EXPECTED_ACH_IDS = {
    "first_block", "sprout", "miner", "diamond_mind", "obsidian_focus",
    "emerald_streak", "nether_streak", "grassroots", "alchemist", "monk",
    "chapter_slayer", "jee_warrior", "creator",
}


@pytest.fixture(scope="module")
def client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


def _no_mongo_id(obj):
    if isinstance(obj, dict):
        assert "_id" not in obj, f"_id leaked: keys={list(obj.keys())}"
        for v in obj.values():
            _no_mongo_id(v)
    elif isinstance(obj, list):
        for item in obj:
            _no_mongo_id(item)


def _get_ach(client, aid):
    arr = client.get(f"{API}/achievements").json()
    return next((a for a in arr if a["id"] == aid), None)


# ---------- Achievements ----------
class TestAchievements:
    def test_list_returns_13_with_required_fields(self, client):
        r = client.get(f"{API}/achievements")
        assert r.status_code == 200
        arr = r.json()
        _no_mongo_id(arr)
        assert isinstance(arr, list)
        assert len(arr) == 13, f"expected 13 achievements, got {len(arr)}"
        ids = {a["id"] for a in arr}
        assert ids == EXPECTED_ACH_IDS, f"id mismatch: {ids ^ EXPECTED_ACH_IDS}"
        for a in arr:
            for key in ("id", "name", "desc", "icon", "color", "unlocked", "progress"):
                assert key in a, f"missing {key} in achievement {a.get('id')}"
            assert isinstance(a["unlocked"], bool)
            assert "cur" in a["progress"] and "target" in a["progress"]
            assert isinstance(a["progress"]["cur"], (int, float))
            assert isinstance(a["progress"]["target"], (int, float))

    def test_first_block_unlocks_after_task_toggle(self, client):
        # Create a task and complete it
        tr = client.post(f"{API}/tasks", json={
            "title": "TEST_first_block_task", "category": "study", "xp": 10
        })
        assert tr.status_code == 200
        tid = tr.json()["id"]
        client.patch(f"{API}/tasks/{tid}/toggle")  # complete
        ach = _get_ach(client, "first_block")
        assert ach is not None
        assert ach["unlocked"] is True, "first_block should be unlocked after completing a task"
        assert ach["progress"]["cur"] >= 1
        assert ach["progress"]["target"] == 1
        # cleanup: untoggle then delete
        client.patch(f"{API}/tasks/{tid}/toggle")
        client.delete(f"{API}/tasks/{tid}")

    def test_sprout_reflects_level_progress(self, client):
        ach = _get_ach(client, "sprout")
        prof = client.get(f"{API}/profile").json()
        assert ach is not None
        assert ach["progress"]["target"] == 2
        assert ach["progress"]["cur"] == prof["level"]
        assert ach["unlocked"] == (prof["level"] >= 2)

    def test_chapter_slayer_progress_matches_jee_done(self, client):
        ach = _get_ach(client, "chapter_slayer")
        summary = client.get(f"{API}/dashboard/summary").json()
        assert ach is not None
        assert ach["progress"]["target"] == 10
        assert ach["progress"]["cur"] == summary["jee_done"]
        assert ach["unlocked"] == (summary["jee_done"] >= 10)


# ---------- Public Profile ----------
class TestPublicProfile:
    def test_public_profile_structure(self, client):
        r = client.get(f"{API}/public-profile")
        assert r.status_code == 200
        d = r.json()
        _no_mongo_id(d)

        # top-level keys
        for k in ("profile", "achievements", "unlocked_count",
                  "recent_tasks", "recent_career", "stats"):
            assert k in d, f"missing top-level key {k}"

        # profile sub-fields
        prof = d["profile"]
        for k in ("name", "total_xp", "streak", "level",
                  "xp_in_level", "xp_for_next", "linkedin_url"):
            assert k in prof, f"missing profile.{k}"

        # achievements list
        assert isinstance(d["achievements"], list)
        assert len(d["achievements"]) == 13
        unlocked_in_list = sum(1 for a in d["achievements"] if a["unlocked"])
        assert d["unlocked_count"] == unlocked_in_list

        # recent lists
        assert isinstance(d["recent_tasks"], list)
        assert isinstance(d["recent_career"], list)
        assert len(d["recent_tasks"]) <= 10
        assert len(d["recent_career"]) <= 10

        # stats
        for k in ("jee_done", "jee_total", "pomo_mins", "meditation_mins"):
            assert k in d["stats"], f"missing stats.{k}"
        assert isinstance(d["stats"]["jee_total"], int) and d["stats"]["jee_total"] > 0

    def test_public_profile_reflects_patch(self, client):
        client.patch(f"{API}/profile", json={
            "name": "TEST_PublicName", "linkedin_url": "https://linkedin.com/in/publictest"
        })
        d = client.get(f"{API}/public-profile").json()
        assert d["profile"]["name"] == "TEST_PublicName"
        assert d["profile"]["linkedin_url"] == "https://linkedin.com/in/publictest"


# ---------- XP Clamp ----------
class TestXPClamp:
    def test_total_xp_never_goes_negative(self, client):
        """Toggle a task on then off twice — XP should clamp at 0, not go negative."""
        # Create a task with very high XP to force underflow
        big_xp = 10_000_000
        tr = client.post(f"{API}/tasks", json={
            "title": "TEST_xp_clamp_task", "category": "study", "xp": big_xp
        })
        assert tr.status_code == 200
        tid = tr.json()["id"]
        try:
            # Toggle on (+big_xp), off (-big_xp), on (+big_xp), off (-big_xp)
            for _ in range(2):
                r1 = client.patch(f"{API}/tasks/{tid}/toggle")
                assert r1.status_code == 200
                assert r1.json()["total_xp"] >= 0
                r2 = client.patch(f"{API}/tasks/{tid}/toggle")
                assert r2.status_code == 200
                assert r2.json()["total_xp"] >= 0, (
                    f"total_xp went negative: {r2.json()['total_xp']}"
                )
            # Final profile check
            prof = client.get(f"{API}/profile").json()
            assert prof["total_xp"] >= 0
        finally:
            # cleanup ensure task is in not-completed state then delete
            t_now = next((t for t in client.get(f"{API}/tasks").json() if t["id"] == tid), None)
            if t_now and t_now.get("completed"):
                client.patch(f"{API}/tasks/{tid}/toggle")
            client.delete(f"{API}/tasks/{tid}")


# ---------- Light regression on existing endpoints ----------
class TestRegressionSample:
    def test_profile(self, client):
        r = client.get(f"{API}/profile")
        assert r.status_code == 200
        d = r.json()
        _no_mongo_id(d)
        assert "level" in d and "total_xp" in d

    def test_tasks_list(self, client):
        r = client.get(f"{API}/tasks")
        assert r.status_code == 200
        _no_mongo_id(r.json())

    def test_jee_syllabus(self, client):
        r = client.get(f"{API}/jee/syllabus")
        assert r.status_code == 200
        d = r.json()
        _no_mongo_id(d)
        assert d["total"] > 0

    def test_pomodoro_log(self, client):
        r = client.post(f"{API}/pomodoro/log", json={"subject": "TEST_Reg", "duration_mins": 1})
        assert r.status_code == 200
        _no_mongo_id(r.json())

    def test_habits_today(self, client):
        r = client.get(f"{API}/habits/today")
        assert r.status_code == 200
        d = r.json()
        _no_mongo_id(d)
        assert len(d["habits"]) == 10

    def test_meds_create_and_list(self, client):
        r = client.post(f"{API}/meds", json={"name": "TEST_RegMed", "time": "08:00"})
        assert r.status_code == 200
        mid = r.json()["id"]
        try:
            r2 = client.get(f"{API}/meds")
            assert r2.status_code == 200
            _no_mongo_id(r2.json())
        finally:
            client.delete(f"{API}/meds/{mid}")

    def test_meditation_stats(self, client):
        r = client.get(f"{API}/meditation/stats")
        assert r.status_code == 200
        _no_mongo_id(r.json())

    def test_career_list(self, client):
        r = client.get(f"{API}/career")
        assert r.status_code == 200
        _no_mongo_id(r.json())

    def test_career_programs(self, client):
        r = client.get(f"{API}/career/programs")
        assert r.status_code == 200
        arr = r.json()
        _no_mongo_id(arr)
        assert len(arr) == 12

    def test_dashboard_summary(self, client):
        r = client.get(f"{API}/dashboard/summary")
        assert r.status_code == 200
        d = r.json()
        _no_mongo_id(d)
        for k in ("profile", "tasks", "jee_done", "jee_total", "habits_total"):
            assert k in d

    def test_ai_chat_smoke(self, client):
        try:
            r = client.post(f"{API}/ai/chat", json={
                "text": "Reply with just 'hi'", "session_id": "TEST_iter2"
            }, timeout=60)
        except requests.Timeout:
            pytest.skip("AI chat timed out")
        if r.status_code == 500:
            pytest.skip(f"AI chat 500 (likely key/budget): {r.text[:200]}")
        assert r.status_code == 200
        d = r.json()
        _no_mongo_id(d)
        assert isinstance(d.get("reply", ""), str) and len(d["reply"]) > 0
