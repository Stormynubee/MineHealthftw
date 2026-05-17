"""Iter 4 backend tests: JEE meta endpoint + Task year/status/link fields + regression spot-checks."""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL") or "https://mc-life-quest-1.preview.emergentagent.com"
BASE_URL = BASE_URL.rstrip("/")
API = f"{BASE_URL}/api"


@pytest.fixture(scope="module")
def client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="module")
def created_tasks():
    ids = []
    yield ids
    # cleanup
    sess = requests.Session()
    for tid in ids:
        try:
            sess.delete(f"{API}/tasks/{tid}")
        except Exception:
            pass


# ---- JEE meta endpoint tests ----
class TestJeeMeta:
    TOPIC_ID = "physics-11-kinematics"

    def test_set_status_2_updates_syllabus(self, client):
        payload = {"status": 2, "notes": "TEST_iter4 kinematics notes", "revisions": 3}
        r = client.patch(f"{API}/jee/topic/{self.TOPIC_ID}/meta", json=payload)
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["ok"] is True
        assert body["status"] == 2
        assert body["notes"] == "TEST_iter4 kinematics notes"
        assert body["revisions"] == 3
        assert body["completed"] is True  # status>=2 flips completed

        # verify via GET /api/jee/syllabus
        r2 = client.get(f"{API}/jee/syllabus")
        assert r2.status_code == 200
        syl = r2.json()
        assert "syllabus" in syl and "total" in syl and "done" in syl and "mastered" in syl
        # find topic
        phys = syl["syllabus"].get("Physics") or syl["syllabus"].get("physics")
        assert phys is not None
        found = None
        for klass in ("11", "12"):
            for t in phys.get(klass, []):
                if t["id"] == self.TOPIC_ID:
                    found = t
                    break
        assert found is not None, "kinematics topic missing from syllabus"
        assert found["status"] == 2
        assert found["notes"] == "TEST_iter4 kinematics notes"
        assert found["revisions"] == 3
        assert found["completed"] is True

    def test_status_3_awards_30_xp_bonus(self, client):
        prof_before = client.get(f"{API}/profile").json()
        xp_before = prof_before["total_xp"]
        r = client.patch(
            f"{API}/jee/topic/physics-11-laws-of-motion/meta",
            json={"status": 3, "notes": "TEST_iter4 mastered laws"},
        )
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["status"] == 3
        assert body["completed"] is True

        prof_after = client.get(f"{API}/profile").json()
        xp_after = prof_after["total_xp"]
        assert xp_after - xp_before == 30, f"expected +30 XP, got {xp_after - xp_before}"

    def test_mastered_count_in_syllabus(self, client):
        # We just set one topic to status=3; mastered should be >=1
        r = client.get(f"{API}/jee/syllabus")
        assert r.status_code == 200
        body = r.json()
        assert "mastered" in body
        assert isinstance(body["mastered"], int)
        assert body["mastered"] >= 1

    def test_empty_payload_no_op(self, client):
        r = client.patch(f"{API}/jee/topic/physics-11-kinematics/meta", json={})
        assert r.status_code == 200
        assert r.json().get("ok") is True

    def test_cleanup_reset_topics(self, client):
        # reset topics back to status 0
        for tid in ("physics-11-kinematics", "physics-11-laws-of-motion"):
            client.patch(f"{API}/jee/topic/{tid}/meta", json={"status": 0, "notes": "", "revisions": 0})


# ---- Task model new fields ----
class TestTaskNewFields:
    def test_create_task_with_year_status_link(self, client, created_tasks):
        payload = {
            "title": "TEST_iter4 portfolio site",
            "category": "code",
            "year": 2024,
            "status": "completed",
            "link": "https://example.com/project",
            "xp": 50,
            "note": "old project",
        }
        r = client.post(f"{API}/tasks", json=payload)
        assert r.status_code == 200, r.text
        t = r.json()
        created_tasks.append(t["id"])
        assert t["title"] == payload["title"]
        assert t["category"] == "code"
        assert t["year"] == 2024
        assert t["status"] == "completed"
        assert t["link"] == "https://example.com/project"

    def test_list_tasks_returns_new_fields(self, client, created_tasks):
        r = client.get(f"{API}/tasks")
        assert r.status_code == 200
        docs = r.json()
        assert any(d["id"] in created_tasks for d in docs)
        mine = next(d for d in docs if d["id"] == created_tasks[0])
        assert "year" in mine and mine["year"] == 2024
        assert "status" in mine and mine["status"] == "completed"
        assert "link" in mine and mine["link"] == "https://example.com/project"

    def test_create_task_defaults_for_new_fields(self, client, created_tasks):
        r = client.post(f"{API}/tasks", json={"title": "TEST_iter4 simple", "category": "study"})
        assert r.status_code == 200
        t = r.json()
        created_tasks.append(t["id"])
        assert t["year"] is None
        assert t["status"] == "active"
        assert t["link"] == ""


# ---- Regression spot checks ----
class TestRegression:
    def test_profile(self, client):
        r = client.get(f"{API}/profile")
        assert r.status_code == 200
        d = r.json()
        assert "total_xp" in d and "level" in d and "xp_for_next" in d

    def test_tasks_basic_crud_toggle(self, client):
        # create
        r = client.post(f"{API}/tasks", json={"title": "TEST_iter4 regression toggle", "xp": 10})
        assert r.status_code == 200
        tid = r.json()["id"]
        try:
            # toggle complete
            r2 = client.patch(f"{API}/tasks/{tid}/toggle")
            assert r2.status_code == 200
            body = r2.json()
            assert body["completed"] is True
            assert body["xp_awarded"] == 10
        finally:
            client.delete(f"{API}/tasks/{tid}")

    def test_achievements(self, client):
        r = client.get(f"{API}/achievements")
        assert r.status_code == 200
        arr = r.json()
        assert isinstance(arr, list) and len(arr) > 0
        assert all("id" in a and "unlocked" in a and "progress" in a for a in arr)

    def test_public_profile(self, client):
        r = client.get(f"{API}/public-profile")
        assert r.status_code == 200
        d = r.json()
        for k in ("profile", "achievements", "unlocked_count", "recent_tasks", "recent_career", "stats"):
            assert k in d

    def test_boss_endpoint_ok(self, client):
        r = client.get(f"{API}/tasks/boss")
        assert r.status_code == 200  # returns null or boss object

    def test_dashboard_summary(self, client):
        r = client.get(f"{API}/dashboard/summary")
        assert r.status_code == 200
        d = r.json()
        for k in ("profile", "tasks", "pomodoro_mins_today", "habits_done_today", "jee_done", "jee_total"):
            assert k in d

    def test_ai_chat_endpoint_reachable(self, client):
        # Just send a short message; ai may be slow but should return 200
        r = client.post(f"{API}/ai/chat", json={"text": "hi in 5 words", "session_id": "TEST_iter4_regress"}, timeout=60)
        assert r.status_code == 200, r.text
        body = r.json()
        assert "reply" in body and isinstance(body["reply"], str) and len(body["reply"]) > 0
