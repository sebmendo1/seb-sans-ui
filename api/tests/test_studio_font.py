from __future__ import annotations

import os
import shutil
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

TEST_DB = Path("/tmp/seb-sans-studio-font-test.sqlite3")
if TEST_DB.exists():
    TEST_DB.unlink()
os.environ["DATABASE_URL"] = f"sqlite:///{TEST_DB}"
os.environ["ADMIN_PIN"] = "test-pin"

from api.main import app


@pytest.fixture()
def font_fixture(tmp_path: Path, monkeypatch: pytest.MonkeyPatch):
    font_dir = tmp_path / "fonts"
    source = font_dir / "SebSansVar.ttf"
    working_dir = font_dir / "_working"
    history_dir = font_dir / "_history"
    working_dir.mkdir(parents=True)
    history_dir.mkdir(parents=True)
    source.write_bytes(b"SOURCE-FONT-BYTES-v1")
    shutil.copy2(source, working_dir / "SebSansVar.ttf")

    monkeypatch.setenv("STUDIO_FONT_DIR", str(font_dir))
    return {
        "font_dir": font_dir,
        "source": source,
        "working": working_dir / "SebSansVar.ttf",
        "history_dir": history_dir,
    }


def test_font_status_reports_working_match(font_fixture):
    with TestClient(app) as client:
        response = client.get("/api/font/status")
        assert response.status_code == 200
        payload = response.json()
        assert payload["workingMatchesSource"] is True
        assert payload["historyCount"] == 0


def test_save_creates_history_and_commits_working(font_fixture):
    font_fixture["working"].write_bytes(b"WORKING-FONT-BYTES-v2")

    with TestClient(app) as client:
        save = client.post("/api/font/save")
        assert save.status_code == 200
        history_path = save.json()["historyPath"]
        assert history_path.startswith("fonts/_history/SebSansVar-")

        assert font_fixture["source"].read_bytes() == b"WORKING-FONT-BYTES-v2"
        history_files = list(font_fixture["history_dir"].glob("SebSansVar-*.ttf"))
        assert len(history_files) == 1
        assert history_files[0].read_bytes() == b"SOURCE-FONT-BYTES-v1"

        status = client.get("/api/font/status").json()
        assert status["workingMatchesSource"] is True
        assert status["historyCount"] == 1


def test_discard_restores_working_from_source(font_fixture):
    font_fixture["source"].write_bytes(b"SOURCE-FONT-BYTES-v3")
    font_fixture["working"].write_bytes(b"DIRTY-WORKING")

    with TestClient(app) as client:
        discard = client.post("/api/font/discard-working")
        assert discard.status_code == 200
        assert font_fixture["working"].read_bytes() == b"SOURCE-FONT-BYTES-v3"


def test_font_bytes_endpoints(font_fixture):
    with TestClient(app) as client:
        source = client.get("/api/font/source")
        working = client.get("/api/font/working")
        assert source.status_code == 200
        assert working.status_code == 200
        assert source.content == b"SOURCE-FONT-BYTES-v1"
        assert working.content == b"SOURCE-FONT-BYTES-v1"
