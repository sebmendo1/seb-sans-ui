import os
from pathlib import Path

TEST_DB = Path("/tmp/seb-sans-vercel-startup-test.sqlite3")
FONT_DIR = Path("/tmp/seb-sans-vercel-fonts-test")
if TEST_DB.exists():
    TEST_DB.unlink()

os.environ["VERCEL"] = "1"
os.environ["DATABASE_URL"] = f"sqlite:///{TEST_DB}"
os.environ["STUDIO_FONT_DIR"] = str(FONT_DIR)

from api.main import startup


def test_startup_on_vercel():
    startup()

    assert (FONT_DIR / "_working").is_dir()
    assert (FONT_DIR / "SebSansVar.ttf").is_file()
