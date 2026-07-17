from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field

from .. import font_store
from ..services import edit_session, export_job, glyphs, outlines, principles

router = APIRouter(prefix="/api", tags=["studio"])


class EditApplyRequest(BaseModel):
    intent: str
    glyphs: list[str] = Field(default_factory=list)
    payload: dict = Field(default_factory=dict)
    confirmAdvanced: bool = False


class BatchPreviewRequest(BaseModel):
    glyphs: list[str] = Field(default_factory=list)
    payload: dict = Field(default_factory=dict)


class ExportRunRequest(BaseModel):
    version: str
    changelog: str = ""
    useWorking: bool = True


def _error(exc: font_store.FontStoreError) -> HTTPException:
    return HTTPException(
        status_code=400,
        detail={"error": exc.message, "code": exc.code},
    )


def _edit_error(exc: edit_session.EditError) -> HTTPException:
    return HTTPException(
        status_code=400,
        detail={"error": exc.message, "code": exc.code, "details": exc.details},
    )


@router.get("/font/status")
def font_status():
    try:
        state = font_store.status()
    except font_store.FontStoreError as exc:
        raise _error(exc) from exc
    return {
        "sourcePath": state.source_path,
        "workingPath": state.working_path,
        "sourceBytes": state.source_bytes,
        "workingBytes": state.working_bytes,
        "sourceSha256": state.source_sha256,
        "workingSha256": state.working_sha256,
        "workingMatchesSource": state.working_matches_source,
        "historyCount": state.history_count,
    }


@router.get("/font/working")
def font_working():
    try:
        font_store.ensure_working_copy()
        return FileResponse(
            font_store.WORKING_PATH,
            media_type="application/font-sfnt",
            filename="SebSansVar-working.ttf",
        )
    except font_store.FontStoreError as exc:
        raise _error(exc) from exc


@router.get("/font/source")
def font_source():
    try:
        return FileResponse(
            font_store.SOURCE_PATH,
            media_type="application/font-sfnt",
            filename="SebSansVar-source.ttf",
        )
    except font_store.FontStoreError as exc:
        raise _error(exc) from exc


@router.post("/font/save")
def font_save():
    try:
        history_path = font_store.save_working_to_source()
    except font_store.FontStoreError as exc:
        raise _error(exc) from exc
    return {"ok": True, "historyPath": history_path}


@router.post("/font/discard-working")
def font_discard_working():
    try:
        font_store.discard_working()
    except font_store.FontStoreError as exc:
        raise _error(exc) from exc
    return {"ok": True}


@router.post("/font/ensure-working")
def font_ensure_working():
    try:
        font_store.ensure_working_copy()
        return {"ok": True}
    except font_store.FontStoreError as exc:
        raise _error(exc) from exc


@router.get("/glyphs")
def glyph_catalog():
    try:
        return glyphs.glyph_catalog()
    except Exception as exc:
        raise HTTPException(status_code=500, detail={"error": str(exc), "code": "GLYPH_CATALOG_FAILED"}) from exc


@router.get("/glyphs/{name}/outline")
def glyph_outline(name: str, wght: float = 400, opsz: float = 14):
    try:
        return outlines.get_glyph_outline(name, wght=wght, opsz=opsz)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail={"error": f"Glyph {name} not found", "code": "GLYPH_NOT_FOUND"}) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail={"error": str(exc), "code": "OUTLINE_FAILED"}) from exc


@router.post("/edits/apply")
def edits_apply(body: EditApplyRequest):
    try:
        return edit_session.apply_intent(
            body.intent,
            body.glyphs,
            body.payload,
            confirm_advanced=body.confirmAdvanced,
        )
    except edit_session.EditError as exc:
        raise _edit_error(exc) from exc


@router.post("/edits/preview-batch")
def edits_preview_batch(body: BatchPreviewRequest):
    try:
        return edit_session.preview_batch(body.glyphs, body.payload)
    except edit_session.EditError as exc:
        raise _edit_error(exc) from exc
    except Exception as exc:
        raise HTTPException(status_code=400, detail={"error": str(exc), "code": "PREVIEW_FAILED"}) from exc


@router.post("/edits/undo")
def edits_undo():
    try:
        return edit_session.undo()
    except edit_session.EditError as exc:
        raise _edit_error(exc) from exc


@router.post("/edits/redo")
def edits_redo():
    try:
        return edit_session.redo()
    except edit_session.EditError as exc:
        raise _edit_error(exc) from exc


@router.get("/checks/principles")
def checks_principles(
    glyph: str | None = Query(default=None),
    batchCount: int | None = Query(default=None),
):
    return principles.get_principle_checks(glyph=glyph, batch_count=batchCount)


@router.post("/export/run")
def export_run(body: ExportRunRequest):
    job = export_job.start_export(body.version, body.changelog, use_working=body.useWorking)
    return {"jobId": job.id, "status": job.status}


@router.get("/export/status/{job_id}")
def export_status(job_id: str):
    job = export_job.get_job(job_id)
    if job is None:
        raise HTTPException(status_code=404, detail={"error": "Job not found", "code": "JOB_NOT_FOUND"})
    return {
        "status": job.status,
        "gates": job.gates,
        "zipPath": job.zip_path,
        "checklist": job.checklist,
        "steps": job.steps,
        "error": job.error,
    }
