# API Contracts

```yaml
id: A03
title: API contracts
status: ready
depends_on: [A01, A02]
priority: P0
normative: true
```

## Conventions

- Base URL (dev): `http://127.0.0.1:8787` (port may be configured; document in package scripts).
- JSON request/response unless noted (`application/font-sfnt` or octet-stream for font bytes).
- Errors: `{ "error": string, "code": string, "details"?: object }`

## Endpoints (normative shapes)

### Health

`GET /health` → `{ "ok": true }`

### Font preview bytes

`GET /font/working` → TTF bytes (working copy)

`GET /font/source` → TTF bytes (source of truth; read-only)

### Glyph catalog

`GET /glyphs` →

```json
{
  "glyphs": [
    {
      "name": "G",
      "unicode": "U+0047",
      "group": "caps",
      "dna": true,
      "index": 42
    }
  ],
  "groups": ["caps", "lowercase", "figures", "punctuation", "accents", "math_arrows", "other"]
}
```

### Instance outline (for canvas)

`GET /glyphs/{name}/outline?wght=400&opsz=14` →

```json
{
  "name": "G",
  "wght": 400,
  "opsz": 14,
  "advanceWidth": 1200,
  "contours": [ { "points": [ { "x": 0, "y": 0, "onCurve": true } ] } ],
  "pointCount": 64
}
```

Interpolation is **server-side** (gvar-aware) when needed; browser may also draw via opentype.js for interactivity but commits go through intents.

### Edit intents (working copy only)

`POST /edits/apply`

```json
{
  "intent": "transform" | "points" | "metrics" | "batch" | "reset_inter",
  "glyphs": ["a", "c", "e"],
  "payload": {},
  "confirmAdvanced": false
}
```

Rules:

- If intent would change point counts, require `confirmAdvanced: true` or reject with `code: "POINT_COUNT_CHANGE_REQUIRES_CONFIRM"` ([Q02](../quality/Q02-point-count-policy.md)).
- Response includes updated outline summary and optional preview hint.

`POST /edits/preview-batch` — dry-run / temporary preview without committing (returns preview font bytes or outline deltas). Used by [F03](../features/F03-batch-operations.md).

### Undo / redo (server-authoritative optional)

Studio may keep UI undo for uncommitted point drags; **committed** intents should be undoable via:

`POST /edits/undo` / `POST /edits/redo`

Or document if undo is session-stack in API. Pick one at implement time; this spec requires **some** undo/redo after apply ([F02](../features/F02-outline-editor.md)).

### Save / discard

`POST /font/save` → `{ "ok": true, "historyPath": "fonts/_history/..." }`

`POST /font/discard-working` → resets working from source

### Principle check data

`GET /checks/principles?glyph=l` → payloads for F05 (confusable metrics, advance deltas, last batch coverage %)

### Export job

`POST /export/run`

```json
{ "version": "1.1", "changelog": "..." }
```

`GET /export/status/{jobId}` →

```json
{
  "status": "running" | "failed" | "passed_awaiting_confirm" | "complete",
  "gates": {
    "fontbakery": { "ok": false, "failures": [], "warnings": [] },
    "harfbuzz": { "ok": true, "failures": [] }
  },
  "zipPath": null,
  "checklist": []
}
```

Zip is produced **only** when gates pass ([Q01](../quality/Q01-export-gates.md)). Failures must be surfaced; no silent zip.

## CORS

Dev UI origin allowed only (localhost Vite port).

## Related

- Pipeline steps invoked by export: [A04](A04-pipeline-inventory.md), [F06](../features/F06-export-pipeline.md)
