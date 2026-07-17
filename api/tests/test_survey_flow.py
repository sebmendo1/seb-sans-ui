import os
from pathlib import Path

TEST_DB = Path("/tmp/seb-sans-survey-test.sqlite3")
if TEST_DB.exists():
    TEST_DB.unlink()
os.environ["DATABASE_URL"] = f"sqlite:///{TEST_DB}"
os.environ["ADMIN_PIN"] = "test-pin"

from fastapi.testclient import TestClient

from api.main import app


def default_state(experiment):
    return {
        "display": experiment["displayDefaults"],
        "body": experiment["bodyDefaults"],
        "display_text": experiment["displaySample"],
        "body_text": experiment["bodySample"],
        "display_rating": 6,
        "body_rating": 5,
        "likes": "The figures stay clear.",
        "dislikes": "Body leading could be calmer.",
        "overall_rating": 6,
        "feelings": "Precise and warm.",
    }


def test_anonymous_survey_to_live_admin_summary():
    with TestClient(app) as client:
        created = client.post(
            "/api/survey/sessions",
            json={
                "viewport": {"width": 1280, "height": 800},
                "browser_family": "Test",
                "variable_font_supported": True,
            },
        )
        assert created.status_code == 200
        payload = created.json()
        session_id = payload["sessionId"]
        token = payload["sessionToken"]
        headers = {"X-Session-Token": token}
        state = default_state(payload["experiment"])

        forbidden = client.put(
            f"/api/survey/sessions/{session_id}/draft",
            json={"revision": 0, "current_step": 2, "state": state, "events": []},
        )
        assert forbidden.status_code == 404

        saved = client.put(
            f"/api/survey/sessions/{session_id}/draft",
            headers=headers,
            json={
                "revision": 0,
                "current_step": 4,
                "state": state,
                "events": [
                    {
                        "role": "display",
                        "control": "weight",
                        "value": 660,
                        "elapsed_ms": 1200,
                    }
                ],
            },
        )
        assert saved.status_code == 200
        assert saved.json()["revision"] == 1

        stale = client.put(
            f"/api/survey/sessions/{session_id}/draft",
            headers=headers,
            json={"revision": 0, "current_step": 4, "state": state, "events": []},
        )
        assert stale.status_code == 409

        submitted = client.post(
            f"/api/survey/sessions/{session_id}/submit",
            headers=headers,
            json={"revision": 1, "state": state, "events": []},
        )
        assert submitted.status_code == 200
        assert submitted.json()["completionCode"].startswith("SEB-")

        repeated = client.post(
            f"/api/survey/sessions/{session_id}/submit",
            headers=headers,
            json={"revision": 1, "state": state, "events": []},
        )
        assert repeated.status_code == 200
        assert repeated.json()["alreadyCompleted"] is True

        login = client.post("/api/admin/session", json={"pin": "test-pin"})
        assert login.status_code == 200
        summary = client.get("/api/admin/summary")
        assert summary.status_code == 200
        assert summary.json()["completed"] == 1
        assert summary.json()["distributions"]["display"]["weight"]["median"] == 660


def test_new_experiment_does_not_change_existing_snapshot():
    with TestClient(app) as client:
        original = client.post("/api/survey/sessions", json={}).json()
        client.post("/api/admin/session", json={"pin": "test-pin"})
        experiment = original["experiment"]
        created = client.post(
            "/api/admin/experiments",
            json={
                "display_defaults": {**experiment["displayDefaults"], "weight": 700},
                "body_defaults": experiment["bodyDefaults"],
                "display_sample": experiment["displaySample"],
                "body_sample": experiment["bodySample"],
            },
        )
        assert created.status_code == 200
        activated = client.post(f"/api/admin/experiments/{created.json()['id']}/activate")
        assert activated.status_code == 200

        restored = client.get(
            f"/api/survey/sessions/{original['sessionId']}",
            headers={"X-Session-Token": original["sessionToken"]},
        )
        assert restored.json()["experiment"]["version"] == original["experiment"]["version"]
        next_session = client.post("/api/survey/sessions", json={}).json()
        assert next_session["experiment"]["version"] == created.json()["version"]
