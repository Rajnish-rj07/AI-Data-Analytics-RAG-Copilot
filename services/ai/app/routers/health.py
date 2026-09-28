# Health check router for the FastAPI AI service

from fastapi import APIRouter
from datetime import datetime, timezone
import sys
import os

router = APIRouter()


@router.get("/health", summary="Health Check")
async def health_check():
    """
    Returns the health status of the FastAPI AI service.
    Called by the Node.js API to verify the AI service is running.
    """
    return {
        "success": True,
        "message": "FastAPI AI service is running",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "python_version": sys.version,
        "environment": os.getenv("ENVIRONMENT", "development"),
    }
