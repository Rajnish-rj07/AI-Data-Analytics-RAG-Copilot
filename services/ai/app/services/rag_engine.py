"""
RAG Analytics Engine — Phase 6
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Strategy:
  1. INDEX  – Convert dataset schema, column stats, and computed analytics
              into natural-language text chunks and embed with sentence-transformers
              (all-MiniLM-L6-v2, runs CPU-only, no GPU needed).
  2. RETRIEVE – Semantic k-NN search with ChromaDB (local, in-process, no server).
  3. ANSWER  – LLM-free intelligent answerer that:
               • Classifies the question type (statistical, categorical, trend, count, etc.)
               • Extracts numbers from retrieved chunks
               • Uses Pandas on the actual DataFrame for precision
               • Formats a rich, cited answer with supporting evidence chunks

  "LLM is never used as a calculator — numerical answers come from code" (RULE #4)
"""

from __future__ import annotations

import hashlib
import json
import os
import re
import urllib.request
import urllib.error
from pathlib import Path
from typing import Any, Dict, List, Optional

import numpy as np
import pandas as pd

# ─── Lazy client / model factories (fast startup without import lag) ───────────
_CHROMA_DIR = Path(__file__).parent.parent.parent / "chroma_store"
_CHROMA_DIR.mkdir(parents=True, exist_ok=True)

_chroma_client: Optional[Any] = None
_embed_model: Optional[Any] = None


def _get_chroma_client():
    global _chroma_client
    if _chroma_client is None:
        try:
            import chromadb
            from chromadb.config import Settings
            _chroma_client = chromadb.PersistentClient(
                path=str(_CHROMA_DIR),
                settings=Settings(anonymized_telemetry=False),
            )
        except ImportError:
            raise RuntimeError("chromadb is not installed. Run: pip install chromadb")
    return _chroma_client


def _get_embed_model():
    global _embed_model
    if _embed_model is None:
        try:
            from sentence_transformers import SentenceTransformer
            # all-MiniLM-L6-v2 — 22 MB, fast CPU inference, 384-dim embeddings
            _embed_model = SentenceTransformer("all-MiniLM-L6-v2")
        except ImportError:
            raise RuntimeError("sentence-transformers is not installed. Run: pip install sentence-transformers")
    return _embed_model


# ─────────────────────────────────────────────────────────────────────────────
# Text chunk builders — convert structured data → natural language sentences
# ─────────────────────────────────────────────────────────────────────────────

def _build_dataset_overview_chunk(df: pd.DataFrame, file_id: str) -> Dict[str, str]:
    n_rows, n_cols = df.shape
    num_cols = df.select_dtypes(include="number").columns.tolist()
    cat_cols = df.select_dtypes(exclude="number").columns.tolist()
    missing = int(df.isnull().sum().sum())
    dup = int(df.duplicated().sum())

    text = (
        f"Dataset overview: The dataset has {n_rows} rows and {n_cols} columns. "
        f"There are {len(num_cols)} numerical columns: {', '.join(num_cols) if num_cols else 'none'}. "
        f"There are {len(cat_cols)} categorical columns: {', '.join(cat_cols) if cat_cols else 'none'}. "
        f"Total missing values: {missing}. Duplicate rows: {dup}."
    )
    return {
        "id": f"{file_id}__overview",
        "text": text,
        "metadata": json.dumps({"file_id": file_id, "type": "overview"}),
    }


def _build_column_chunks(df: pd.DataFrame, file_id: str) -> List[Dict[str, str]]:
    chunks = []
    for col in df.columns:
        series = df[col].dropna()
        dtype_str = str(df[col].dtype)
        n_null = int(df[col].isnull().sum())
        n_unique = int(df[col].nunique())

        if pd.api.types.is_numeric_dtype(df[col]) and len(series) > 0:
            mn = round(float(series.min()), 4)
            mx = round(float(series.max()), 4)
            mean = round(float(series.mean()), 4)
            median = round(float(series.median()), 4)
            std = round(float(series.std()), 4)
            skew = round(float(series.skew()), 3) if len(series) > 2 else 0.0
            text = (
                f"Column '{col}' (numeric, {dtype_str}): "
                f"min={mn}, max={mx}, mean={mean}, median={median}, std={std}, skewness={skew}. "
                f"Missing values: {n_null}. Unique values: {n_unique}."
            )
        else:
            top_vals = df[col].value_counts().head(5)
            top_str = ", ".join(f"'{k}' ({v})" for k, v in top_vals.items())
            text = (
                f"Column '{col}' (categorical, {dtype_str}): "
                f"{n_unique} unique values. Top values: {top_str}. "
                f"Missing values: {n_null}."
            )

        chunks.append({
            "id": f"{file_id}__col__{col}",
            "text": text,
            "metadata": json.dumps({"file_id": file_id, "type": "column", "column": col}),
        })
    return chunks


def _build_correlation_chunks(df: pd.DataFrame, file_id: str) -> List[Dict[str, str]]:
    num_cols = df.select_dtypes(include="number").columns.tolist()
    chunks = []
    if len(num_cols) < 2:
        return chunks

    try:
        corr = df[num_cols].corr()
        pairs = []
        for i, c1 in enumerate(num_cols):
            for j, c2 in enumerate(num_cols):
                if i < j:
                    r = float(corr.loc[c1, c2])
                    if not (pd.isna(r) or np.isinf(r)):
                        pairs.append((c1, c2, round(r, 3)))

        # Top 5 strongest correlations
        pairs.sort(key=lambda x: abs(x[2]), reverse=True)
        for c1, c2, r in pairs[:5]:
            direction = "positively" if r > 0 else "negatively"
            strength = "strongly" if abs(r) >= 0.7 else "moderately" if abs(r) >= 0.4 else "weakly"
            text = (
                f"Correlation analysis: Column '{c1}' and column '{c2}' are {strength} {direction} "
                f"correlated with Pearson r = {r}. "
                + (f"Higher values of {c1} tend to be associated with higher values of {c2}." if r > 0
                   else f"Higher values of {c1} tend to be associated with lower values of {c2}.")
            )
            chunks.append({
                "id": f"{file_id}__corr__{c1}__{c2}",
                "text": text,
                "metadata": json.dumps({"file_id": file_id, "type": "correlation", "columns": [c1, c2]}),
            })
    except Exception:
        pass
    return chunks


def _build_aggregation_chunks(df: pd.DataFrame, file_id: str) -> List[Dict[str, str]]:
    """Build grouped-aggregation insight chunks (top performer per category)."""
    chunks = []
    num_cols = df.select_dtypes(include="number").columns.tolist()
    cat_cols = [c for c in df.select_dtypes(exclude="number").columns
                if 2 <= df[c].nunique() <= 20]

    for cat in cat_cols[:3]:
        for num in num_cols[:3]:
            try:
                grouped = df.groupby(cat)[num].agg(["sum", "mean", "count"]).round(4)
                top_sum = grouped["sum"].idxmax()
                top_mean = grouped["mean"].idxmax()
                total_sum = round(float(grouped["sum"].sum()), 2)

                rows = []
                for grp, row in grouped.iterrows():
                    pct = round(float(row["sum"]) / total_sum * 100, 1) if total_sum > 0 else 0
                    rows.append(f"'{grp}': total={row['sum']}, avg={row['mean']:.2f}, count={int(row['count'])}, share={pct}%")

                text = (
                    f"Aggregation — {num} grouped by {cat}: "
                    f"Highest total by '{top_sum}'. Highest average by '{top_mean}'. "
                    f"Breakdown: {'; '.join(rows)}."
                )
                chunks.append({
                    "id": f"{file_id}__agg__{cat}__{num}",
                    "text": text,
                    "metadata": json.dumps({"file_id": file_id, "type": "aggregation",
                                            "cat_col": cat, "num_col": num}),
                })
            except Exception:
                pass
    return chunks


# ─────────────────────────────────────────────────────────────────────────────
# Index a dataset into ChromaDB
# ─────────────────────────────────────────────────────────────────────────────

def index_dataset(df: pd.DataFrame, file_id: str) -> Dict[str, Any]:
    """
    Embed all text chunks for a dataset and upsert into ChromaDB.
    Uses file_id as the ChromaDB collection name (sanitised).
    Returns indexing stats.
    """
    model = _get_embed_model()
    client = _get_chroma_client()

    # Sanitise collection name (ChromaDB allows only [a-zA-Z0-9_-])
    safe_id = re.sub(r"[^a-zA-Z0-9_-]", "_", file_id)[:63]
    if not safe_id[0].isalpha():
        safe_id = "c_" + safe_id

    # Delete existing collection if re-indexing
    try:
        client.delete_collection(name=safe_id)
    except Exception:
        pass

    collection = client.create_collection(
        name=safe_id,
        metadata={"hnsw:space": "cosine"},
    )

    # Build all chunks
    chunks: List[Dict] = []
    chunks.append(_build_dataset_overview_chunk(df, file_id))
    chunks.extend(_build_column_chunks(df, file_id))
    chunks.extend(_build_correlation_chunks(df, file_id))
    chunks.extend(_build_aggregation_chunks(df, file_id))

    if not chunks:
        return {"indexed": 0, "collection": safe_id}

    # Embed in batch
    texts = [c["text"] for c in chunks]
    embeddings = model.encode(texts, normalize_embeddings=True, show_progress_bar=False).tolist()

    collection.upsert(
        ids=[c["id"] for c in chunks],
        embeddings=embeddings,
        documents=texts,
        metadatas=[json.loads(c["metadata"]) for c in chunks],
    )

    return {
        "indexed": len(chunks),
        "collection": safe_id,
        "chunk_types": {
            "overview": 1,
            "columns": len([c for c in chunks if json.loads(c["metadata"])["type"] == "column"]),
            "correlations": len([c for c in chunks if json.loads(c["metadata"])["type"] == "correlation"]),
            "aggregations": len([c for c in chunks if json.loads(c["metadata"])["type"] == "aggregation"]),
        },
    }


# ─────────────────────────────────────────────────────────────────────────────
# Analytical Question Answerer & Natural Language Copilot Engine
# ─────────────────────────────────────────────────────────────────────────────

_QUESTION_PATTERNS = {
    "greeting":     [r"\bhi\b", r"\bhello\b", r"\bhey\b", r"\bwho are you\b", r"\bwhat can you do\b", r"\bhelp me\b", r"\bhow to use\b", r"\bwhat is your role\b"],
    "suggestion":   [r"\bsuggest\b", r"\brecommend\b", r"\bimprove\b", r"\benhance\b", r"\bbetter\b", r"\badvice\b", r"\btips\b", r"\bwhat should\b", r"\bhow to make\b", r"\baction\b", r"\bnext step\b", r"\broadmap\b", r"\boptimis\b", r"\boptimiz\b"],
    "business":     [r"\bbusiness\b", r"\bstrategy\b", r"\bgrowth\b", r"\bprofit\b", r"\brevenue\b", r"\bsales\b", r"\bmarket\b", r"\bpricing\b", r"\bmargin\b", r"\bcommercial\b", r"\bmonetiz\b", r"\bmonetise\b", r"\bchurn\b", r"\bopportunit\b", r"\bleakage\b", r"\broi\b"],
    "cleaning":     [r"\bclean\b", r"\bpreprocess\b", r"\bhandle missing\b", r"\bdata quality\b", r"\bfix\b", r"\bsanitize\b", r"\bprepare\b", r"\bhygiene\b", r"\bdirty\b", r"\bimput\b"],
    "ml":           [r"\bmachine learning\b", r"\bml\b", r"\bmodel\b", r"\bpredict\b", r"\btrain\b", r"\bfeatures?\b", r"\balgorithm\b", r"\bclassification\b", r"\bregression\b", r"\bforecast\b", r"\btarget variable\b"],
    "eda":          [r"\bvisualiz\b", r"\bchart\b", r"\bgraph\b", r"\bplot\b", r"\bhypothesis\b", r"\bhypotheses\b", r"\bexplore\b", r"\bpattern\b", r"\btrend\b", r"\binspect\b"],
    "summary":      [r"\bsummar\b", r"\boverview\b", r"\btakeaways?\b", r"\bkey findings?\b", r"\btell me about\b", r"\bwhat is this\b", r"\bexecutive\b", r"\bhigh level\b", r"\bbrief\b"],
    "ranking":      [r"\bbest\b", r"\bworst\b", r"\bleading\b", r"\blowest\b", r"\bhighest\b", r"\bmost\b", r"\bleast\b", r"\bbottom\b", r"\brank\b", r"\bwinner\b", r"\bloser\b", r"\bperformer\b", r"\bcompare\b", r"\bcomparison\b"],
    "relationship": [r"\bcorrelat\b", r"\brelationship\b", r"\bdepend\b", r"\baffect\b", r"\bimpact\b", r"\binfluence\b", r"\bconnection\b", r"\blink\b", r"\bassociation\b", r"\bvs\b", r"\bversus\b"],
    "max":          [r"\bmax\b", r"\bhighest\b", r"\blargest\b", r"\bmost\b", r"\bgreatest\b", r"\bpeak\b"],
    "min":          [r"\bmin\b", r"\blowest\b", r"\bsmallest\b", r"\bleast\b", r"\bbottom\b", r"\btrough\b"],
    "mean":         [r"\baverage\b", r"\bmean\b", r"\btypical\b"],
    "median":       [r"\bmedian\b"],
    "count":        [r"\bhow many\b", r"\bcount\b", r"\bnumber of\b", r"\btotal records\b"],
    "sum":          [r"\btotal\b", r"\bsum\b", r"\baggregate\b", r"\bcumulative\b"],
    "distribution": [r"\bdistribution\b", r"\bspread\b", r"\brange\b", r"\bskew\b", r"\bvariance\b", r"\bstd\b", r"\bstandard deviation\b"],
    "outlier":      [r"\boutlier\b", r"\banomaly\b", r"\bextreme\b", r"\babnormal\b", r"\bunusual\b", r"\brisks?\b"],
    "missing":      [r"\bmissing\b", r"\bnull\b", r"\bna\b", r"\bempty\b", r"\bblank\b"],
    "unique":       [r"\bunique\b", r"\bdistinct\b", r"\bdifferent\b"],
}

def _classify_intent(question: str) -> List[str]:
    q_lower = question.lower()
    intents = []
    for intent, patterns in _QUESTION_PATTERNS.items():
        if any(re.search(p, q_lower) for p in patterns):
            intents.append(intent)
    return intents or ["general"]


def _extract_columns_from_question(question: str, df_cols: List[str]) -> List[str]:
    q_lower = question.lower()
    found = []
    # Match both exact name and spaces instead of underscores
    for col in sorted(df_cols, key=len, reverse=True):
        col_clean = col.lower()
        col_spaced = col.replace("_", " ").lower()
        if col_clean in q_lower or col_spaced in q_lower:
            if col not in found:
                found.append(col)
    return found


def _profile_dataset(df: pd.DataFrame) -> Dict[str, Any]:
    """Universal statistical and semantic profiler for any dataset."""
    n_rows, n_cols = df.shape
    num_cols = df.select_dtypes(include="number").columns.tolist()
    cat_cols = df.select_dtypes(exclude="number").columns.tolist()

    # Missing and duplicates
    null_counts = df.isnull().sum()
    null_cols = null_counts[null_counts > 0].to_dict()
    total_nulls = int(null_counts.sum())
    n_dupes = int(df.duplicated().sum())

    # IQR Outliers
    outliers = {}
    skewed_cols = {}
    for c in num_cols:
        series = df[c].dropna()
        if len(series) > 4:
            q25, q75 = series.quantile(0.25), series.quantile(0.75)
            iqr = q75 - q25
            if iqr > 0:
                n_out = int(((series < (q25 - 1.5 * iqr)) | (series > (q75 + 1.5 * iqr))).sum())
                if n_out > 0:
                    outliers[c] = n_out
            sk = series.skew()
            if not pd.isna(sk) and abs(sk) > 1.0:
                skewed_cols[c] = round(float(sk), 2)

    # Correlations
    correlations = []
    if len(num_cols) >= 2:
        try:
            corr_mat = df[num_cols].corr()
            for i, c1 in enumerate(num_cols):
                for j, c2 in enumerate(num_cols):
                    if i < j:
                        r = float(corr_mat.loc[c1, c2])
                        if not (pd.isna(r) or np.isinf(r)):
                            correlations.append((c1, c2, round(r, 3)))
            correlations.sort(key=lambda x: abs(x[2]), reverse=True)
        except Exception:
            pass

    # Primary monetary / volume metric detection
    primary_metric = None
    metric_keywords = ["revenue", "sales", "spend", "charges", "amount", "profit", "price", "cost", "total", "balance", "value", "count_phenotypes"]
    for kw in metric_keywords:
        for c in num_cols:
            if kw in c.lower():
                primary_metric = c
                break
        if primary_metric:
            break
    if not primary_metric and num_cols:
        # Fall back to numeric column with highest positive mean
        try:
            means = {c: df[c].dropna().mean() for c in num_cols if df[c].dropna().mean() > 0}
            primary_metric = max(means, key=means.get) if means else num_cols[0]
        except Exception:
            primary_metric = num_cols[0]

    # Secondary metric
    secondary_metric = None
    remaining_num = [c for c in num_cols if c != primary_metric]
    secondary_keywords = ["quantity", "units", "discount", "margin", "tickets", "tenure", "logins", "rating", "score"]
    for kw in secondary_keywords:
        for c in remaining_num:
            if kw in c.lower():
                secondary_metric = c
                break
        if secondary_metric:
            break
    if not secondary_metric and remaining_num:
        secondary_metric = remaining_num[0]

    # Primary categorical dimension detection
    primary_category = None
    cat_keywords = ["category", "tier", "plan", "region", "segment", "type", "status", "country", "product", "sub_category", "contract", "species"]
    for kw in cat_keywords:
        for c in cat_cols:
            if kw in c.lower():
                primary_category = c
                break
        if primary_category:
            break
    if not primary_category:
        candidates = [c for c in cat_cols if 2 <= df[c].nunique() <= 30]
        primary_category = candidates[0] if candidates else (cat_cols[0] if cat_cols else None)

    # Target / outcome candidate detection
    target_candidate = None
    target_keywords = ["churn", "churned", "return_status", "status", "rating", "default", "fraud", "label", "target", "outcome", "survived"]
    for kw in target_keywords:
        for c in df.columns:
            if kw in c.lower():
                target_candidate = c
                break
        if target_candidate:
            break

    # Dataset health score (100 base)
    health_score = 100
    if total_nulls > 0:
        health_score -= min(25, int((total_nulls / max(1, n_rows * n_cols)) * 100 * 2) + 5)
    if n_dupes > 0:
        health_score -= min(20, n_dupes * 5)
    if outliers:
        health_score -= min(15, len(outliers) * 4)
    health_score = max(35, min(100, health_score))

    return {
        "n_rows": n_rows,
        "n_cols": n_cols,
        "num_cols": num_cols,
        "cat_cols": cat_cols,
        "null_cols": null_cols,
        "total_nulls": total_nulls,
        "n_dupes": n_dupes,
        "outliers": outliers,
        "skewed_cols": skewed_cols,
        "correlations": correlations,
        "primary_metric": primary_metric,
        "secondary_metric": secondary_metric,
        "primary_category": primary_category,
        "target_candidate": target_candidate,
        "health_score": health_score,
    }


def _call_external_llm(question: str, df: pd.DataFrame, retrieved_chunks: List[Dict]) -> Optional[str]:
    """
    Attempt to query external LLMs (Groq, OpenAI, Gemini, or Ollama) if configured.
    Returns None on failure or if no service is configured.
    """
    groq_key = os.getenv("GROQ_API_KEY", "").strip()
    openai_key = os.getenv("OPENAI_API_KEY", "").strip()
    gemini_key = os.getenv("GEMINI_API_KEY", "").strip()
    ollama_url = os.getenv("OLLAMA_BASE_URL", "").strip()

    if not (groq_key or openai_key or gemini_key or ollama_url):
        return None

    n_rows, n_cols = df.shape
    cols_preview = ", ".join(f"{c} ({df[c].dtype})" for c in df.columns[:16])
    context_text = "\n".join(f"- {c['text']}" for c in retrieved_chunks[:6])

    system_prompt = (
        "You are the AI Data Analytics Copilot — a senior principal data scientist, "
        "machine learning architect, and strategic business intelligence advisor.\n"
        "Your role is to assist the user by answering ANY natural-language questions about their dataset, "
        "including high-level suggestions, data quality improvements, business strategy, "
        "feature engineering, statistical evaluations, and exploratory analysis.\n\n"
        "Guidelines:\n"
        "• Be sharp, highly articulate, conversational, and direct.\n"
        "• Use rich Markdown formatting (clear headings, bullet points, bold key metrics).\n"
        "• Ground your answers in the provided dataset facts.\n"
        "• When the user asks for suggestions or improvements, give prioritized, actionable steps with specific column names."
    )

    user_prompt = (
        f"DATASET CONTEXT:\n"
        f"• Dimensions: {n_rows} rows × {n_cols} columns\n"
        f"• Columns: {cols_preview}\n"
        f"• Top Relevant Statistical Chunks:\n{context_text}\n\n"
        f"USER QUESTION: {question}\n\n"
        f"Provide your expert response:"
    )

    # 1. Groq
    if groq_key:
        try:
            req_data = json.dumps({
                "model": "llama-3.3-70b-versatile",
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                "temperature": 0.3,
                "max_tokens": 1024,
            }).encode("utf-8")
            req = urllib.request.Request(
                "https://api.groq.com/openai/v1/chat/completions",
                data=req_data,
                headers={"Authorization": f"Bearer {groq_key}", "Content-Type": "application/json"},
                method="POST"
            )
            with urllib.request.urlopen(req, timeout=8) as resp:
                res = json.loads(resp.read().decode("utf-8"))
                return res["choices"][0]["message"]["content"].strip()
        except Exception:
            pass

    # 2. OpenAI
    if openai_key:
        try:
            req_data = json.dumps({
                "model": "gpt-4o-mini",
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                "temperature": 0.3,
                "max_tokens": 1024,
            }).encode("utf-8")
            req = urllib.request.Request(
                "https://api.openai.com/v1/chat/completions",
                data=req_data,
                headers={"Authorization": f"Bearer {openai_key}", "Content-Type": "application/json"},
                method="POST"
            )
            with urllib.request.urlopen(req, timeout=10) as resp:
                res = json.loads(resp.read().decode("utf-8"))
                return res["choices"][0]["message"]["content"].strip()
        except Exception:
            pass

    # 3. Gemini
    if gemini_key:
        try:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={gemini_key}"
            req_data = json.dumps({
                "contents": [{"parts": [{"text": f"{system_prompt}\n\n{user_prompt}"}]}],
            }).encode("utf-8")
            req = urllib.request.Request(url, data=req_data, headers={"Content-Type": "application/json"}, method="POST")
            with urllib.request.urlopen(req, timeout=10) as resp:
                res = json.loads(resp.read().decode("utf-8"))
                return res["candidates"][0]["content"]["parts"][0]["text"].strip()
        except Exception:
            pass

    # 4. Ollama
    if ollama_url:
        try:
            model_name = os.getenv("OLLAMA_MODEL", "llama3.2")
            req_data = json.dumps({
                "model": model_name,
                "prompt": f"{system_prompt}\n\n{user_prompt}",
                "stream": False,
            }).encode("utf-8")
            req = urllib.request.Request(
                f"{ollama_url.rstrip('/')}/api/generate",
                data=req_data,
                headers={"Content-Type": "application/json"},
                method="POST"
            )
            with urllib.request.urlopen(req, timeout=10) as resp:
                res = json.loads(resp.read().decode("utf-8"))
                return res["response"].strip()
        except Exception:
            pass

    return None


# ─────────────────────────────────────────────────────────────────────────────
# Autonomous Natural Language Advisory Handlers (Dataset-Agnostic, Zero-API Key)
# ─────────────────────────────────────────────────────────────────────────────

def _generate_greeting_response(df: pd.DataFrame, prof: Dict[str, Any], question: str) -> str:
    cols_preview = ", ".join(f"`{c}`" for c in df.columns[:6])
    more_count = max(0, prof["n_cols"] - 6)
    more_str = f" and {more_count} more" if more_count > 0 else ""

    lines = [
        "### 👋 Hello! I'm your AI Data Analytics Copilot\n",
        f"I've indexed and profiled your dataset containing **{prof['n_rows']:,} records** across **{prof['n_cols']} attributes**.",
        f"Key columns include {cols_preview}{more_str}.\n",
        "**Here is what you can ask me right now:**\n",
        "• **Suggestions & Improvements:** *\"What suggestions and improvements do you recommend for this dataset?\"*",
        "• **Business Strategy & Growth:** *\"What business strategy should I follow based on this data?\"*",
        "• **Machine Learning Feasibility:** *\"Can I train a machine learning model on this data?\"*",
        "• **Exploratory Hypotheses:** *\"Suggest data exploration hypotheses and charts to build.\"*",
        f"• **Exact Statistical Queries:** *\"What is the average {prof['primary_metric'] or df.columns[0]}?\"*",
        "\nFeel free to type any natural language question into the prompt bar below!"
    ]
    return "\n".join(lines)


def _generate_improvement_suggestions(df: pd.DataFrame, prof: Dict[str, Any], question: str, retrieved_chunks: List[Dict]) -> str:
    n_rows, n_cols = prof["n_rows"], prof["n_cols"]
    health = prof["health_score"]
    health_verdict = (
        "Strong foundation with minor hygiene actions" if health >= 85
        else "Solid dataset with targeted data quality interventions needed" if health >= 70
        else "Moderate data hygiene required before downstream machine learning modeling"
    )

    lines = [
        "### 📊 Comprehensive Data Quality & Improvement Roadmap\n",
        f"**Dataset Health Assessment:** **{health} / 100** — *{health_verdict}*.\n",
        "---",
        "#### 1. 🛠️ Critical Data Hygiene & Cleansing Priorities",
    ]

    # Null values
    if prof["null_cols"]:
        lines.append("• **Missing Values Remediation:**")
        for col, cnt in prof["null_cols"].items():
            pct = round(cnt / n_rows * 100, 1)
            is_num = col in prof["num_cols"]
            strategy = (
                "Median imputation (recommended due to skewness/outliers)"
                if (is_num and col in prof["skewed_cols"])
                else "Mean imputation" if is_num else "Mode / 'Unknown' category sentinel"
            )
            lines.append(f"  - Column **`{col}`**: {cnt} missing ({pct}%). *Strategy:* {strategy}.")
    else:
        lines.append("• **Missing Values:** Zero missing values detected across all columns (Clean schema).")

    # Duplicates
    if prof["n_dupes"] > 0:
        lines.append(f"• **Deduplication:** Found **{prof['n_dupes']} duplicate records**. Recommend dropping duplicates via `df.drop_duplicates()` to avoid skewed aggregations.")
    else:
        lines.append("• **Deduplication:** No duplicate records detected.")

    # Outliers
    if prof["outliers"]:
        outlier_strs = [f"`{c}` ({cnt} rows outside 1.5×IQR)" for c, cnt in list(prof["outliers"].items())[:4]]
        lines.append(f"• **Outlier Management:** Extreme values detected in {', '.join(outlier_strs)}. Consider Winsorization (95th/99th percentile cap) or robust scaling.")
    else:
        lines.append("• **Outlier Management:** No severe IQR anomalies detected across continuous features.")

    lines.extend([
        "\n---",
        "#### 2. 💡 Feature Engineering Recommendations",
    ])

    fe_count = 0
    # Ratio / interaction feature between primary & secondary numeric metrics
    pm, sm = prof["primary_metric"], prof["secondary_metric"]
    if pm and sm and pm != sm:
        lines.append(f"• **Normalized Ratio:** Compute `{pm}_Per_{sm} = {pm} / ({sm} + 1e-5)` to analyze per-unit efficiency and yield.")
        fe_count += 1

    # Skewed features
    if prof["skewed_cols"]:
        sk_col = list(prof["skewed_cols"].keys())[0]
        lines.append(f"• **Log Transformation:** Apply `np.log1p({sk_col})` to normalize heavy positive skewness (skew = {prof['skewed_cols'][sk_col]}).")
        fe_count += 1

    # Categorical encoding
    cat = prof["primary_category"]
    if cat:
        n_uniq = df[cat].nunique()
        if n_uniq <= 10:
            lines.append(f"• **Categorical One-Hot Encoding:** Feature `{cat}` has {n_uniq} unique values — ideal for One-Hot Encoding to avoid artificial ordinality.")
        else:
            lines.append(f"• **High-Cardinality Target Encoding:** Feature `{cat}` has {n_uniq} unique values — use Target Encoding or Frequency Encoding to manage dimensionality.")
        fe_count += 1

    # Target binning or classification preparation
    if prof["target_candidate"]:
        lines.append(f"• **Target Segmentation:** Analyze label balance on candidate target `{prof['target_candidate']}` to assess class imbalance prior to model training.")
        fe_count += 1

    if fe_count == 0:
        lines.append("• **Interaction Terms:** Explore cross-products between top continuous features to capture non-linear relationships.")

    lines.extend([
        "\n---",
        "#### 3. 🎯 Immediate Next Steps in Copilot",
        "1. Open the **Clean Data (Phase 4)** tab to execute automated imputation, deduplication, and scaling.",
        "2. Switch to **EDA Studio (Phase 5)** to visually inspect distributions and correlations.",
    ])

    return "\n".join(lines)


def _generate_business_recommendations(df: pd.DataFrame, prof: Dict[str, Any], question: str, retrieved_chunks: List[Dict]) -> str:
    pm = prof["primary_metric"]
    cat = prof["primary_category"]

    lines = [
        "### 📈 Strategic Business & Revenue Optimization Playbook\n",
        "Based on multi-dimensional analysis of your dataset metrics:\n",
        "#### 🏆 1. Core Performance Drivers & High-Value Opportunities",
    ]

    if pm and cat and cat in df.columns and pm in df.columns:
        try:
            grouped = df.groupby(cat)[pm].agg(["sum", "mean", "count"]).round(2)
            top_cat = grouped["sum"].idxmax()
            top_val = grouped.loc[top_cat, "sum"]
            total_val = grouped["sum"].sum()
            share = round((top_val / total_val) * 100, 1) if total_val > 0 else 0

            highest_avg = grouped["mean"].idxmax()
            avg_val = grouped.loc[highest_avg, "mean"]

            lowest_cat = grouped["sum"].idxmin()
            low_val = grouped.loc[lowest_cat, "sum"]

            lines.append(f"• **Star Segment (`{cat}`):** **'{top_cat}'** is the #1 performance engine, accounting for **{top_val:,.2f}** ({share}% of total {pm}).")
            lines.append(f"• **Highest Unit Yield:** **'{highest_avg}'** delivers the highest average yield at **{avg_val:,.2f}** per transaction.")
            lines.append(f"• **Underperforming Segment:** **'{lowest_cat}'** generates only **{low_val:,.2f}**, representing an immediate growth turnaround opportunity.")
        except Exception:
            lines.append(f"• **Key Driver:** High concentration in top-tier `{pm}` transactions. Prioritize resources toward high-volume records.")
    else:
        lines.append("• **Key Driver:** High concentration in top-tier records. Prioritize capital allocation toward top segment performers.")

    lines.extend([
        "\n#### ⚠️ 2. Margin Protection & Leakage Risks",
    ])

    # Correlation checks for risk
    if prof["correlations"]:
        top_corr = prof["correlations"][0]
        c1, c2, r_val = top_corr
        lines.append(f"• **Key Metric Linkage:** Strongest observed correlation is between `{c1}` and `{c2}` (Pearson r = {r_val}). Monitor both in tandem to prevent metric degradation.")
    else:
        lines.append("• **Metric Stability:** Monitor variance across numerical features to prevent uncalibrated pricing or resource leakage.")

    if prof["outliers"]:
        first_out = list(prof["outliers"].items())[0]
        lines.append(f"• **Fat-Tail Concentration:** {first_out[1]} records in `{first_out[0]}` fall into the extreme tail. Ensure strategy does not overly rely on top outlier accounts.")

    lines.extend([
        "\n#### 🚀 3. Concrete Action Items to Accelerate Growth",
        "1. **Double Down on the Top 20%:** Reallocate budget and marketing effort to the leading segment performers identified above.",
        "2. **Address Lagging Segments:** Test bundled offerings or targeted retention campaigns for bottom-tier segments.",
        "3. **Establish an Automated Feedback Loop:** Monitor high-frequency records weekly to detect shifts in volume or churn early.",
    ])

    return "\n".join(lines)


def _generate_ml_readiness(df: pd.DataFrame, prof: Dict[str, Any], question: str, retrieved_chunks: List[Dict]) -> str:
    n_rows, n_cols = prof["n_rows"], prof["n_cols"]
    num_cols, cat_cols = prof["num_cols"], prof["cat_cols"]
    target = prof["target_candidate"] or prof["primary_metric"] or (df.columns[-1] if len(df.columns) else "Target")

    is_small = n_rows < 150
    sample_text = (
        f"Small sample dataset ({n_rows} rows). We recommend strong regularization (L1/L2), 5-Fold Stratified Cross Validation, and shallow tree depths to prevent overfitting."
        if is_small else
        f"Adequate sample size ({n_rows:,} rows). Suitable for tabular gradient boosted trees and regularized linear baselines."
    )

    lines = [
        "### 🤖 Machine Learning Modeling & Feasibility Audit\n",
        f"**Dataset Scale:** **{n_rows:,} rows** × **{n_cols} features** ({len(num_cols)} numerical, {len(cat_cols)} categorical).\n",
        "#### 1. ⚙️ Preprocessing & Data Pipeline Needs",
        f"• **Sample Feasibility:** {sample_text}",
        f"• **Candidate Target Feature:** **`{target}`** — " + (
            "Formulate as a **Classification** task (binary/multiclass)." if (target in cat_cols or df[target].nunique() <= 5)
            else "Formulate as a **Regression** task (continuous numerical)."
        ),
        f"• **Feature Scaling:** {'Outliers present — use `RobustScaler` on numerical features.' if prof['outliers'] else 'Apply `StandardScaler` to numerical inputs.'}",
        "• **Categorical Encoding:** Use `OneHotEncoder(handle_unknown='ignore')` for low-cardinality features and `TargetEncoder` for high-cardinality columns.",
        "\n#### 2. 🎯 Recommended Model Architectures",
        "• **Primary Production Model:** **LightGBM / XGBoost / CatBoost** — handles non-linearities, missing values, and mixed data types with high tabular accuracy.",
        "• **Baseline Model:** Train a regularized **Ridge Regression** or **Logistic Regression** pipeline to establish a performance floor.",
        "\n#### 3. 🧪 Validation Protocol",
        "• Use **5-Fold Cross Validation** to measure out-of-fold generalization error.",
        "• Key evaluation metrics: **RMSE & MAPE** for regression targets; **ROC-AUC & Macro-F1** for classification targets.",
    ]
    return "\n".join(lines)


def _generate_cleaning_guidance(df: pd.DataFrame, prof: Dict[str, Any], question: str, retrieved_chunks: List[Dict]) -> str:
    n_rows = prof["n_rows"]
    lines = [
        "### 🧹 Recommended Data Cleaning Recipe & Sequence\n",
        "Follow this prioritized 4-step sequence before modeling or reporting:\n",
        "1. **Step 1: Deduplication First**",
        f"   - {'Found **' + str(prof['n_dupes']) + '** duplicate rows. Remove with `df.drop_duplicates()`.' if prof['n_dupes'] > 0 else 'No duplicate rows found — step complete.'}",
        "2. **Step 2: Missing Value Strategy**",
    ]

    if prof["null_cols"]:
        for c, cnt in prof["null_cols"].items():
            pct = round(cnt / n_rows * 100, 1)
            is_num = c in prof["num_cols"]
            strat = "median imputation" if is_num else "mode imputation or 'Unknown' sentinel"
            lines.append(f"   - Feature `{c}`: {cnt} nulls ({pct}%). Apply *{strat}*.")
    else:
        lines.append("   - Zero missing values detected across all features.")

    lines.extend([
        "3. **Step 3: DataType Enforcement**",
        "   - Cast identifier and discrete categorical columns to string / category.",
        "   - Ensure financial and volume metrics are parsed as float64 without formatting artifacts.",
        "4. **Step 4: Outlier Treatment**",
    ])

    if prof["outliers"]:
        for c, cnt in list(prof["outliers"].items())[:3]:
            lines.append(f"   - Cap extreme tail in `{c}` ({cnt} outliers) via 99th percentile Winsorization.")
    else:
        lines.append("   - No extreme IQR outliers detected.")

    lines.append("\n💡 *Execute this entire plan automatically in the **Clean Data (Phase 4)** tab.*")
    return "\n".join(lines)


def _generate_eda_hypotheses(df: pd.DataFrame, prof: Dict[str, Any], question: str, retrieved_chunks: List[Dict]) -> str:
    cat = prof["primary_category"]
    pm = prof["primary_metric"]
    sm = prof["secondary_metric"]

    lines = [
        "### 🔍 Formulated EDA Hypotheses & Visualizations to Test\n",
        "Here are 3 concrete statistical hypotheses tailored to your dataset to test inside **EDA Studio**:\n",
    ]

    if cat and pm:
        lines.append(f"1. **Hypothesis 1 (Segment Disparity):** Variation in `{pm}` across `{cat}` is statistically significant (ANOVA / Kruskal-Wallis).")
        lines.append("   - *Recommended Chart:* **Box Plot** or **Grouped Bar Chart**.")

    if pm and sm and pm != sm:
        lines.append(f"2. **Hypothesis 2 (Linear & Non-Linear Coupling):** Changes in `{sm}` have a significant predictive relationship with `{pm}`.")
        lines.append("   - *Recommended Chart:* **Scatter Plot with OLS Trendline**.")
    elif prof["correlations"]:
        c1, c2, r = prof["correlations"][0]
        lines.append(f"2. **Hypothesis 2 (Correlation Dependency):** `{c1}` and `{c2}` exhibit significant linear coupling (r = {r}).")
        lines.append("   - *Recommended Chart:* **Bivariate Scatter Plot**.")
    else:
        lines.append("2. **Hypothesis 2 (Distribution Skew):** Continuous metrics exhibit non-normal right-skewed behavior.")
        lines.append("   - *Recommended Chart:* **Histogram with KDE Curve**.")

    if prof["target_candidate"] and prof["target_candidate"] != pm:
        lines.append(f"3. **Hypothesis 3 (Outcome Predictability):** Distribution of `{pm}` differs sharply across `{prof['target_candidate']}` classes.")
        lines.append("   - *Recommended Chart:* **Violin Plot or Faceted Histogram**.")
    else:
        lines.append("3. **Hypothesis 3 (Concentration & Pareto Law):** Top 20% of records account for over 60% of total metric volume.")
        lines.append("   - *Recommended Chart:* **Cumulative Lorenz / Pareto Curve**.")

    lines.append("\n👉 *All these charts can be generated and analyzed inside the **EDA Studio (Phase 5)** tab.*")
    return "\n".join(lines)


def _generate_ranking_response(df: pd.DataFrame, prof: Dict[str, Any], question: str, retrieved_chunks: List[Dict]) -> str:
    """Answers ranking / comparison queries (e.g. which category is best, top product, lowest performing)."""
    cols = _extract_columns_from_question(question, df.columns.tolist())
    target_metric = None
    target_cat = None

    for c in cols:
        if c in prof["num_cols"] and not target_metric:
            target_metric = c
        elif c in prof["cat_cols"] and not target_cat:
            target_cat = c

    target_metric = target_metric or prof["primary_metric"]
    target_cat = target_cat or prof["primary_category"]

    if not (target_metric and target_cat and target_cat in df.columns and target_metric in df.columns):
        return _generate_business_recommendations(df, prof, question, retrieved_chunks)

    is_asking_worst = any(w in question.lower() for w in ["worst", "lowest", "bottom", "least", "minimum", "drop"])

    try:
        grouped = df.groupby(target_cat)[target_metric].agg(["sum", "mean", "count"]).round(2)
        grouped = grouped.sort_values(by="sum", ascending=is_asking_worst)
        total_sum = grouped["sum"].sum()

        lines = [
            f"### 🏆 Segment Performance Ranking: `{target_cat}` by `{target_metric}`\n",
            f"Analyzing **{len(grouped)} segments** ranked by **{'lowest' if is_asking_worst else 'highest'} aggregate {target_metric}**:\n",
        ]

        for rank, (grp, row) in enumerate(grouped.head(6).iterrows(), 1):
            pct = round((row["sum"] / total_sum * 100), 1) if total_sum > 0 else 0
            lines.append(f"{rank}. **'{grp}'**: **{row['sum']:,.2f}** total ({pct}% share), avg = **{row['mean']:,.2f}**, {int(row['count'])} records.")

        top_name = grouped.index[0]
        lines.extend([
            "\n**Key Takeaway:**",
            f"The {'trailing' if is_asking_worst else 'leading'} segment is **'{top_name}'**, accounting for **{grouped.iloc[0]['sum']:,.2f}**.",
            f"The spread between top and bottom segment is **{(grouped['sum'].max() - grouped['sum'].min()):,.2f}**.",
        ])
        return "\n".join(lines)
    except Exception:
        return _generate_business_recommendations(df, prof, question, retrieved_chunks)


def _generate_relationship_response(df: pd.DataFrame, prof: Dict[str, Any], question: str, retrieved_chunks: List[Dict]) -> str:
    """Answers correlation / relationship questions between features."""
    cols = _extract_columns_from_question(question, prof["num_cols"])
    if len(cols) >= 2:
        c1, c2 = cols[0], cols[1]
    elif prof["correlations"]:
        c1, c2, _ = prof["correlations"][0]
    else:
        return "Not enough numerical features to calculate a bivariate correlation in this dataset."

    try:
        s1, s2 = df[c1].dropna(), df[c2].dropna()
        common = df[[c1, c2]].dropna()
        r = round(float(common.corr().iloc[0, 1]), 3)

        direction = "positive" if r > 0 else "negative"
        strength = "strong" if abs(r) >= 0.7 else "moderate" if abs(r) >= 0.4 else "weak / negligible"

        interpretation = (
            f"As `{c1}` increases, `{c2}` consistently increases as well." if r > 0.4
            else f"As `{c1}` increases, `{c2}` tends to decrease." if r < -0.4
            else f"There is little to no linear relationship between `{c1}` and `{c2}`."
        )

        lines = [
            f"### 🔗 Relationship & Correlation Analysis: `{c1}` vs `{c2}`\n",
            f"• **Pearson Correlation Coefficient:** **r = {r}** ({strength} {direction} correlation).",
            f"• **Sample Basis:** Evaluated over **{len(common):,} pairs** of complete records.",
            f"• **Statistical Interpretation:** {interpretation}",
            "\n**Practical Analytical Guidance:**",
            f"- If predicting `{c1}`, `{c2}` {'provides valuable linear predictive power.' if abs(r) >= 0.4 else 'may require non-linear feature transformation to add predictive value.'}",
            "- *Reminder:* Correlation does not imply causation — verify confounding categorical variables in **EDA Studio**.",
        ]
        return "\n".join(lines)
    except Exception as e:
        return f"Could not compute correlation between `{c1}` and `{c2}`: {str(e)}"


def _generate_anomaly_response(df: pd.DataFrame, prof: Dict[str, Any], question: str, retrieved_chunks: List[Dict]) -> str:
    lines = [
        "### ⚠️ Anomaly & Outlier Risk Inspection\n",
    ]
    if prof["outliers"]:
        lines.append(f"Found outlier values across **{len(prof['outliers'])} numerical features** based on the 1.5×IQR boundary:\n")
        for c, cnt in prof["outliers"].items():
            s = df[c].dropna()
            q25, q75 = s.quantile(0.25), s.quantile(0.75)
            iqr = q75 - q25
            lower, upper = round(float(q25 - 1.5 * iqr), 2), round(float(q75 + 1.5 * iqr), 2)
            lines.append(f"• **`{c}`**: **{cnt} outliers** outside `[{lower}, {upper}]` (min = {s.min():,.2f}, max = {s.max():,.2f}).")
        lines.append("\n**Mitigation Strategy:** Use Winsorization or log transformations to cap outlier leverage.")
    else:
        lines.append("No statistical outliers detected across numerical columns (all data points fall within 1.5×IQR).")

    if prof["n_dupes"] > 0:
        lines.append(f"\n• **Duplicate Rows:** **{prof['n_dupes']} identical records** present — execute deduplication in Phase 4.")

    return "\n".join(lines)


def _generate_executive_summary(df: pd.DataFrame, prof: Dict[str, Any], question: str, retrieved_chunks: List[Dict]) -> str:
    n_rows, n_cols = prof["n_rows"], prof["n_cols"]
    num_cols, cat_cols = prof["num_cols"], prof["cat_cols"]

    lines = [
        "### 📋 Executive Dataset Overview & Intelligence Summary\n",
        f"• **Dataset Dimensions:** **{n_rows:,} records** across **{n_cols} attributes**.",
        f"• **Feature Mix:** {len(num_cols)} numerical features and {len(cat_cols)} categorical descriptors.",
        f"• **Data Health Score:** **{prof['health_score']} / 100** ({prof['total_nulls']} nulls, {prof['n_dupes']} dupes).",
        f"• **Primary Performance Metric:** `{prof['primary_metric'] or 'N/A'}`.",
        f"• **Primary Dimension:** `{prof['primary_category'] or 'N/A'}`.",
        "\n#### 💡 Key Grounded Observations from Knowledge Base:",
    ]

    for chunk in retrieved_chunks[:3]:
        text = chunk.get("text", "")
        if text:
            lines.append(f"• {text}")

    lines.extend([
        "\n#### 🚀 Recommended Action:",
        "Ask for **suggestions & improvements**, **business strategy**, or click any suggested prompt on the right to dive deeper.",
    ])
    return "\n".join(lines)


def _generate_conversational_synthesis(df: pd.DataFrame, prof: Dict[str, Any], question: str, retrieved_chunks: List[Dict]) -> str:
    """Intelligent narrative synthesis for any general or open-ended user query."""
    if not retrieved_chunks:
        return (
            f"I analyzed your dataset regarding **\"{question}\"**.\n\n"
            f"Your dataset contains **{prof['n_rows']:,} rows** and **{prof['n_cols']} columns** ({', '.join(df.columns[:6])}).\n\n"
            "You can ask for specific suggestions, data cleaning recommendations, business strategy, or column statistics."
        )

    best_chunk = retrieved_chunks[0]["text"]
    other_chunks = [c["text"] for c in retrieved_chunks[1:4]]

    lines = [
        f"Based on a semantic scan of your dataset knowledge base regarding **\"{question}\"**:\n",
        f"**Key Fact:** {best_chunk}\n",
    ]

    if other_chunks:
        lines.append("**Contextual Statistical Evidence:**")
        for chunk_text in other_chunks:
            lines.append(f"• {chunk_text}")

    lines.extend([
        "\n**Analytical Interpretation & Recommendations:**",
        "This metric profile highlights structural segment variations in your dataset. "
        "To explore further, consider asking:",
        "  - *\"What suggestions and improvements do you recommend for this dataset?\"*",
        "  - *\"What business strategy should I follow based on this data?\"*",
        "  - *\"Can I train a machine learning model on this data?\"*",
    ])

    return "\n".join(lines)


def _compute_answer(question: str, df: pd.DataFrame, intents: List[str]) -> Optional[str]:
    """Precision numerical answering directly from DataFrame."""
    cols = df.columns.tolist()
    found = _extract_columns_from_question(question, cols)
    target_col = found[0] if found else None

    if not target_col:
        return None

    series = df[target_col].dropna()

    if not pd.api.types.is_numeric_dtype(df[target_col]):
        if any(k in intents for k in ["count", "unique", "top", "distribution"]):
            vc = series.value_counts()
            rows = "\n".join(f"  • **'{k}'**: {v} records ({round(v/len(series)*100, 1)}%)" for k, v in vc.head(8).items())
            return f"Distribution breakdown for **{target_col}** ({series.nunique()} unique values, {len(series)} non-null):\n{rows}"
        return None

    answers = []
    if "max" in intents:
        idx = df[target_col].idxmax()
        val = round(float(df.loc[idx, target_col]), 4)
        answers.append(f"• **Maximum {target_col}:** **{val:,}**")
    if "min" in intents:
        idx = df[target_col].idxmin()
        val = round(float(df.loc[idx, target_col]), 4)
        answers.append(f"• **Minimum {target_col}:** **{val:,}**")
    if "mean" in intents:
        answers.append(f"• **Average (Mean) {target_col}:** **{round(float(series.mean()), 4):,}**")
    if "median" in intents:
        answers.append(f"• **Median {target_col}:** **{round(float(series.median()), 4):,}**")
    if "sum" in intents:
        answers.append(f"• **Total Aggregate {target_col}:** **{round(float(series.sum()), 2):,}**")
    if "distribution" in intents:
        answers.append(
            f"• **{target_col} Summary:** min = {round(float(series.min()),2):,}, "
            f"mean = {round(float(series.mean()),2):,}, median = {round(float(series.median()),2):,}, "
            f"max = {round(float(series.max()),2):,}, std = {round(float(series.std()),2):,}"
        )
    if "missing" in intents:
        n_miss = int(df[target_col].isnull().sum())
        pct = round(n_miss / len(df) * 100, 1)
        answers.append(f"• **Missing values in {target_col}:** **{n_miss}** ({pct}%)")

    return "\n".join(answers) if answers else None


# ─────────────────────────────────────────────────────────────────────────────
# Master Question Answering Dispatcher
# ─────────────────────────────────────────────────────────────────────────────

def answer_question(
    question: str,
    df: pd.DataFrame,
    file_id: str,
    top_k: int = 4,
) -> Dict[str, Any]:
    """
    Unified RAG Analytics Copilot:
      1. Embeds question and retrieves semantic chunks from ChromaDB.
      2. If an LLM provider is configured (Groq/OpenAI/Gemini/Ollama), queries it.
      3. Otherwise uses the Autonomous Natural Language Advisory Engine to produce
         in-depth, human-like answers for suggestions, improvements, business advice,
         machine learning, EDA hypotheses, or code-calculated mathematical ground truth.
    """
    model = _get_embed_model()
    client = _get_chroma_client()

    safe_id = re.sub(r"[^a-zA-Z0-9_-]", "_", file_id)[:63]
    if not safe_id[0].isalpha():
        safe_id = "c_" + safe_id

    # Check collection exists
    existing = [c.name for c in client.list_collections()]
    if safe_id not in existing:
        raise ValueError("Dataset has not been indexed yet. Call /rag/index first.")

    collection = client.get_collection(name=safe_id)

    # Embed question
    q_embedding = model.encode([question], normalize_embeddings=True).tolist()[0]

    # Retrieve top-k chunks
    results = collection.query(
        query_embeddings=[q_embedding],
        n_results=min(top_k, max(1, collection.count())),
        include=["documents", "metadatas", "distances"],
    )

    retrieved_chunks = []
    if results["documents"] and results["documents"][0]:
        for doc, meta, dist in zip(
            results["documents"][0],
            results["metadatas"][0],
            results["distances"][0],
        ):
            retrieved_chunks.append({
                "text": doc,
                "type": meta.get("type", "unknown"),
                "relevance_score": round(1 - float(dist), 3),
            })

    intents = _classify_intent(question)
    prof = _profile_dataset(df)

    # 1. First: Try external LLM if configured
    llm_answer = _call_external_llm(question, df, retrieved_chunks)
    if llm_answer:
        return {
            "question": question,
            "answer": llm_answer,
            "intents": intents,
            "answer_source": "llm + rag",
            "retrieved_chunks": retrieved_chunks,
        }

    # 2. Check if a specific numerical computation was requested on a column
    computed = _compute_answer(question, df, intents)
    if computed and not any(k in intents for k in ["suggestion", "business", "cleaning", "ml", "eda", "ranking"]):
        context_lines = "\n".join(f"  {i+1}. {c['text']}" for i, c in enumerate(retrieved_chunks))
        final_answer = (
            f"### 🎯 Exact Calculated Answer\n\n"
            f"{computed}\n\n"
            f"---\n"
            f"**Supporting context from dataset knowledge base:**\n{context_lines}"
        )
        return {
            "question": question,
            "answer": final_answer,
            "intents": intents,
            "answer_source": "computed-truth + rag",
            "retrieved_chunks": retrieved_chunks,
        }

    # 3. Route to specialized Natural Language Advisory Handlers
    if "greeting" in intents:
        final_answer = _generate_greeting_response(df, prof, question)
        answer_source = "advisory-engine + rag"
    elif "suggestion" in intents or "improvement" in intents:
        final_answer = _generate_improvement_suggestions(df, prof, question, retrieved_chunks)
        answer_source = "advisory-engine + rag"
    elif "ranking" in intents:
        final_answer = _generate_ranking_response(df, prof, question, retrieved_chunks)
        answer_source = "advisory-engine + rag"
    elif "business" in intents:
        final_answer = _generate_business_recommendations(df, prof, question, retrieved_chunks)
        answer_source = "business-strategy + rag"
    elif "relationship" in intents:
        final_answer = _generate_relationship_response(df, prof, question, retrieved_chunks)
        answer_source = "advisory-engine + rag"
    elif "outlier" in intents:
        final_answer = _generate_anomaly_response(df, prof, question, retrieved_chunks)
        answer_source = "advisory-engine + rag"
    elif "cleaning" in intents:
        final_answer = _generate_cleaning_guidance(df, prof, question, retrieved_chunks)
        answer_source = "cleaning-advisor + rag"
    elif "ml" in intents:
        final_answer = _generate_ml_readiness(df, prof, question, retrieved_chunks)
        answer_source = "ml-advisor + rag"
    elif "eda" in intents:
        final_answer = _generate_eda_hypotheses(df, prof, question, retrieved_chunks)
        answer_source = "eda-hypotheses + rag"
    elif "summary" in intents:
        final_answer = _generate_executive_summary(df, prof, question, retrieved_chunks)
        answer_source = "executive-summary + rag"
    else:
        final_answer = _generate_conversational_synthesis(df, prof, question, retrieved_chunks)
        answer_source = "conversational-synthesis + rag"

    return {
        "question": question,
        "answer": final_answer,
        "intents": intents,
        "answer_source": answer_source,
        "retrieved_chunks": retrieved_chunks,
    }


def purge_dataset_index(file_id: str) -> bool:
    """Removes the ChromaDB vector collection associated with this file_id."""
    try:
        client = _get_chroma_client()
        safe_id = re.sub(r"[^a-zA-Z0-9_-]", "_", file_id)[:63]
        if not safe_id[0].isalpha():
            safe_id = "c_" + safe_id
        client.delete_collection(name=safe_id)
        return True
    except Exception:
        return False


