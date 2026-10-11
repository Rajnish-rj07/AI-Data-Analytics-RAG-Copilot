"""
RAG Router — Phase 6
Three endpoints:
  POST /api/v1/datasets/{file_id}/rag/index    → Build & persist the vector index for a dataset
  GET  /api/v1/datasets/{file_id}/rag/status   → Check if this dataset is indexed
  POST /api/v1/datasets/{file_id}/rag/ask      → Ask a natural-language question
"""

import os
from pathlib import Path

import pandas as pd
from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from app.services.rag_engine import index_dataset, answer_question, _get_chroma_client
import re

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


def _safe_collection_name(file_id: str) -> str:
    safe = re.sub(r"[^a-zA-Z0-9_-]", "_", file_id)[:63]
    if not safe[0].isalpha():
        safe = "c_" + safe
    return safe


class AskRequest(BaseModel):
    question: str = Field(..., min_length=3, max_length=500,
                          description="Natural-language question about the dataset")
    top_k: int = Field(4, ge=1, le=10, description="Number of context chunks to retrieve")


# ── POST /api/v1/datasets/{file_id}/rag/index ─────────────────────────────────

@router.post(
    "/datasets/{file_id}/rag/index",
    summary="Index a dataset into the ChromaDB vector store for semantic Q&A",
)
async def rag_index(file_id: str):
    df, filename = _load_df(file_id)
    try:
        stats = index_dataset(df=df, file_id=file_id)
        return JSONResponse(content={
            "success": True,
            "file_id": file_id,
            "filename": filename,
            "message": f"Dataset indexed successfully. {stats['indexed']} knowledge chunks embedded.",
            "stats": stats,
        })
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Indexing failed: {str(e)}")


# ── GET /api/v1/datasets/{file_id}/rag/status ────────────────────────────────

@router.get(
    "/datasets/{file_id}/rag/status",
    summary="Check if a dataset has been indexed in the vector store",
)
async def rag_status(file_id: str):
    try:
        client = _get_chroma_client()
        safe_id = _safe_collection_name(file_id)
        existing = [c.name for c in client.list_collections()]
        is_indexed = safe_id in existing

        chunk_count = 0
        if is_indexed:
            col = client.get_collection(name=safe_id)
            chunk_count = col.count()

        return JSONResponse(content={
            "success": True,
            "file_id": file_id,
            "is_indexed": is_indexed,
            "chunk_count": chunk_count,
        })
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Status check failed: {str(e)}")


# ── POST /api/v1/datasets/{file_id}/rag/ask ──────────────────────────────────

@router.post(
    "/datasets/{file_id}/rag/ask",
    summary="Ask a natural-language question about a dataset and get a cited answer",
)
async def rag_ask(file_id: str, body: AskRequest):
    df, _ = _load_df(file_id)
    try:
        result = answer_question(
            question=body.question,
            df=df,
            file_id=file_id,
            top_k=body.top_k,
        )
        return JSONResponse(content={"success": True, **result})
    except ValueError as e:
        raise HTTPException(status_code=409, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Q&A failed: {str(e)}")
