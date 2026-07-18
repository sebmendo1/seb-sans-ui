from __future__ import annotations

import json
import shutil
import subprocess
import uuid
import zipfile
from dataclasses import dataclass, field
from pathlib import Path

from ..font_store import ROOT, ensure_working_copy, working_path
from ..pipeline.loader import load_pipeline_module, pipeline_status
from ..runtime import releases_dir

RELEASES_DIR = releases_dir()
ICONS_DIR = ROOT / "icons"
CHECKLIST = [
    {
        "id": "github",
        "required": True,
        "text": "Push the release to public GitHub repo sebmendo/seb-sans, tagged vX.Y, README rendered on the repo homepage.",
    },
    {
        "id": "portfolio",
        "required": True,
        "text": "Self-host the WOFF2 via @font-face on sebmendodesign.vercel.app as the first real deployment.",
    },
    {
        "id": "ofl",
        "required": True,
        "text": "Confirm OFL Reserved Font Name compliance was handled by build_sebsans.py (confirm only).",
    },
    {
        "id": "npm",
        "required": False,
        "text": "Optional: npm-publish the variable WOFF2 for reuse across future projects.",
    },
    {
        "id": "google-fonts",
        "required": False,
        "text": "Optional: Submit to Google Fonts once glyph set and language coverage are more complete than v1.",
    },
]


@dataclass
class ExportJob:
    id: str
    version: str
    changelog: str
    status: str = "running"
    gates: dict = field(default_factory=dict)
    zip_path: str | None = None
    checklist: list[dict] = field(default_factory=list)
    steps: list[dict] = field(default_factory=list)
    error: str | None = None


JOBS: dict[str, ExportJob] = {}


def _run_fontbakery(font_paths: list[Path]) -> dict:
    try:
        result = subprocess.run(
            ["fontbakery", "check-universal", *[str(path) for path in font_paths], "-J"],
            capture_output=True,
            text=True,
            check=False,
            timeout=300,
        )
    except FileNotFoundError:
        return {
            "ok": False,
            "failures": ["fontbakery is not installed"],
            "warnings": [],
            "skipped": True,
        }
    failures = []
    warnings = []
    if result.stdout.strip():
        try:
            payload = json.loads(result.stdout)
            for check in payload if isinstance(payload, list) else payload.get("sections", []):
                if isinstance(check, dict) and check.get("result") == "FAIL":
                    failures.append(check.get("description", "Unknown failure"))
                elif isinstance(check, dict) and check.get("result") == "WARN":
                    warnings.append(check.get("description", "Unknown warning"))
        except json.JSONDecodeError:
            if result.returncode != 0:
                failures.append(result.stderr or result.stdout or "fontbakery failed")
    elif result.returncode != 0:
        failures.append(result.stderr or "fontbakery failed")
    return {"ok": not failures, "failures": failures, "warnings": warnings}


def _run_harfbuzz_smoke(font_path: Path) -> dict:
    hb_shape = shutil.which("hb-shape")
    if not hb_shape:
        return {
            "ok": False,
            "failures": ["hb-shape is not installed"],
            "skipped": True,
        }
    failures = []
    samples = [
        ("0123456789", "tnum"),
        ("To AV", None),
        ("1/2", "frac"),
        ("x2", "sups"),
    ]
    for text, feature in samples:
        command = [hb_shape, str(font_path), text]
        if feature:
            command.extend(["--features", feature])
        result = subprocess.run(command, capture_output=True, text=True, check=False)
        if result.returncode != 0:
            failures.append(f"HarfBuzz failed for {text!r}: {result.stderr.strip()}")
    return {"ok": not failures, "failures": failures}


def _build_release_folder(job: ExportJob, export_dir: Path) -> list[Path]:
    fonts_dir = export_dir / "fonts"
    icons_dir = export_dir / "icons"
    fonts_dir.mkdir(parents=True, exist_ok=True)
    icons_dir.mkdir(parents=True, exist_ok=True)

    ensure_working_copy()
    working_copy = working_path()

    patch_module = load_pipeline_module("patch_gsub")
    if patch_module is not None:
        from fontTools.ttLib import TTFont

        font = TTFont(working_copy)
        added = patch_module.patch_gsub(font)
        font.save(working_copy)
        job.steps.append({"step": "gsub_patch", "ok": True, "mappingsAdded": added})
    else:
        job.steps.append({"step": "gsub_patch", "ok": True, "skipped": True})

    build_module = load_pipeline_module("build_sebsans")
    if build_module is not None:
        font_paths = build_module.build_release(working_copy, fonts_dir, job.version)
        job.steps.append({"step": "build_outputs", "ok": True, "files": len(font_paths)})
    else:
        shutil.copy2(working_copy, fonts_dir / "SebSansVar.ttf")
        font_paths = list(fonts_dir.glob("*.ttf"))
        job.steps.append({"step": "build_outputs", "ok": True, "skipped": True, "files": len(font_paths)})

    readme = ROOT / "fonts" / "README.md"
    if readme.is_file():
        changelog_note = f"\n\n## v{job.version}\n\n{job.changelog}\n"
        (fonts_dir / "README.md").write_text(readme.read_text(encoding="utf-8") + changelog_note, encoding="utf-8")

    ofl = ROOT / "fonts" / "OFL.txt"
    if ofl.is_file():
        shutil.copy2(ofl, fonts_dir / "OFL.txt")

    if ICONS_DIR.is_dir():
        for icon in ICONS_DIR.glob("*.svg"):
            shutil.copy2(icon, icons_dir / icon.name)
        jsx = ICONS_DIR / "SebIcons.jsx"
        if jsx.is_file():
            shutil.copy2(jsx, icons_dir / jsx.name)

    (export_dir / "CHANGELOG.txt").write_text(
        f"Seb Sans v{job.version}\n\n{job.changelog}\n",
        encoding="utf-8",
    )
    return list(fonts_dir.glob("*.ttf"))


def start_export(version: str, changelog: str, use_working: bool = True) -> ExportJob:
    job_id = uuid.uuid4().hex[:12]
    job = ExportJob(id=job_id, version=version, changelog=changelog)
    JOBS[job_id] = job

    pipeline = pipeline_status()
    job.steps.append({"step": "pipeline_check", "ok": True, "pipeline": pipeline})

    export_dir = RELEASES_DIR / f"SebSans-v{version}"
    if export_dir.exists():
        shutil.rmtree(export_dir)
    export_dir.mkdir(parents=True, exist_ok=True)

    try:
        font_paths = _build_release_folder(job, export_dir)

        ttfautohint = shutil.which("ttfautohint")
        job.steps.append(
            {
                "step": "ttfautohint",
                "ok": True,
                "skipped": ttfautohint is None,
                "note": "ttfautohint skipped" if ttfautohint is None else "ttfautohint available",
            }
        )

        job.gates["fontbakery"] = _run_fontbakery(font_paths)
        primary_font = next((path for path in font_paths if path.name == "SebSans-Regular.ttf"), font_paths[0])
        job.gates["harfbuzz"] = _run_harfbuzz_smoke(primary_font)

        gate_ok = job.gates["fontbakery"]["ok"] and job.gates["harfbuzz"]["ok"]
        if not gate_ok:
            job.status = "failed"
            job.error = "Export gates failed"
            return job

        zip_path = RELEASES_DIR / f"SebSans-v{version}.zip"
        with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as archive:
            for path in export_dir.rglob("*"):
                if path.is_file():
                    archive.write(path, path.relative_to(export_dir.parent))
        job.zip_path = str(zip_path.relative_to(ROOT))
        job.checklist = CHECKLIST
        job.status = "complete"
        job.steps.append({"step": "zip", "ok": True, "path": job.zip_path})
    except Exception as exc:
        job.status = "failed"
        job.error = str(exc)
    return job


def get_job(job_id: str) -> ExportJob | None:
    return JOBS.get(job_id)
