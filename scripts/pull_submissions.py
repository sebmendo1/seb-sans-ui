#!/usr/bin/env python3
"""Pull completed survey submissions and write static SubmissionExport JSON."""

from __future__ import annotations

import argparse
import json
import sys
import urllib.error
import urllib.request
from datetime import datetime, timedelta, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PUBLIC_SEED = ROOT / "public" / "data" / "submissions.json"
ARCHIVE_DIR = ROOT / "data" / "submissions"

SURVEY_001_SAMPLES = {
    "displaySample": "The lamp that would not argue",
    "bodySample": (
        "The surveyor arrived in spring with instruments nobody recognized, and measured "
        "the village for a map nobody had asked for. Streets: 14. Wells: 3. Doors painted "
        "blue: 27. She wrote each number in a small canvas book, and the numbers lined up "
        "like fence posts.\n\n"
        "“Why count what we already know?” asked the innkeeper, watching her chart the square.\n\n"
        "“Because you know it differently than it is,” she said. “You remember 40 blue doors. "
        "There are 27. The map holds what the memory rounds.”"
    ),
    "displayDefaults": {
        "size": 36,
        "weight": 660,
        "opsz": 30,
        "tracking": -0.015,
        "leading": 1.1,
        "xheight": 100,
    },
    "bodyDefaults": {
        "size": 18,
        "weight": 430,
        "opsz": 14,
        "tracking": 0,
        "leading": 1.55,
        "xheight": 100,
    },
}


def normalize_config(config: dict | None) -> dict:
    if not config:
        return {"size": 0, "weight": 400, "opsz": 14, "tracking": 0, "leading": 1.4, "xheight": 100}
    return {
        "size": float(config.get("size", 0)),
        "weight": float(config.get("weight", 400)),
        "opsz": float(config.get("opsz", 14)),
        "tracking": float(config.get("tracking", 0)),
        "leading": float(config.get("leading", 1.4)),
        "xheight": float(config.get("xheight", 100)),
    }


def submission_to_export(row: dict) -> dict:
    feedback = row.get("feedback") or {}
    display = row.get("display") or {}
    body = row.get("body") or {}
    viewport = row.get("viewport") or {}
    completed_at = row["completedAt"]
    duration = float(row.get("durationSeconds") or 0)
    completed_dt = datetime.fromisoformat(completed_at.replace("Z", "+00:00"))
    if completed_dt.tzinfo is None:
        completed_dt = completed_dt.replace(tzinfo=timezone.utc)
    started_dt = completed_dt - timedelta(seconds=duration)
    started_at = started_dt.isoformat().replace("+00:00", "Z")
    submitted_at = completed_dt.isoformat().replace("+00:00", "Z")

    display_defaults = normalize_config(display.get("initial") or SURVEY_001_SAMPLES["displayDefaults"])
    body_defaults = normalize_config(body.get("initial") or SURVEY_001_SAMPLES["bodyDefaults"])
    display_sample = (
        display.get("text")
        if not display.get("sampleEdited")
        else SURVEY_001_SAMPLES["displaySample"]
    )
    body_sample = body.get("text") if not body.get("sampleEdited") else SURVEY_001_SAMPLES["bodySample"]

    return {
        "completionCode": row["completionCode"],
        "submittedAt": submitted_at,
        "experimentVersion": row["experimentVersion"],
        "viewport": {
            "width": int(viewport.get("width") or 0),
            "height": int(viewport.get("height") or 0),
        },
        "browserFamily": row.get("browserFamily") or "Other",
        "startedAt": started_at,
        "durationSeconds": duration,
        "state": {
            "display": normalize_config(display.get("final")),
            "body": normalize_config(body.get("final")),
            "display_text": display.get("text") or display_sample,
            "body_text": body.get("text") or body_sample,
            "display_rating": int(display.get("legibilityRating") or 0),
            "body_rating": int(body.get("legibilityRating") or 0),
            "likes": feedback.get("likes") or "",
            "dislikes": feedback.get("dislikes") or "",
            "overall_rating": int(feedback.get("overallRating") or 0),
            "feelings": feedback.get("feelings") or "",
        },
        "tuningEvents": row.get("events") or [],
        "displayDefaults": display_defaults,
        "bodyDefaults": body_defaults,
        "displaySample": display_sample,
        "bodySample": body_sample,
    }


def fetch_vercel_export(base_url: str, pin: str) -> list[dict]:
    login_body = json.dumps({"pin": pin}).encode()
    login_request = urllib.request.Request(
        f"{base_url.rstrip('/')}/api/admin/session",
        data=login_body,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    cookie = None
    with urllib.request.urlopen(login_request, timeout=30) as response:
        cookie = response.headers.get("Set-Cookie", "").split(";", 1)[0]
    if not cookie:
        raise RuntimeError("Admin login succeeded but no session cookie was returned")

    export_request = urllib.request.Request(
        f"{base_url.rstrip('/')}/api/admin/export.json",
        headers={"Cookie": cookie},
    )
    with urllib.request.urlopen(export_request, timeout=60) as response:
        payload = json.load(response)
    return payload.get("submissions") or []


def merge_exports(existing: list[dict], incoming: list[dict]) -> list[dict]:
    seen = {item["completionCode"] for item in existing}
    merged = list(existing)
    for row in incoming:
        export = submission_to_export(row)
        if export["completionCode"] in seen:
            continue
        seen.add(export["completionCode"])
        merged.append(export)
    merged.sort(key=lambda item: item["submittedAt"], reverse=True)
    return merged


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--base-url", default="https://seb-sans-ui.vercel.app")
    parser.add_argument("--pin", default="sebsans")
    parser.add_argument("--input", type=Path, help="Optional admin export.json file")
    args = parser.parse_args()

    rows: list[dict] = []
    if args.input:
        payload = json.loads(args.input.read_text())
        if isinstance(payload, list):
            rows = payload
        else:
            rows = payload.get("submissions") or []
    else:
        try:
            rows = fetch_vercel_export(args.base_url, args.pin)
        except urllib.error.HTTPError as error:
            print(f"Failed to pull from {args.base_url}: HTTP {error.code}", file=sys.stderr)
            return 1
        except urllib.error.URLError as error:
            print(f"Failed to pull from {args.base_url}: {error.reason}", file=sys.stderr)
            return 1

    exports = merge_exports([], rows)
    if not exports:
        print("No completed submissions found.", file=sys.stderr)
        return 1

    ARCHIVE_DIR.mkdir(parents=True, exist_ok=True)
    PUBLIC_SEED.parent.mkdir(parents=True, exist_ok=True)
    PUBLIC_SEED.write_text(json.dumps(exports, indent=2) + "\n", encoding="utf-8")
    archive_path = ARCHIVE_DIR / f"vercel-export-{datetime.now(timezone.utc).strftime('%Y%m%d-%H%M%S')}.json"
    archive_path.write_text(json.dumps({"submissions": rows}, indent=2) + "\n", encoding="utf-8")

    for export in exports:
        (ARCHIVE_DIR / f"submission-{export['completionCode']}.json").write_text(
            json.dumps(export, indent=2) + "\n",
            encoding="utf-8",
        )

    print(f"Wrote {len(exports)} submission(s) to {PUBLIC_SEED}")
    print(f"Archived source export to {archive_path}")
    for export in exports:
        print(f"  - {export['completionCode']} ({export['experimentVersion']})")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
