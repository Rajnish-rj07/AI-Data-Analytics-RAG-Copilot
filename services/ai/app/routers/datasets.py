# Dataset router — handles file upload, validation, and preview
# This is the ONLY place where raw file data is parsed.
# Node.js forwards the file here; we use Pandas to understand it.

import os
import uuid
import shutil
from pathlib import Path
from typing import Optional

import pandas as pd
import numpy as np
from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse
from app.services.profiler import compute_deep_profile

router = APIRouter()

# Directory where uploaded files are temporarily stored on the AI service
UPLOAD_DIR = Path(os.getenv("UPLOAD_DIR", "./uploads"))
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

# Maximum file size: 50MB
MAX_FILE_SIZE_BYTES = int(os.getenv("MAX_UPLOAD_SIZE_MB", 50)) * 1024 * 1024

# Allowed file extensions
ALLOWED_EXTENSIONS = {".csv", ".xlsx", ".xls"}


def _sanitize_filename(filename: str) -> str:
    """Remove path traversal characters from filename."""
    return Path(filename).name


def _load_dataframe(file_path: Path, extension: str) -> pd.DataFrame:
    """
    Load a file into a Pandas DataFrame based on its extension.
    Raises ValueError if the file cannot be parsed.
    """
    try:
        if extension == ".csv":
            # Try UTF-8 first, fall back to latin-1 for common encoding issues
            try:
                df = pd.read_csv(file_path, encoding="utf-8")
            except UnicodeDecodeError:
                df = pd.read_csv(file_path, encoding="latin-1")
        elif extension in (".xlsx", ".xls"):
            df = pd.read_excel(file_path, engine="openpyxl")
        else:
            raise ValueError(f"Unsupported file type: {extension}")
        return df
    except Exception as e:
        raise ValueError(f"Could not parse file: {str(e)}")


def _get_column_info(df: pd.DataFrame) -> list[dict]:
    """
    Generate per-column metadata.
    We only calculate statistics that make sense for each data type.
    Numerical: min, max, mean, median, std, null count
    Categorical: top value, unique count, null count
    Datetime: min, max, null count
    """
    columns = []
    for col in df.columns:
        series = df[col]
        dtype_str = str(series.dtype)
        null_count = int(series.isnull().sum())
        null_pct = round((null_count / len(df)) * 100, 2) if len(df) > 0 else 0.0

        info = {
            "name": col,
            "dtype": dtype_str,
            "null_count": null_count,
            "null_pct": null_pct,
            "unique_count": int(series.nunique()),
        }

        # Numerical columns
        if pd.api.types.is_numeric_dtype(series):
            non_null = series.dropna()
            if len(non_null) > 0:
                info["min"] = float(non_null.min())
                info["max"] = float(non_null.max())
                info["mean"] = round(float(non_null.mean()), 4)
                info["median"] = round(float(non_null.median()), 4)
                info["std"] = round(float(non_null.std()), 4)

        # Categorical / object columns
        elif pd.api.types.is_object_dtype(series) or pd.api.types.is_categorical_dtype(series):
            top = series.value_counts()
            if len(top) > 0:
                info["top_value"] = str(top.index[0])
                info["top_count"] = int(top.iloc[0])

        # Datetime columns
        elif pd.api.types.is_datetime64_any_dtype(series):
            non_null = series.dropna()
            if len(non_null) > 0:
                info["min"] = str(non_null.min())
                info["max"] = str(non_null.max())

        columns.append(info)
    return columns


def _df_preview(df: pd.DataFrame, n_rows: int = 10) -> list[dict]:
    """
    Return the first N rows as a list of dicts.
    NaN values are converted to None (JSON null) for clean serialization.
    """
    preview = df.head(n_rows).copy()
    # Replace NaN/inf with None for JSON compatibility
    preview = preview.replace({np.nan: None, np.inf: None, -np.inf: None})
    return preview.to_dict(orient="records")


@router.post("/datasets/upload", summary="Upload and validate a dataset file")
async def upload_dataset(file: UploadFile = File(...)):
    """
    Accepts a CSV or XLSX file, validates it, and returns:
    - Basic dataset info (rows, columns, size)
    - Per-column metadata (type, nulls, stats)
    - Preview of the first 10 rows

    The file is saved temporarily. The caller (Node.js) is responsible
    for storing the final dataset metadata in MongoDB.
    """
    # ── Validate filename ────────────────────────────────────────────────
    if not file.filename:
        raise HTTPException(status_code=400, detail="No filename provided.")

    safe_name = _sanitize_filename(file.filename)
    extension = Path(safe_name).suffix.lower()

    if extension not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"File type '{extension}' is not supported. Allowed: CSV, XLSX."
        )

    # ── Read file content and check size ────────────────────────────────
    content = await file.read()

    if len(content) == 0:
        raise HTTPException(status_code=400, detail="The uploaded file is empty.")

    if len(content) > MAX_FILE_SIZE_BYTES:
        max_mb = MAX_FILE_SIZE_BYTES // (1024 * 1024)
        raise HTTPException(
            status_code=400,
            detail=f"File size exceeds the maximum allowed size of {max_mb}MB."
        )

    # ── Save to disk temporarily ─────────────────────────────────────────
    # Use UUID to avoid filename collisions between concurrent uploads
    file_id = str(uuid.uuid4())
    save_path = UPLOAD_DIR / f"{file_id}{extension}"

    try:
        with open(save_path, "wb") as f:
            f.write(content)
    except IOError as e:
        raise HTTPException(status_code=500, detail="Failed to save uploaded file.")

    # ── Parse with Pandas ────────────────────────────────────────────────
    try:
        df = _load_dataframe(save_path, extension)
    except ValueError as e:
        # Clean up the saved file on parse failure
        save_path.unlink(missing_ok=True)
        raise HTTPException(status_code=422, detail=str(e))

    # ── Basic sanity checks ──────────────────────────────────────────────
    if df.empty:
        save_path.unlink(missing_ok=True)
        raise HTTPException(status_code=422, detail="The dataset appears to be empty.")

    if len(df.columns) == 0:
        save_path.unlink(missing_ok=True)
        raise HTTPException(status_code=422, detail="The dataset has no columns.")

    # ── Build response ───────────────────────────────────────────────────
    row_count = len(df)
    col_count = len(df.columns)
    duplicate_count = int(df.duplicated().sum())
    total_missing = int(df.isnull().sum().sum())
    missing_pct = round((total_missing / (row_count * col_count)) * 100, 2) if (row_count * col_count) > 0 else 0.0
    file_size_kb = round(len(content) / 1024, 2)

    # Compute deep statistical profiling
    deep_profile = compute_deep_profile(df)

    return JSONResponse(content={
        "success": True,
        "file_id": file_id,
        "original_filename": safe_name,
        "file_extension": extension,
        "file_size_kb": file_size_kb,
        "summary": {
            "row_count": row_count,
            "column_count": col_count,
            "duplicate_rows": duplicate_count,
            "total_missing_values": total_missing,
            "missing_percentage": missing_pct,
        },
        "columns": _get_column_info(df),
        "preview": _df_preview(df, n_rows=50),
        "column_names": list(df.columns),
        "deep_profile": deep_profile,
    })


@router.get("/datasets/{file_id}/profile", summary="Get deep statistical profile for a dataset")
async def get_dataset_profile(file_id: str):
    """Load an existing uploaded dataset by its file_id and compute its deep profile."""
    # Find file matching file_id in UPLOAD_DIR
    matching_files = list(UPLOAD_DIR.glob(f"{file_id}.*"))
    if not matching_files:
        raise HTTPException(status_code=404, detail="Dataset file not found on AI service.")

    file_path = matching_files[0]
    extension = file_path.suffix.lower()

    try:
        df = _load_dataframe(file_path, extension)
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Could not parse file: {str(e)}")

    deep_profile = compute_deep_profile(df)
    return JSONResponse(content={
        "success": True,
        "file_id": file_id,
        "deep_profile": deep_profile,
    })