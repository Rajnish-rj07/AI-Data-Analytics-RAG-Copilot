#FastAPI - AI Data Analytics Service
# Phase 1 Foundation: only health check endpoint
# More routes will be added as we implement each feature

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os

from app.routers import health
from app.routers import datasets
from app.routers import cleaning
from app.routers import eda

load_dotenv()

app = FastAPI(
    title="AI Data Analytics Copilot - AI Service",
    description="Python/FastAPI service for data processing, EDA, RAG, and report generation.",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

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

# Health check (root level for Node proxy + versioned)
app.include_router(health.router, tags=["Health"])
app.include_router(health.router, prefix="/api/v1", tags=["Health"])

# Dataset upload and validation (Phase 2)
app.include_router(datasets.router, prefix="/api/v1", tags=["Datasets"])

# Data cleaning assistant (Phase 4)
app.include_router(cleaning.router, prefix="/api/v1", tags=["Cleaning"])

# Automated EDA Engine & Smart Visualizations (Phase 5)
app.include_router(eda.router, prefix="/api/v1", tags=["EDA"])