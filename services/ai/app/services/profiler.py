"""
Deep Profiler Service
Computes statistical distributions, histograms, IQR outlier detection,
correlation matrices, and automated statistical insights on Pandas DataFrames.
"""

from typing import Any, Dict, List
import numpy as np
import pandas as pd


def _clean_val(val: Any) -> Any:
    """Ensure value is JSON serializable (handles NaN, inf, int64, float64)."""
    if pd.isna(val) or np.isinf(val):
        return None
    if isinstance(val, (np.integer, int)):
        return int(val)
    if isinstance(val, (np.floating, float)):
        return round(float(val), 4)
    return str(val)


def profile_numerical_column(series: pd.Series) -> Dict[str, Any]:
    """Calculate deep statistics, quantiles, outliers, and histogram for a numerical column."""
    valid_data = series.dropna()
    n_total = len(series)
    n_valid = len(valid_data)

    if n_valid == 0:
        return {
            "name": series.name,
            "type": "numeric",
            "count": 0,
            "null_count": n_total,
            "null_pct": 100.0,
        }

    q25 = float(valid_data.quantile(0.25))
    median = float(valid_data.median())
    q75 = float(valid_data.quantile(0.75))
    iqr = q75 - q25

    lower_bound = q25 - (1.5 * iqr)
    upper_bound = q75 + (1.5 * iqr)

    outliers = valid_data[(valid_data < lower_bound) | (valid_data > upper_bound)]
    outlier_count = len(outliers)
    outlier_pct = round((outlier_count / n_valid) * 100, 2)

    # Histogram calculation (up to 8 bins)
    hist_data = []
    try:
        n_bins = min(8, max(3, int(np.sqrt(n_valid))))
        counts, bin_edges = np.histogram(valid_data, bins=n_bins)
        for i in range(len(counts)):
            low = round(float(bin_edges[i]), 2)
            high = round(float(bin_edges[i + 1]), 2)
            hist_data.append({
                "bin": f"{low} - {high}",
                "min": low,
                "max": high,
                "count": int(counts[i]),
            })
    except Exception:
        hist_data = []

    # Skewness
    try:
        skew = round(float(valid_data.skew()), 3) if n_valid > 2 else 0.0
    except Exception:
        skew = 0.0

    return {
        "name": series.name,
        "type": "numeric",
        "count": n_valid,
        "null_count": int(series.isnull().sum()),
        "null_pct": round((series.isnull().sum() / n_total) * 100, 2),
        "min": _clean_val(valid_data.min()),
        "max": _clean_val(valid_data.max()),
        "mean": _clean_val(valid_data.mean()),
        "median": _clean_val(median),
        "std": _clean_val(valid_data.std()),
        "q25": _clean_val(q25),
        "q75": _clean_val(q75),
        "iqr": _clean_val(iqr),
        "skewness": skew,
        "outliers": {
            "lower_bound": _clean_val(lower_bound),
            "upper_bound": _clean_val(upper_bound),
            "count": outlier_count,
            "pct": outlier_pct,
            "sample_values": [_clean_val(v) for v in outliers.head(5).tolist()],
        },
        "histogram": hist_data,
    }


def profile_categorical_column(series: pd.Series) -> Dict[str, Any]:
    """Calculate frequency distribution, cardinality, and null metrics for categorical columns."""
    n_total = len(series)
    non_null = series.dropna().astype(str)
    n_valid = len(non_null)

    if n_valid == 0:
        return {
            "name": series.name,
            "type": "categorical",
            "count": 0,
            "null_count": n_total,
            "null_pct": 100.0,
            "unique_count": 0,
            "top_categories": [],
        }

    val_counts = non_null.value_counts()
    unique_count = len(val_counts)
    cardinality_pct = round((unique_count / n_total) * 100, 2)

    top_categories = []
    for val, count in val_counts.head(8).items():
        pct = round((count / n_valid) * 100, 2)
        top_categories.append({
            "category": str(val),
            "count": int(count),
            "pct": pct,
        })

    return {
        "name": series.name,
        "type": "categorical",
        "count": n_valid,
        "null_count": int(series.isnull().sum()),
        "null_pct": round((series.isnull().sum() / n_total) * 100, 2),
        "unique_count": unique_count,
        "cardinality_pct": cardinality_pct,
        "top_categories": top_categories,
        "mode": str(val_counts.index[0]) if len(val_counts) > 0 else None,
        "mode_count": int(val_counts.iloc[0]) if len(val_counts) > 0 else 0,
    }


def compute_correlations(df: pd.DataFrame) -> Dict[str, Any]:
    """Compute Pearson correlation matrix across all numerical columns."""
    num_df = df.select_dtypes(include=[np.number])
    cols = list(num_df.columns)

    if len(cols) < 2:
        return {
            "columns": cols,
            "matrix": [],
            "strong_correlations": [],
        }

    corr_matrix = num_df.corr().fillna(0)
    matrix_cells = []
    strong_correlations = []

    seen_pairs = set()

    for r_idx, col_x in enumerate(cols):
        for c_idx, col_y in enumerate(cols):
            val = round(float(corr_matrix.loc[col_x, col_y]), 3)
            matrix_cells.append({
                "x": col_x,
                "y": col_y,
                "value": val,
            })

            # Check for strong correlations (|r| >= 0.5, exclude diagonal)
            if col_x != col_y:
                pair_key = tuple(sorted([col_x, col_y]))
                if pair_key not in seen_pairs:
                    seen_pairs.add(pair_key)
                    if abs(val) >= 0.4:
                        relationship = "positive" if val > 0 else "negative"
                        strength = "Strong" if abs(val) >= 0.7 else "Moderate"
                        strong_correlations.append({
                            "col1": col_x,
                            "col2": col_y,
                            "correlation": val,
                            "description": f"{strength} {relationship} correlation between {col_x} and {col_y} (r = {val})",
                        })

    strong_correlations.sort(key=lambda x: abs(x["correlation"]), reverse=True)

    return {
        "columns": cols,
        "matrix": matrix_cells,
        "strong_correlations": strong_correlations,
    }


def generate_automated_insights(df: pd.DataFrame, num_profiles: List[Dict], cat_profiles: List[Dict], corr_data: Dict) -> List[Dict[str, str]]:
    """Synthesize mathematical and distribution properties into human-readable insight tags."""
    insights = []
    n_rows = len(df)

    # 1. Strongest Correlation Insights
    for corr in corr_data.get("strong_correlations", [])[:3]:
        insights.append({
            "type": "correlation",
            "category": "Relationship",
            "title": f"Correlation: {corr['col1']} & {corr['col2']}",
            "detail": corr["description"],
            "severity": "info",
        })

    # 2. Outliers Detected
    outlier_cols = [p for p in num_profiles if p.get("outliers", {}).get("count", 0) > 0]
    for p in outlier_cols[:3]:
        o_info = p["outliers"]
        insights.append({
            "type": "outlier",
            "category": "Anomaly Detection",
            "title": f"Outliers in {p['name']}",
            "detail": f"{o_info['count']} data point(s) ({o_info['pct']}%) fall outside [{o_info['lower_bound']} - {o_info['upper_bound']}].",
            "severity": "warning" if o_info['pct'] > 5 else "info",
        })

    # 3. High Skewness
    skewed_cols = [p for p in num_profiles if abs(p.get("skewness", 0)) >= 1.0]
    for p in skewed_cols[:2]:
        direction = "right-skewed (positive tail)" if p["skewness"] > 0 else "left-skewed (negative tail)"
        insights.append({
            "type": "distribution",
            "category": "Skewness",
            "title": f"Asymmetric Distribution: {p['name']}",
            "detail": f"Column {p['name']} is {direction} with skewness of {p['skewness']}.",
            "severity": "info",
        })

    # 4. High Cardinality (Potential IDs)
    id_like = [p for p in cat_profiles if p.get("cardinality_pct", 0) >= 95 and p.get("count", 0) > 10]
    for p in id_like[:2]:
        insights.append({
            "type": "cardinality",
            "category": "Identifier",
            "title": f"Candidate Key / ID: {p['name']}",
            "detail": f"{p['name']} has {p['unique_count']} unique values ({p['cardinality_pct']}% cardinality). Likely an identifier column.",
            "severity": "info",
        })

    # 5. Data Hygiene / Missing
    total_nulls = int(df.isnull().sum().sum())
    if total_nulls == 0:
        insights.append({
            "type": "quality",
            "category": "Completeness",
            "title": "Complete Dataset",
            "detail": f"All {n_rows} rows contain 0 missing values across all columns.",
            "severity": "success",
        })
    else:
        insights.append({
            "type": "quality",
            "category": "Completeness",
            "title": "Missing Values Identified",
            "detail": f"Total {total_nulls} missing entry/entries. Imputation or removal recommended in Phase 4.",
            "severity": "warning",
        })

    return insights


def compute_deep_profile(df: pd.DataFrame) -> Dict[str, Any]:
    """Execute complete deep statistical profiling pipeline on DataFrame."""
    num_profiles = []
    cat_profiles = []

    for col_name in df.columns:
        series = df[col_name]
        if pd.api.types.is_numeric_dtype(series):
            num_profiles.append(profile_numerical_column(series))
        else:
            cat_profiles.append(profile_categorical_column(series))

    corr_data = compute_correlations(df)
    insights = generate_automated_insights(df, num_profiles, cat_profiles, corr_data)

    # Health Score (0-100)
    total_cells = len(df) * max(1, len(df.columns))
    missing_cells = int(df.isnull().sum().sum())
    missing_ratio = missing_cells / total_cells if total_cells > 0 else 0
    duplicate_ratio = int(df.duplicated().sum()) / max(1, len(df))

    score = 100.0 - (missing_ratio * 40.0) - (duplicate_ratio * 25.0)
    quality_score = max(20, min(100, round(score)))

    return {
        "quality_score": quality_score,
        "numerical_profiles": num_profiles,
        "categorical_profiles": cat_profiles,
        "correlations": corr_data,
        "insights": insights,
    }
