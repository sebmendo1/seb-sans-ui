# Working Copy Safety

```yaml
id: A02
title: Working copy safety
status: ready
depends_on: [A01, V04]
priority: P0
normative: true
```

## Absolute rules

1. **Never** write directly in place to `fonts/SebSansVar.ttf` as the first write of an edit session.
2. All mutable edits land on a **working copy**.
3. Explicit **Save** commits working copy → source of truth, with a **timestamped backup** of the previous source in `fonts/_history/`.
4. Export builds from the authorized source (committed Save state or an explicitly chosen working snapshot — default: last Saved source + documented export policy in F06). Export must never silently overwrite history.

## Canonical paths

| Path | Role |
|------|------|
| `fonts/SebSansVar.ttf` | Source of truth (variable font) |
| `fonts/_working/SebSansVar.ttf` | Mutable working copy |
| `fonts/_history/SebSansVar-YYYYMMDD-HHMMSS.ttf` | Timestamped backups on Save |
| `fonts/README.md` | Design history / QA log (human) |
| `fonts/_baseline/Inter-*.ttf` (or equivalent) | Cached stock Inter for “reset to Inter” / diff ([F02](../features/F02-outline-editor.md)) |
| `releases/` | Export artifacts and zips |

If assets are not yet present, create these directories at scaffold time; source TTF remains `blocked-on-assets` until provided.

## Session lifecycle

1. **Open studio** → ensure working copy exists (copy from source if missing or on explicit “Reset working from source”).
2. **Edit** → intents applied only to `_working`.
3. **Preview** → served from `_working`.
4. **Save** → copy current source → `_history/` with timestamp → replace source with working copy (or atomic rename pattern).
5. **Discard** (optional) → re-copy source → working.

## Failure modes to prevent

| Bad outcome | Mitigation |
|-------------|------------|
| Truncated/corrupt source after crash mid-write | Atomic write (temp + rename); history already written before replace |
| Lost previous good cut | `_history/` mandatory on every Save |
| UI believes Save succeeded when disk failed | API returns hard error; UI shows failure |

## Acceptance

- [ ] No API endpoint may accept a path that overwrites `fonts/SebSansVar.ttf` without going through Save semantics above
- [ ] Every successful Save creates a new `_history/` file
- [ ] Studio can recover working copy from source after discard

## Related

- Point count / gvar: [Q02](../quality/Q02-point-count-policy.md)
- API: [A03](A03-api-contracts.md)
