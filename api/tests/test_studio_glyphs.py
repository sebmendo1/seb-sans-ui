import os
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

TEST_DB = Path("/tmp/seb-sans-glyphs-test.sqlite3")
if TEST_DB.exists():
    TEST_DB.unlink()
os.environ["DATABASE_URL"] = f"sqlite:///{TEST_DB}"
os.environ["ADMIN_PIN"] = "test-pin"

from api.main import app


def test_glyph_catalog_lists_groups():
    with TestClient(app) as client:
        response = client.get("/api/glyphs")
        assert response.status_code == 200
        payload = response.json()
        assert payload["total"] > 100
        assert "caps" in payload["groups"]
        dna = [item for item in payload["glyphs"] if item["dna"]]
        assert any(item["name"] == "G" for item in dna)


def test_glyph_outline_for_g():
    with TestClient(app) as client:
        response = client.get("/api/glyphs/G/outline?wght=430&opsz=14")
        assert response.status_code == 200
        payload = response.json()
        assert payload["name"] == "G"
        assert payload["pointCount"] > 0
        assert payload["contours"]


def test_principle_checks_for_l():
    with TestClient(app) as client:
        response = client.get("/api/checks/principles?glyph=l&batchCount=10")
        assert response.status_code == 200
        payload = response.json()
        assert payload["advisoryOnly"] is True
        assert payload["warmthIsDetail"]["selectionCount"] == 10
