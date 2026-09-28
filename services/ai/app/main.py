#FastAPI — AI Data Analytics Service
# Phase 1 Foundation: only health check endpoint
# More routes will be added as we implement each feature

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os

from app.routers import health

# Load environment variables
load_dotenv()

# ── Application Setup ─────────────────────────────────────────────────────────
app = FastAPI(
    title="AI Data Analytics Copilot — AI Service",
    description="Python/FastAPI service for data processing, EDA, RAG, and report generation.",
    version="1.0.0",
    docs_url="/docs",       # Swagger UI at http://localhost:8000/docs
    redoc_url="/redoc",     # ReDoc at http://localhost:8000/redoc
)

# ── CORS ──────────────────────────────────────────────────────────────────────
# In production, restrict this to the Node.js API URL only
# We never want the browser calling FastAPI directly
ALLOWED_ORIGINS = [
    os.getenv("NODE_API_URL", "http://localhost:3001"),
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ───────────────────────────────────────────────────────────────────
# Include health router — more routers will be added in future phases
app.include_router(health.router, prefix="/api/v1", tags=["Health"])

# Also expose /health at root level for the Node.js health check proxy
app.include_router(health.router, tags=["Health"])
