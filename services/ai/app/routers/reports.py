"""
BI Reports Router — Phase 7
━━━━━━━━━━━━━━━━━━━━━━━━━━━
Endpoints:
  POST /api/v1/datasets/{file_id}/report   → Generates a complete Business Intelligence report
"""

import os
from pathlib import Path
from typing import Optional

import pandas as pd
from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from app.services.report_engine import generate_bi_report

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


class ReportRequest(BaseModel):
    title: Optional[str] = Field(None, description="Optional custom report title")
    subtitle: Optional[str] = Field(None, description="Optional custom report subtitle")
    author: Optional[str] = Field(None, description="Optional author or department name")
    original_name: Optional[str] = Field(None, description="Original filename of the dataset")
    primary_metric: Optional[str] = Field(None, description="Specific numerical column to profile")
    primary_cat: Optional[str] = Field(None, description="Specific categorical column to slice by")
    user_notes: Optional[str] = Field(None, description="Custom executive directives or business context")


@router.post(
    "/datasets/{file_id}/report",
    summary="Generate a comprehensive Business Intelligence report for a dataset",
)
async def generate_report_endpoint(file_id: str, body: Optional[ReportRequest] = None):
    df, filename = _load_df(file_id)
    try:
        orig_name = body.original_name if body and body.original_name else filename
        report = generate_bi_report(
            df=df,
            file_id=file_id,
            original_name=orig_name,
            custom_title=body.title if body else None,
            subtitle=body.subtitle if body else None,
            author=body.author if body else None,
            primary_metric=body.primary_metric if body else None,
            primary_cat=body.primary_cat if body else None,
            user_notes=body.user_notes if body else None,
        )
        return JSONResponse(content=report)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Report generation failed: {str(e)}")

