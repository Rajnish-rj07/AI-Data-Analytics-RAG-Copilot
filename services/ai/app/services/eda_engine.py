"""
EDA (Exploratory Data Analysis) Engine
Provides automated statistical insights, smart chart recommendations,
and dynamic multi-dimensional aggregation queries for visualization.
"""

from typing import Any, Dict, List, Optional
import numpy as np
import pandas as pd


def _clean_num(val: Any, decimals: int = 2) -> Optional[float]:
    """Ensure value is JSON serializable number."""
    if pd.isna(val) or np.isinf(val):
        return None
    try:
        return round(float(val), decimals)
    except Exception:
        return None


def _detect_column_types(df: pd.DataFrame) -> Dict[str, List[str]]:
    """Classify DataFrame columns into numerical, categorical, and datetime."""
    numerical = []
    categorical = []
    datetime_cols = []

    for col in df.columns:
        series = df[col]
        # Check datetime
        if pd.api.types.is_datetime64_any_dtype(series):
            datetime_cols.append(col)
            continue
        
        # Try datetime conversion on string/object columns if names look temporal
        col_lower = str(col).lower()
        if any(term in col_lower for term in ["date", "time", "year", "month", "day", "created", "timestamp"]):
            try:
                converted = pd.to_datetime(series.dropna().head(20), errors="coerce")
                if converted.notna().sum() > 10:
                    datetime_cols.append(col)
                    continue
            except Exception:
                pass

        # Check numeric
        if pd.api.types.is_numeric_dtype(series):
            # Check if it's an ID or binary flag with very few unique values
            n_unique = series.nunique()
            if n_unique <= 2 and series.dropna().isin([0, 1]).all():
                categorical.append(col)
            else:
                numerical.append(col)
        else:
            categorical.append(col)

    return {
        "numerical": numerical,
        "categorical": categorical,
        "datetime": datetime_cols,
    }


def generate_eda_summary(df: pd.DataFrame) -> Dict[str, Any]:
    """
    Generate comprehensive automated EDA summary:
    1. Schema analysis (categoricals, numericals, datetimes)
    2. Statistical Insights (concentration, key drivers, correlations, skewness, variance)
    3. Auto-recommended chart specifications with pre-computed data payloads
    """
    col_types = _detect_column_types(df)
    num_cols = col_types["numerical"]
    cat_cols = col_types["categorical"]
    date_cols = col_types["datetime"]

    total_rows = len(df)
    insights: List[Dict[str, Any]] = []
    recommendations: List[Dict[str, Any]] = []

    # ── 1. STATISTICAL INSIGHTS ──────────────────────────────────────────────

    # A. Categorical Concentration & Dominance (Pareto Analysis)
    for col in cat_cols:
        series = df[col].dropna()
        if series.empty:
            continue
        counts = series.value_counts()
        n_unique = len(counts)
        if 2 <= n_unique <= 30:
            top_val = str(counts.index[0])
            top_cnt = int(counts.iloc[0])
            top_pct = round((top_cnt / total_rows) * 100, 1)

            if top_pct >= 40.0:
                insights.append({
                    "id": f"concentration-{col}",
                    "type": "concentration",
                    "category": "Concentration",
                    "title": f"Dominant Segment in {col}",
                    "description": f"'{top_val}' represents {top_pct}% of total records ({top_cnt} of {total_rows} rows).",
                    "metric": f"{top_pct}%",
                    "column": col,
                    "impact": "high" if top_pct >= 70.0 else "medium",
                })

    # B. Numerical Correlations (Strongest positive & negative pairs)
    if len(num_cols) >= 2:
        try:
            corr_df = df[num_cols].corr(method="pearson")
            pairs = []
            cols_seen = set()

            for i, c1 in enumerate(num_cols):
                for j, c2 in enumerate(num_cols):
                    if i < j:
                        r = corr_df.loc[c1, c2]
                        if not pd.isna(r) and not np.isinf(r):
                            pairs.append((c1, c2, float(r)))

            # Sort by absolute correlation descending
            pairs.sort(key=lambda x: abs(x[2]), reverse=True)

            for c1, c2, r in pairs[:3]:
                if abs(r) >= 0.40:
                    direction = "Positive" if r > 0 else "Negative"
                    strength = "Strong" if abs(r) >= 0.70 else "Moderate"
                    rel_desc = (
                        f"higher {c1} strongly associates with higher {c2}"
                        if r > 0
                        else f"higher {c1} strongly associates with lower {c2}"
                    )
                    insights.append({
                        "id": f"corr-{c1}-{c2}",
                        "type": "correlation",
                        "category": "Correlation",
                        "title": f"{strength} {direction} Correlation (r = {r:.2f})",
                        "description": f"Between '{c1}' and '{c2}': {rel_desc}.",
                        "metric": f"r = {r:+.2f}",
                        "column": f"{c1} & {c2}",
                        "impact": "high" if abs(r) >= 0.70 else "medium",
                    })
        except Exception:
            pass

    # C. Skewness & Distribution Asymmetry
    for col in num_cols:
        series = df[col].dropna()
        if len(series) > 5:
            try:
                skew = float(series.skew())
                if abs(skew) >= 1.2:
                    mean_val = _clean_num(series.mean())
                    median_val = _clean_num(series.median())
                    side = "right-skewed (tail towards high values)" if skew > 0 else "left-skewed (tail towards low values)"
                    insights.append({
                        "id": f"skew-{col}",
                        "type": "distribution",
                        "category": "Distribution",
                        "title": f"Significant Asymmetry in {col}",
                        "description": f"{col} is heavily {side} with skewness of {skew:.2f}. Median ({median_val}) diverges from mean ({mean_val}).",
                        "metric": f"Skew: {skew:+.2f}",
                        "column": col,
                        "impact": "medium",
                    })
            except Exception:
                pass

    # D. Key Numerical Value Drivers (Categorical x Numerical)
    if cat_cols and num_cols:
        # Pick primary numerical metric (highest sum/variance)
        primary_num = None
        best_sum = -1
        for col in num_cols:
            s = df[col].dropna()
            total_val = float(s.sum()) if not s.empty else 0
            if total_val > best_sum and not any(term in col.lower() for term in ["id", "rating", "year", "pct"]):
                best_sum = total_val
                primary_num = col

        if not primary_num:
            primary_num = num_cols[0]

        # Group by best categorical column (cardinality 2-15)
        for cat in cat_cols:
            s_cat = df[cat].dropna()
            if 2 <= s_cat.nunique() <= 15:
                grouped = df.groupby(cat)[primary_num].sum().sort_values(ascending=False)
                if not grouped.empty:
                    top_group = str(grouped.index[0])
                    top_val = float(grouped.iloc[0])
                    total_agg = float(grouped.sum())
                    if total_agg > 0:
                        pct = round((top_val / total_agg) * 100, 1)
                        if pct >= 30:
                            insights.append({
                                "id": f"driver-{cat}-{primary_num}",
                                "type": "driver",
                                "category": "Value Driver",
                                "title": f"Top Driver of {primary_num}",
                                "description": f"'{top_group}' generates {pct}% of aggregate {primary_num} ({_clean_num(top_val):,} out of {_clean_num(total_agg):,}).",
                                "metric": f"{pct}%",
                                "column": f"{cat} → {primary_num}",
                                "impact": "high" if pct >= 50 else "medium",
                            })
                            break

    # E. High Volatility / Dispersion
    for col in num_cols:
        series = df[col].dropna()
        if len(series) > 5:
            mean = float(series.mean())
            std = float(series.std())
            if mean > 0 and std > 0:
                cv = std / mean
                if cv >= 1.2:
                    insights.append({
                        "id": f"volatility-{col}",
                        "type": "variance",
                        "category": "Volatility",
                        "title": f"High Variability in {col}",
                        "description": f"Standard deviation ({_clean_num(std)}) exceeds the average ({_clean_num(mean)}), with Coefficient of Variation of {cv:.2f}.",
                        "metric": f"CV = {cv:.2f}",
                        "column": col,
                        "impact": "medium",
                    })

    # ── 2. AUTO-RECOMMENDED CHARTS ──────────────────────────────────────────

    # Chart 1: Categorical Volume Breakdown (Bar Chart)
    # Pick a categorical column with 2-12 unique values
    bar_cat = None
    for col in cat_cols:
        nunique = df[col].nunique()
        if 2 <= nunique <= 12:
            bar_cat = col
            break

    if bar_cat:
        vc = df[bar_cat].value_counts().head(10)
        data = [
            {"name": str(idx), "count": int(val), "percentage": round((val / total_rows) * 100, 1)}
            for idx, val in vc.items()
        ]
        recommendations.append({
            "id": f"rec-cat-count-{bar_cat}",
            "title": f"Record Distribution by {bar_cat}",
            "type": "bar",
            "description": f"Frequency distribution across top {len(data)} categories in {bar_cat}.",
            "x_col": bar_cat,
            "y_col": "count",
            "agg_func": "count",
            "data": data,
            "badge": "Volume Breakdown",
        })

    # Chart 2: Metric by Category (Column / Bar Chart)
    # Aggregated sum or mean of a key numeric column by category
    if cat_cols and num_cols:
        cat_for_agg = bar_cat or cat_cols[0]
        # Pick numeric column with good variance / monetary significance
        target_num = None
        for n in num_cols:
            if any(term in n.lower() for term in ["sales", "revenue", "amount", "price", "profit", "total", "cost"]):
                target_num = n
                break
        if not target_num:
            target_num = num_cols[0]

        grouped = df.groupby(cat_for_agg)[target_num].agg(["sum", "mean", "count"]).reset_index()
        grouped = grouped.sort_values(by="sum", ascending=False).head(10)
        data = [
            {
                "name": str(row[cat_for_agg]),
                "total": _clean_num(row["sum"]),
                "average": _clean_num(row["mean"]),
                "count": int(row["count"]),
            }
            for _, row in grouped.iterrows()
        ]
        recommendations.append({
            "id": f"rec-cat-metric-{cat_for_agg}-{target_num}",
            "title": f"Total {target_num} by {cat_for_agg}",
            "type": "bar",
            "description": f"Aggregate sum and average of {target_num} grouped by {cat_for_agg}.",
            "x_col": cat_for_agg,
            "y_col": target_num,
            "agg_func": "sum",
            "data": data,
            "badge": "Revenue & Value",
        })

    # Chart 3: Distribution Histogram of Primary Numeric Metric (Area / Bar Chart)
    if num_cols:
        hist_col = target_num if 'target_num' in locals() and target_num else num_cols[0]
        s_hist = df[hist_col].dropna()
        if len(s_hist) >= 5:
            try:
                n_bins = min(8, max(4, int(np.sqrt(len(s_hist)))))
                counts, bin_edges = np.histogram(s_hist, bins=n_bins)
                data = []
                for i in range(len(counts)):
                    low = _clean_num(bin_edges[i], 1)
                    high = _clean_num(bin_edges[i + 1], 1)
                    data.append({
                        "bin": f"{low} - {high}",
                        "count": int(counts[i]),
                        "min": low,
                        "max": high,
                    })
                recommendations.append({
                    "id": f"rec-hist-{hist_col}",
                    "title": f"Distribution Profile: {hist_col}",
                    "type": "area",
                    "description": f"Histogram binning showing frequency spread and density of {hist_col}.",
                    "x_col": "bin",
                    "y_col": "count",
                    "agg_func": "count",
                    "data": data,
                    "badge": "Density & Spread",
                })
            except Exception:
                pass

    # Chart 4: Bivariate Correlation / Scatter (Top 2 correlated numerical metrics)
    if len(num_cols) >= 2:
        try:
            corr_df = df[num_cols].corr(method="pearson")
            best_pair = None
            max_r = -1.0
            for i, c1 in enumerate(num_cols):
                for j, c2 in enumerate(num_cols):
                    if i < j:
                        r = abs(corr_df.loc[c1, c2])
                        if not pd.isna(r) and not np.isinf(r) and r > max_r:
                            max_r = r
                            best_pair = (c1, c2, corr_df.loc[c1, c2])

            if best_pair and max_r > 0.15:
                x_col_sc, y_col_sc, r_val = best_pair
                # Sample up to 60 points for responsive rendering
                sample_df = df[[x_col_sc, y_col_sc]].dropna()
                if len(sample_df) > 60:
                    sample_df = sample_df.sample(n=60, random_state=42)
                
                data = [
                    {
                        "x": _clean_num(row[x_col_sc]),
                        "y": _clean_num(row[y_col_sc]),
                        "index": idx,
                    }
                    for idx, row in sample_df.iterrows()
                ]
                recommendations.append({
                    "id": f"rec-scatter-{x_col_sc}-{y_col_sc}",
                    "title": f"Correlation: {x_col_sc} vs {y_col_sc}",
                    "type": "scatter",
                    "description": f"Bivariate scatter analysis with Pearson r = {r_val:.2f}.",
                    "x_col": x_col_sc,
                    "y_col": y_col_sc,
                    "correlation": round(float(r_val), 2),
                    "data": data,
                    "badge": f"Correlation (r = {r_val:+.2f})",
                })
        except Exception:
            pass

    # Chart 5: Composition & Percentage Share (Donut / Pie Chart)
    # A category with 2 to 6 unique values
    donut_cat = None
    for col in cat_cols:
        nunique = df[col].nunique()
        if 2 <= nunique <= 6:
            donut_cat = col
            break

    if donut_cat:
        vc = df[donut_cat].value_counts()
        data = [
            {"name": str(idx), "value": int(val), "pct": round((val / total_rows) * 100, 1)}
            for idx, val in vc.items()
        ]
        recommendations.append({
            "id": f"rec-donut-{donut_cat}",
            "title": f"Share by {donut_cat}",
            "type": "pie",
            "description": f"Proportional composition and percentage breakdown across {donut_cat}.",
            "x_col": donut_cat,
            "y_col": "value",
            "data": data,
            "badge": "Share & Composition",
        })

    # Chart 6: Multi-Dimensional Breakdown (Grouped Bar Chart)
    # If we have 2 categoricals and 1 numeric
    if len(cat_cols) >= 2 and num_cols:
        c1 = cat_cols[0]
        c2 = cat_cols[1]
        if df[c1].nunique() <= 8 and df[c2].nunique() <= 6:
            target_metric = target_num if 'target_num' in locals() and target_num else num_cols[0]
            try:
                pivot = df.pivot_table(
                    index=c1,
                    columns=c2,
                    values=target_metric,
                    aggfunc="sum",
                    fill_value=0,
                )
                pivot_data = []
                series_keys = [str(c) for c in pivot.columns]
                for idx, row in pivot.iterrows():
                    entry = {"name": str(idx)}
                    for col_key in pivot.columns:
                        entry[str(col_key)] = _clean_num(row[col_key])
                    pivot_data.append(entry)

                recommendations.append({
                    "id": f"rec-grouped-{c1}-{c2}-{target_metric}",
                    "title": f"{target_metric} by {c1} & {c2}",
                    "type": "grouped_bar",
                    "description": f"Multi-dimensional matrix breakdown comparing {c1} across {c2}.",
                    "x_col": c1,
                    "group_col": c2,
                    "y_col": target_metric,
                    "series_keys": series_keys,
                    "data": pivot_data,
                    "badge": "Multi-Dimension",
                })
            except Exception:
                pass

    return {
        "success": True,
        "schema_info": {
            "total_rows": total_rows,
            "total_columns": len(df.columns),
            "numerical_columns": num_cols,
            "categorical_columns": cat_cols,
            "datetime_columns": date_cols,
        },
        "insights": insights,
        "recommendations": recommendations,
    }


def execute_dynamic_aggregate(
    df: pd.DataFrame,
    x_col: str,
    y_col: Optional[str] = None,
    agg_func: str = "count",
    group_by_col: Optional[str] = None,
    limit: int = 20,
) -> Dict[str, Any]:
    """
    Executes dynamic aggregations on-demand for custom chart builder:
    Supports: sum, mean, count, min, max, median.
    Optional secondary group_by_col produces pivot format for multi-series charts.
    """
    if x_col not in df.columns:
        raise ValueError(f"X-axis column '{x_col}' does not exist in dataset.")

    valid_aggs = ["sum", "mean", "count", "min", "max", "median"]
    agg_func = agg_func.lower()
    if agg_func not in valid_aggs:
        agg_func = "count"

    # If count, y_col is not required; otherwise validate y_col
    if agg_func != "count":
        if not y_col:
            raise ValueError(f"Aggregation '{agg_func}' requires a numeric Y-axis column.")
        if y_col not in df.columns:
            raise ValueError(f"Y-axis column '{y_col}' does not exist in dataset.")
        if not pd.api.types.is_numeric_dtype(df[y_col]):
            raise ValueError(f"Column '{y_col}' is not numeric and cannot be aggregated with '{agg_func}'.")

    # Single-dimension aggregation
    if not group_by_col or group_by_col == "none" or group_by_col == x_col:
        if agg_func == "count":
            s = df[x_col].value_counts().head(limit)
            data = [
                {"name": str(k), "value": int(v), "percentage": round((v / len(df)) * 100, 1)}
                for k, v in s.items()
            ]
        else:
            grouped = df.groupby(x_col)[y_col].agg(agg_func).reset_index()
            grouped = grouped.sort_values(by=y_col, ascending=False).head(limit)
            data = [
                {"name": str(row[x_col]), "value": _clean_num(row[y_col])}
                for _, row in grouped.iterrows()
            ]

        return {
            "success": True,
            "x_col": x_col,
            "y_col": y_col or "count",
            "agg_func": agg_func,
            "group_by_col": None,
            "series_keys": ["value"],
            "data": data,
        }

    # Multi-dimension pivot aggregation (x_col vs group_by_col)
    if group_by_col not in df.columns:
        raise ValueError(f"Group-by column '{group_by_col}' does not exist in dataset.")

    metric_target = y_col if y_col and agg_func != "count" else df.columns[0]
    p_agg = "count" if agg_func == "count" else agg_func

    try:
        pivot = df.pivot_table(
            index=x_col,
            columns=group_by_col,
            values=metric_target,
            aggfunc=p_agg,
            fill_value=0,
        )
        # Limit rows to top limit by row total
        pivot["_row_sum"] = pivot.sum(axis=1)
        pivot = pivot.sort_values(by="_row_sum", ascending=False).head(limit)
        pivot = pivot.drop(columns=["_row_sum"])

        series_keys = [str(c) for c in pivot.columns]
        data = []
        for idx, row in pivot.iterrows():
            entry = {"name": str(idx)}
            for col_key in pivot.columns:
                entry[str(col_key)] = _clean_num(row[col_key]) if agg_func != "count" else int(row[col_key])
            data.append(entry)

        return {
            "success": True,
            "x_col": x_col,
            "y_col": y_col or "count",
            "agg_func": agg_func,
            "group_by_col": group_by_col,
            "series_keys": series_keys,
            "data": data,
        }
    except Exception as e:
        raise ValueError(f"Could not compute pivot aggregation: {str(e)}")
