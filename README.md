 AI Data Analytics Copilot

> Upload a dataset. Get automated cleaning, EDA, AI insights, and a BI report.

An AI-powered web platform that takes you from raw data to business-ready analysis.

---

## Architecture

`
React (5173) → Node.js/Express (3001) → Python/FastAPI (8000)
                                              ↓
                                    Pandas | ChromaDB | Ollama
                                              ↓
                                          MongoDB
`

## Project Structure

`
ai-data-analytics-copilot/
├── apps/
│   ├── web/          ← React + Vite + Tailwind (frontend)
│   └── api/          ← Node.js + Express (API gateway)
├── services/
│   └── ai/           ← Python + FastAPI (data & AI engine)
├── docs/             ← Architecture, decisions, development notes
├── .env.example      ← Copy to .env and fill values
└── pnpm-workspace.yaml
`

---

## Prerequisites

| Tool | Version | Install |
|---|---|---|
| Node.js | ≥18 | https://nodejs.org |
| Python | ≥3.11 | https://python.org |
| pnpm | ≥8 | 
pm install -g pnpm |
| MongoDB | Any | https://mongodb.com or Atlas free tier |
| Ollama | Latest | https://ollama.com (Phase 6+) |

---

## Setup

### 1. Clone and configure environment

`ash
git clone <repo-url>
cd ai-data-analytics-copilot
cp .env.example apps/api/.env
cp .env.example services/ai/.env
# Edit both .env files with your values
`

### 2. Install Node.js dependencies

`ash
pnpm install
`

### 3. Set up the Python environment

`ash
cd services/ai
python -m venv venv

# Windows:
venv\Scripts\activate

# macOS/Linux:
source venv/bin/activate

pip install -r requirements.txt
`

---

## Running (Development)

Open **three terminal windows**:

### Terminal 1 — React Frontend
`ash
cd apps/web
pnpm dev
# → http://localhost:5173
`

### Terminal 2 — Node.js API
`ash
cd apps/api
node src/app.js
# → http://localhost:3001
`

### Terminal 3 — Python FastAPI
`ash
cd services/ai
venv\Scripts\activate     # Windows
# source venv/bin/activate  # macOS/Linux
uvicorn app.main:app --reload --port 8000
# → http://localhost:8000
# → Swagger docs: http://localhost:8000/docs
`

---

## Verification

After all three services are running:

1. Open http://localhost:5173
2. All three status badges should show green
3. Test the API directly: GET http://localhost:3001/api/v1/health

---

## Development Phases

| Phase | Feature | Status |
|---|---|---|
| 1 | Foundation (React + Node + FastAPI) | ✅ Complete |
| 2 | Dataset Upload & Preview | ✅ Complete |
| 3 | Data Profiling (Deep Analytics) | ✅ Complete |
| 4 | Data Cleaning Assistant | ✅ Complete |
| 5 | EDA Engine & Smart Visuals | ✅ Complete |
| 6 | RAG Analytics | 🔜 Next |
| 7 | BI Reports | ⏳ Planned |
| 8 | Testing + Polish | ⏳ Planned |

---

## Tech Stack

**Frontend:** React 19, Vite 8, Tailwind CSS 4, React Router, TanStack Query, Recharts, Axios

**API:** Node.js 26, Express 5, Mongoose, Axios

**AI Service:** Python 3.13, FastAPI, Pandas, NumPy, Scikit-learn, LangChain, ChromaDB, Ollama

**Database:** MongoDB

---

## Key Principles

- Every technology must solve a concrete problem
- No Redis, Celery, MinIO, or Kafka in V1
- LLM is never used as a calculator — numerical answers come from code
- User always reviews before data is modified
- All secrets in .env, never hardcoded
