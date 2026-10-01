"""
Cleaning router — Phase 4
Two endpoints:
  GET  /api/v1/datasets/{file_id}/cleaning-plan   → Generate plan (read-only, safe)
  POST /api/v1/datasets/{file_id}/clean           → Apply confirmed strategies, return CSV
"""

import io
import os
from pathlib import Path

import numpy as np
import pandas as pd
from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel
from typing import Dict, Optional

from app.services.cleaner import generate_cleaning_plan, apply_cleaning_plan

router = APIRouter()

UPLOAD_DIR = Path(os.getenv("UPLOAD_DIR", "./uploads"))


def _load_df(file_id: str) -> tuple[pd.DataFrame, str]:
    matching = list(UPLOAD_DIR.glob(f"{file_id}.*"))
    if not matching:
        raise HTTPException(status_code=404, detail="Dataset file not found on AI service.")
    path = matching[0]
    ext = path.suffix.lower()
    try:
        if ext == ".csv":
            df = pd.read_csv(path, low_memory=False)
        elif ext in (".xlsx", ".xls"):
            df = pd.read_excel(path)
        else:
            raise HTTPException(status_code=422, detail=f"Unsupported extension: {ext}")
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Could not parse file: {str(e)}")
    return df, path.name


# ── Schema for the apply-clean request ──────────────────────────────────────

class CleaningConfig(BaseModel):
    missing_strategies: Dict[str, str] = {}     # {colName: "mean"|"median"|"mode"|"zero"|"constant_unknown"|"drop_rows"}
    fix_duplicates: bool = False
    outlier_strategies: Dict[str, str] = {}     # {colName: "cap"|"drop_rows"|"keep"}
    outlier_bounds: Dict[str, Dict] = {}        # {colName: {lower_bound, upper_bound}}
    export_format: Optional[str] = "csv"        # "csv" only in Phase 4


# ── GET /api/v1/datasets/{file_id}/cleaning-plan ─────────────────────────────

@router.get(
    "/datasets/{file_id}/cleaning-plan",
    summary="Generate a data cleaning plan for a dataset (read-only, no modifications)",
)
async def get_cleaning_plan(file_id: str):
    df, filename = _load_df(file_id)
    plan = generate_cleaning_plan(df)
    return JSONResponse(content={
        "success": True,
        "file_id": file_id,
        "filename": filename,
        "cleaning_plan": plan,
    })


# ── POST /api/v1/datasets/{file_id}/clean ────────────────────────────────────

@router.post(
    "/datasets/{file_id}/clean",
    summary="Apply a user-confirmed cleaning plan and return the cleaned CSV",
)
async def apply_clean(file_id: str, config: CleaningConfig):
    df, filename = _load_df(file_id)

    # Validate that all referenced columns exist
    all_cols = set(df.columns)
    bad_cols = (set(config.missing_strategies) | set(config.outlier_strategies)) - all_cols
    if bad_cols:
        raise HTTPException(status_code=422, detail=f"Unknown columns: {sorted(bad_cols)}")

    result = apply_cleaning_plan(
        df=df,
        missing_strategies=config.missing_strategies,
        fix_duplicates=config.fix_duplicates,
        outlier_strategies=config.outlier_strategies,
        outlier_bounds=config.outlier_bounds,
    )

    cleaned_df: pd.DataFrame = result.pop("cleaned_df")

    # ── Build CSV in-memory for download ────────────────────────────────────
    buf = io.BytesIO()
    cleaned_df.to_csv(buf, index=False)
    buf.seek(0)
    csv_bytes = buf.getvalue()

    # Base name for download
    stem = Path(filename).stem
    download_name = f"{stem}_cleaned.csv"

    # ── Return JSON summary + base64 CSV payload in one response ─────────────
    # (so frontend can both show the diff AND trigger download)
    import base64
    result["csv_b64"] = base64.b64encode(csv_bytes).decode("utf-8")
    result["download_filename"] = download_name
    result["total_changes"] = len(result["change_log"])

    return JSONResponse(content=result)
