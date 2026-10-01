"""
Data Cleaning Service — Phase 4
Generates a cleaning plan and applies user-confirmed strategies to a DataFrame.

Design principle: The AI NEVER modifies data without explicit user approval.
1. Generate plan → frontend shows it to the user
2. User reviews/adjusts strategies
3. User confirms → apply_cleaning_plan() is called
"""

from typing import Any, Dict, List, Optional
import numpy as np
import pandas as pd


# ─── Helper ─────────────────────────────────────────────────────────────────

def _clean_val(val: Any) -> Any:
    """Ensure value is JSON-serializable."""
    if val is None:
        return None
    if isinstance(val, float) and (np.isnan(val) or np.isinf(val)):
        return None
    if isinstance(val, (np.integer,)):
        return int(val)
    if isinstance(val, (np.floating,)):
        return round(float(val), 4)
    return val


# ─── Cleaning Plan Generation ────────────────────────────────────────────────

def generate_cleaning_plan(df: pd.DataFrame) -> Dict[str, Any]:
    """
    Analyse the dataframe and produce a structured cleaning plan.
    The plan describes what *could* be fixed – the user decides what to apply.
    """
    plan = {
        "total_rows": len(df),
        "total_columns": len(df.columns),
        "missing_value_issues": [],
        "duplicate_issue": None,
        "outlier_issues": [],
        "summary": {},
    }

    # ── Missing values ───────────────────────────────────────────────────────
    for col in df.columns:
        series = df[col]
        null_count = int(series.isnull().sum())
        if null_count == 0:
            continue

        null_pct = round((null_count / len(df)) * 100, 2)
        is_numeric = pd.api.types.is_numeric_dtype(series)

        issue: Dict[str, Any] = {
            "column": col,
            "dtype": str(series.dtype),
            "null_count": null_count,
            "null_pct": null_pct,
            "is_numeric": is_numeric,
            "suggested_strategy": None,
            "available_strategies": [],
        }

        if is_numeric:
            non_null = series.dropna()
            issue["col_mean"] = _clean_val(float(non_null.mean())) if len(non_null) > 0 else None
            issue["col_median"] = _clean_val(float(non_null.median())) if len(non_null) > 0 else None
            issue["col_mode"] = _clean_val(float(non_null.mode().iloc[0])) if len(non_null) > 0 else None
            issue["available_strategies"] = ["mean", "median", "mode", "zero", "drop_rows"]
            # Auto-suggest: use median for skewed distributions
            if len(non_null) > 2:
                skew = abs(float(non_null.skew()))
                issue["suggested_strategy"] = "median" if skew > 1.0 else "mean"
            else:
                issue["suggested_strategy"] = "mean"
        else:
            top_vals = series.dropna().value_counts()
            issue["col_mode"] = str(top_vals.index[0]) if len(top_vals) > 0 else None
            issue["available_strategies"] = ["mode", "constant_unknown", "drop_rows"]
            issue["suggested_strategy"] = "mode" if len(top_vals) > 0 else "constant_unknown"

        plan["missing_value_issues"].append(issue)

    # ── Duplicate rows ───────────────────────────────────────────────────────
    dup_count = int(df.duplicated().sum())
    if dup_count > 0:
        dup_rows = df[df.duplicated(keep="first")].head(5).copy()
        dup_rows = dup_rows.replace({np.nan: None, np.inf: None, -np.inf: None})
        plan["duplicate_issue"] = {
            "count": dup_count,
            "pct": round((dup_count / len(df)) * 100, 2),
            "sample_rows": dup_rows.to_dict(orient="records"),
            "suggested_strategy": "drop",  # always safe to drop exact duplicates
        }

    # ── Outliers (IQR method) ────────────────────────────────────────────────
    for col in df.select_dtypes(include=[np.number]).columns:
        series = df[col].dropna()
        if len(series) < 4:
            continue

        q25 = float(series.quantile(0.25))
        q75 = float(series.quantile(0.75))
        iqr = q75 - q25
        if iqr == 0:
            continue

        lower = q25 - 1.5 * iqr
        upper = q75 + 1.5 * iqr
        outliers = df[col][(df[col] < lower) | (df[col] > upper)].dropna()
        if len(outliers) == 0:
            continue

        plan["outlier_issues"].append({
            "column": col,
            "outlier_count": int(len(outliers)),
            "outlier_pct": round((len(outliers) / len(df)) * 100, 2),
            "lower_bound": _clean_val(lower),
            "upper_bound": _clean_val(upper),
            "sample_outliers": [_clean_val(v) for v in outliers.head(5).tolist()],
            "available_strategies": ["cap", "drop_rows", "keep"],
            "suggested_strategy": "cap",  # capping is safer than dropping
        })

    # ── High-level summary ───────────────────────────────────────────────────
    total_issues = (
        len(plan["missing_value_issues"])
        + (1 if plan["duplicate_issue"] else 0)
        + len(plan["outlier_issues"])
    )
    plan["summary"] = {
        "total_issues": total_issues,
        "missing_columns": len(plan["missing_value_issues"]),
        "duplicate_rows": dup_count,
        "outlier_columns": len(plan["outlier_issues"]),
        "is_clean": total_issues == 0,
    }

    return plan


# ─── Apply Cleaning Plan ─────────────────────────────────────────────────────

def apply_cleaning_plan(
    df: pd.DataFrame,
    missing_strategies: Dict[str, str],   # {col_name: strategy}
    fix_duplicates: bool,
    outlier_strategies: Dict[str, str],   # {col_name: strategy}
    outlier_bounds: Dict[str, Dict],      # {col_name: {lower, upper}}
) -> Dict[str, Any]:
    """
    Apply the user-confirmed cleaning plan.
    Returns the cleaned DataFrame and a detailed change log.
    """
    cleaned = df.copy()
    change_log = []
    rows_before = len(cleaned)

    # ── 1. Handle Missing Values ─────────────────────────────────────────────
    rows_to_drop_missing = set()
    for col, strategy in missing_strategies.items():
        if col not in cleaned.columns:
            continue

        null_count_before = int(cleaned[col].isnull().sum())
        if null_count_before == 0:
            continue

        if strategy == "mean":
            fill_val = cleaned[col].mean()
            cleaned[col] = cleaned[col].fillna(fill_val)
            change_log.append({
                "type": "imputation",
                "column": col,
                "strategy": f"Filled {null_count_before} nulls with mean ({_clean_val(fill_val)})",
                "rows_affected": null_count_before,
            })

        elif strategy == "median":
            fill_val = cleaned[col].median()
            cleaned[col] = cleaned[col].fillna(fill_val)
            change_log.append({
                "type": "imputation",
                "column": col,
                "strategy": f"Filled {null_count_before} nulls with median ({_clean_val(fill_val)})",
                "rows_affected": null_count_before,
            })

        elif strategy == "mode":
            mode_vals = cleaned[col].mode()
            if len(mode_vals) > 0:
                fill_val = mode_vals.iloc[0]
                cleaned[col] = cleaned[col].fillna(fill_val)
                change_log.append({
                    "type": "imputation",
                    "column": col,
                    "strategy": f"Filled {null_count_before} nulls with mode ('{fill_val}')",
                    "rows_affected": null_count_before,
                })

        elif strategy == "zero":
            cleaned[col] = cleaned[col].fillna(0)
            change_log.append({
                "type": "imputation",
                "column": col,
                "strategy": f"Filled {null_count_before} nulls with 0",
                "rows_affected": null_count_before,
            })

        elif strategy == "constant_unknown":
            cleaned[col] = cleaned[col].fillna("Unknown")
            change_log.append({
                "type": "imputation",
                "column": col,
                "strategy": f"Filled {null_count_before} nulls with 'Unknown'",
                "rows_affected": null_count_before,
            })

        elif strategy == "drop_rows":
            null_indices = cleaned[cleaned[col].isnull()].index
            rows_to_drop_missing.update(null_indices.tolist())

    if rows_to_drop_missing:
        n_drop = len(rows_to_drop_missing)
        cleaned = cleaned.drop(index=list(rows_to_drop_missing))
        cleaned = cleaned.reset_index(drop=True)
        change_log.append({
            "type": "row_drop",
            "column": "multiple",
            "strategy": f"Dropped {n_drop} rows with missing values",
            "rows_affected": n_drop,
        })

    # ── 2. Remove Duplicates ─────────────────────────────────────────────────
    if fix_duplicates:
        dup_count = int(cleaned.duplicated().sum())
        if dup_count > 0:
            cleaned = cleaned.drop_duplicates(keep="first").reset_index(drop=True)
            change_log.append({
                "type": "deduplication",
                "column": "all",
                "strategy": f"Removed {dup_count} exact duplicate row(s)",
                "rows_affected": dup_count,
            })

    # ── 3. Handle Outliers ───────────────────────────────────────────────────
    rows_to_drop_outliers = set()
    for col, strategy in outlier_strategies.items():
        if col not in cleaned.columns or strategy == "keep":
            continue

        bounds = outlier_bounds.get(col, {})
        lower = bounds.get("lower_bound")
        upper = bounds.get("upper_bound")
        if lower is None or upper is None:
            continue

        mask = (cleaned[col] < lower) | (cleaned[col] > upper)
        outlier_count = int(mask.sum())
        if outlier_count == 0:
            continue

        if strategy == "cap":
            cleaned[col] = cleaned[col].clip(lower=lower, upper=upper)
            change_log.append({
                "type": "outlier_cap",
                "column": col,
                "strategy": f"Capped {outlier_count} outlier(s) to [{_clean_val(lower)}, {_clean_val(upper)}]",
                "rows_affected": outlier_count,
            })

        elif strategy == "drop_rows":
            rows_to_drop_outliers.update(cleaned[mask].index.tolist())

    if rows_to_drop_outliers:
        n_drop = len(rows_to_drop_outliers)
        cleaned = cleaned.drop(index=list(rows_to_drop_outliers))
        cleaned = cleaned.reset_index(drop=True)
        change_log.append({
            "type": "outlier_drop",
            "column": "multiple",
            "strategy": f"Dropped {n_drop} row(s) with outlier values",
            "rows_affected": n_drop,
        })

    # ── 4. Compute Before/After stats ────────────────────────────────────────
    rows_after = len(cleaned)
    missing_before = int(df.isnull().sum().sum())
    missing_after = int(cleaned.isnull().sum().sum())
    dups_before = int(df.duplicated().sum())
    dups_after = int(cleaned.duplicated().sum())

    # Preview of cleaned data (first 50 rows)
    preview = cleaned.head(50).copy()
    preview = preview.replace({np.nan: None, np.inf: None, -np.inf: None})

    return {
        "success": True,
        "change_log": change_log,
        "before": {
            "rows": rows_before,
            "missing_cells": missing_before,
            "duplicate_rows": dups_before,
        },
        "after": {
            "rows": rows_after,
            "missing_cells": missing_after,
            "duplicate_rows": dups_after,
        },
        "rows_removed": rows_before - rows_after,
        "preview": preview.to_dict(orient="records"),
        "column_names": list(cleaned.columns),
        "cleaned_df": cleaned,  # returned for CSV export — NOT serialized directly
    }
