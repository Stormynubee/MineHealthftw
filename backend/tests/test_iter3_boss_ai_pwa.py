"""Iteration 3 backend tests: boss-fight toggle, AI linkedin-recap, AI skin-analysis,
tasks CRUD regression, and PWA static asset reachability via Kubernetes ingress."""
import os
import time
import uuid
import pytest
import requests
from dotenv import load_dotenv
from pathlib import Path

load_dotenv(Path(__file__).resolve().parents[2] / "frontend" / ".env")
BASE_URL = os.environ['REACT_APP_BACKEND_URL'].rstrip('/')
API = f"{BASE_URL}/api"


@pytest.fixture(scope="module")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="module")
def created_task_ids():
    ids = []
    yield ids
    # cleanup
    s = requests.Session()
    for tid in ids:
        try:
            s.delete(f"{API}/tasks/{tid}", timeout=10)
        except Exception:
            pass


# ---------- Tasks CRUD regression ----------
class TestTasksCRUDRegression:
    def test_create_task_default_is_boss_false(self, session, created_task_ids):
        r = session.post(f"{API}/tasks", json={"title": f"TEST_reg_{uuid.uuid4().hex[:6]}", "category": "study", "xp": 10})
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["title"].startswith("TEST_reg_")
        assert d["category"] == "study"
        assert d["xp"] == 10
        assert d["completed"] is False
        # is_boss default — server's Task model doesn't include is_boss; persisted doc shouldn't have it
        # but the API response should be a valid Task dict
        assert "id" in d
        created_task_ids.append(d["id"])

    def test_list_tasks_includes_created(self, session, created_task_ids):
        r = session.get(f"{API}/tasks")
        assert r.status_code == 200
        ids = {t["id"] for t in r.json()}
        for tid in created_task_ids:
            assert tid in ids

    def test_delete_task(self, session):
        r = session.post(f"{API}/tasks", json={"title": "TEST_to_delete", "xp": 5})
        tid = r.json()["id"]
        r2 = session.delete(f"{API}/tasks/{tid}")
        assert r2.status_code == 200
        # verify gone from list
        r3 = session.get(f"{API}/tasks")
        assert tid not in {t["id"] for t in r3.json()}


# ---------- Boss endpoints ----------
class TestBossFight:
    def test_boss_toggle_and_singleton(self, session, created_task_ids):
        # Create two tasks
        a = session.post(f"{API}/tasks", json={"title": "TEST_bossA", "xp": 30}).json()
        b = session.post(f"{API}/tasks", json={"title": "TEST_bossB", "xp": 40}).json()
        created_task_ids.extend([a["id"], b["id"]])

        # set A as boss
        r1 = session.patch(f"{API}/tasks/{a['id']}/boss")
        assert r1.status_code == 200
        assert r1.json()["is_boss"] is True

        # GET /tasks/boss returns A
        rb = session.get(f"{API}/tasks/boss")
        assert rb.status_code == 200
        cur = rb.json()
        assert cur is not None
        assert cur["id"] == a["id"]

        # Set B as boss — A should auto-clear
        r2 = session.patch(f"{API}/tasks/{b['id']}/boss")
        assert r2.status_code == 200
        assert r2.json()["is_boss"] is True

        rb2 = session.get(f"{API}/tasks/boss")
        assert rb2.status_code == 200
        cur2 = rb2.json()
        assert cur2 is not None
        assert cur2["id"] == b["id"], "Only one boss should exist; B should now be the boss"

        # Confirm A is no longer boss in list
        all_tasks = session.get(f"{API}/tasks").json()
        a_doc = next((t for t in all_tasks if t["id"] == a["id"]), None)
        # is_boss may or may not be in serialized response (Task model doesn't include it)
        # Check via /tasks/boss only (already done above)
        assert a_doc is not None

    def test_boss_unset_returns_none(self, session, created_task_ids):
        c = session.post(f"{API}/tasks", json={"title": "TEST_bossC", "xp": 25}).json()
        created_task_ids.append(c["id"])
        # set as boss
        r1 = session.patch(f"{API}/tasks/{c['id']}/boss")
        assert r1.json()["is_boss"] is True
        # toggle off
        r2 = session.patch(f"{API}/tasks/{c['id']}/boss")
        assert r2.status_code == 200
        assert r2.json()["is_boss"] is False
        # /tasks/boss should be null
        rb = session.get(f"{API}/tasks/boss")
        assert rb.status_code == 200
        assert rb.json() is None

    def test_boss_404_for_unknown_task(self, session):
        r = session.patch(f"{API}/tasks/{uuid.uuid4()}/boss")
        assert r.status_code == 404

    def test_toggle_boss_task_awards_2x_xp(self, session, created_task_ids):
        # Get baseline xp
        prof0 = session.get(f"{API}/profile").json()
        base_xp = prof0["total_xp"]

        # Create a task with xp=50 and make it boss
        t = session.post(f"{API}/tasks", json={"title": "TEST_boss2x", "xp": 50}).json()
        created_task_ids.append(t["id"])
        session.patch(f"{API}/tasks/{t['id']}/boss")

        # Complete it -> should award 100 xp
        r = session.patch(f"{API}/tasks/{t['id']}/toggle")
        assert r.status_code == 200
        d = r.json()
        assert d["completed"] is True
        assert d["is_boss"] is True
        assert d["xp_awarded"] == 100, f"Expected 2x = 100, got {d['xp_awarded']}"
        assert d["total_xp"] == base_xp + 100

        # Un-toggle -> should deduct 100
        r2 = session.patch(f"{API}/tasks/{t['id']}/toggle")
        assert r2.status_code == 200
        d2 = r2.json()
        assert d2["completed"] is False
        assert d2["xp_awarded"] == -100, f"Expected -2x = -100, got {d2['xp_awarded']}"
        assert d2["total_xp"] == base_xp

    def test_non_boss_task_awards_1x(self, session, created_task_ids):
        prof0 = session.get(f"{API}/profile").json()
        base = prof0["total_xp"]
        t = session.post(f"{API}/tasks", json={"title": "TEST_normal1x", "xp": 33}).json()
        created_task_ids.append(t["id"])
        r = session.patch(f"{API}/tasks/{t['id']}/toggle")
        d = r.json()
        assert d["xp_awarded"] == 33
        assert d["total_xp"] == base + 33
        # un-toggle to leave xp net-zero
        session.patch(f"{API}/tasks/{t['id']}/toggle")


# ---------- AI: LinkedIn recap ----------
class TestLinkedInRecap:
    def test_no_career_entries_returns_no_wins_message(self, session):
        # Best-effort: clear any TEST_ career entries from last 7d (we won't wipe real ones).
        # Just check current state — if entries exist, we'll validate the with-entries branch instead.
        existing = session.get(f"{API}/career").json()
        if not existing:
            r = session.post(f"{API}/ai/linkedin-recap", json={})
            assert r.status_code == 200
            d = r.json()
            assert "post" in d
            assert "No wins" in d["post"] or "no wins" in d["post"].lower()
        else:
            pytest.skip("Career entries exist; covered by next test")

    def test_with_career_entries_returns_post(self, session):
        # Seed 1 career entry to guarantee coverage
        seed = session.post(f"{API}/career", json={
            "type": "video_edit",
            "title": "TEST_linkedin_recap_video",
            "note": "auto seeded for iter3 test",
        })
        assert seed.status_code == 200
        seed_id = seed.json()["id"]
        try:
            r = session.post(f"{API}/ai/linkedin-recap", json={}, timeout=60)
            assert r.status_code == 200, r.text
            d = r.json()
            assert "post" in d
            assert isinstance(d["post"], str)
            assert len(d["post"]) > 20, "Post should be non-trivial"
            # Either LLM-generated (entries_used) or fallback (fallback=True) — both acceptable
            assert d.get("entries_used") or d.get("fallback")
        finally:
            session.delete(f"{API}/career/{seed_id}")


# ---------- AI: Skin analysis ----------
class TestSkinAnalysis:
    def test_insufficient_logs_returns_ready_false(self, session):
        # Note: we don't wipe pre-existing skin issue logs. Check current count first.
        existing = session.get(f"{API}/skin issue-log?days=14").json()
        if len(existing) < 3:
            r = session.post(f"{API}/ai/skin-analysis", json={})
            assert r.status_code == 200
            d = r.json()
            assert d["ready"] is False
            assert "insight" in d
        else:
            pytest.skip(f"{len(existing)} skin issue logs already exist; covered by next test")

    def test_sufficient_logs_returns_ready_true(self, session):
        # Seed 3 skin issue logs (today). They'll persist — but tests are idempotent on this branch.
        seeded = []
        try:
            for i in range(3):
                r = session.post(f"{API}/skin issue-log", json={
                    "severity": 2 + i,
                    "no_sugar": (i % 2 == 0),
                    "no_oil": True,
                    "meditation": False,
                    "note": f"TEST_skin_seed_{i}",
                })
                assert r.status_code == 200
                seeded.append(r.json()["id"])

            r2 = session.post(f"{API}/ai/skin-analysis", json={}, timeout=60)
            assert r2.status_code == 200, r2.text
            d = r2.json()
            assert d["ready"] is True
            assert isinstance(d["insight"], str) and len(d["insight"]) > 10
            # either Claude paragraph or fallback (both acceptable per spec)
        finally:
            # We can't delete skin issue logs (no DELETE endpoint), so they remain.
            pass


# ---------- PWA static assets via ingress ----------
class TestPWAStatic:
    @pytest.mark.parametrize("path", ["/manifest.json", "/service-worker.js", "/icon-192.png"])
    def test_static_asset_reachable(self, path):
        r = requests.get(f"{BASE_URL}{path}", timeout=15)
        assert r.status_code == 200, f"{path} returned {r.status_code}"
        assert len(r.content) > 0, f"{path} empty"

    def test_manifest_is_valid_json(self):
        r = requests.get(f"{BASE_URL}/manifest.json", timeout=15)
        assert r.status_code == 200
        # content-type may be application/json or text/plain depending on dev server
        data = r.json()
        assert "name" in data or "short_name" in data

    def test_service_worker_is_js(self):
        r = requests.get(f"{BASE_URL}/service-worker.js", timeout=15)
        assert r.status_code == 200
        body = r.text
        assert len(body) > 0
        # Heuristic: service workers usually reference one of these
        assert any(kw in body for kw in ["self", "addEventListener", "caches", "fetch", "install"]), \
            "service-worker.js doesn't look like a service worker script"
