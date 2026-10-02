"""
EDA Router — Phase 5
Endpoints:
  GET  /api/v1/datasets/{file_id}/eda/summary    → Automated insights & smart chart recommendations
  POST /api/v1/datasets/{file_id}/eda/aggregate  → Dynamic multi-dimensional aggregation query
"""

import os
from pathlib import Path
from typing import Optional

import pandas as pd
from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from app.services.eda_engine import generate_eda_summary, execute_dynamic_aggregate

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


class AggregateQuery(BaseModel):
    x_col: str = Field(..., description="Column to group by on the X-axis")
    y_col: Optional[str] = Field(None, description="Numeric column to aggregate (optional if agg_func is count)")
    agg_func: str = Field("count", description="Aggregation function: sum, mean, count, min, max, median")
    group_by_col: Optional[str] = Field(None, description="Secondary column for multi-series pivot comparison")
    limit: Optional[int] = Field(20, description="Max categories to return")


@router.get(
    "/datasets/{file_id}/eda/summary",
    summary="Automated EDA summary with statistical insights and recommended visualizations",
)
async def get_eda_summary(file_id: str):
    df, filename = _load_df(file_id)
    summary = generate_eda_summary(df)
    summary["file_id"] = file_id
    summary["filename"] = filename
    return JSONResponse(content=summary)


@router.post(
    "/datasets/{file_id}/eda/aggregate",
    summary="Execute dynamic aggregation query for custom chart visualizer",
)
async def post_eda_aggregate(file_id: str, query: AggregateQuery):
    df, _ = _load_df(file_id)
    try:
        res = execute_dynamic_aggregate(
            df=df,
            x_col=query.x_col,
            y_col=query.y_col,
            agg_func=query.agg_func,
            group_by_col=query.group_by_col,
            limit=query.limit or 20,
        )
        return JSONResponse(content=res)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Aggregation error: {str(e)}")
