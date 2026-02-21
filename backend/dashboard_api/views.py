import logging
import math

import numpy as np
import pandas as pd
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status

from .data_loader import (
    get_dataframe, apply_filters, FILTER_PARAM_MAP, LIFESTYLE_COLUMNS,
)

logger = logging.getLogger(__name__)


def _safe_val(v):
    """Convert numpy/pandas scalars to plain Python types for JSON."""
    if isinstance(v, (np.integer,)):
        return int(v)
    if isinstance(v, (np.floating,)):
        f = float(v)
        return f if math.isfinite(f) else 0
    if isinstance(v, float) and not math.isfinite(v):
        return 0
    return v


def _get_filtered(request):
    df = get_dataframe()
    return apply_filters(df, request.query_params)


# --------------------------------------------------------------------------
# 1) Health check
# --------------------------------------------------------------------------
@api_view(["GET"])
def health(request):
    return Response({"status": "ok"})


# --------------------------------------------------------------------------
# 2) Metadata – unique filter values (now with human-readable labels)
# --------------------------------------------------------------------------
@api_view(["GET"])
def metadata(request):
    try:
        df = get_dataframe()
    except FileNotFoundError as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    result = {}
    filter_columns = {
        "cluster": "Cluster",
        "age_group": "Age Group",
        "dwelling": "Dwelling Type Details",
        "education": "Education Status Details",
        "gender": "Gender",
        "homeowner": "Homeowner",
    }
    for key, col in filter_columns.items():
        if col in df.columns:
            vals = sorted(df[col].dropna().unique().tolist(), key=str)
            result[key] = vals
        else:
            result[key] = []

    return Response(result)


# --------------------------------------------------------------------------
# 3) Summary – KPIs with profit component breakdowns
# --------------------------------------------------------------------------
@api_view(["GET"])
def summary(request):
    try:
        df = _get_filtered(request)
    except FileNotFoundError as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def col_sum(name):
        return _safe_val(df[name].sum()) if name in df.columns else 0

    def col_mean(name):
        return _safe_val(round(df[name].mean(), 2)) if name in df.columns and len(df) else 0

    profit = df["Total Profit"] if "Total Profit" in df.columns else pd.Series(dtype=float)

    kpis = {
        "total_customers": _safe_val(len(df)),
        "total_profit": col_sum("Total Profit"),
        "avg_profit": col_mean("Total Profit"),
        "median_profit": _safe_val(profit.median()) if len(profit) else 0,
        "total_receivers": col_sum("# of Receivers"),
        "total_ppv_orders": col_sum("# of PPV Orders (last 12 Months)"),
        # Profit component breakdowns
        "receiver_revenue": col_sum("Profit per Receiver"),
        "ppv_revenue": col_sum("Profit per PPV order"),
        "dvr_revenue": col_sum("DVR Service Profit"),
        "hd_revenue": col_sum("HD Service Profit"),
        # Service adoption rates
        "dvr_adoption": _safe_val(
            round((df["DVR Service"].gt(0).sum() / len(df) * 100), 1)
        ) if "DVR Service" in df.columns and len(df) else 0,
        "hd_adoption": _safe_val(
            round((df["HD Programming Service"].gt(0).sum() / len(df) * 100), 1)
        ) if "HD Programming Service" in df.columns and len(df) else 0,
        "avg_household_income": col_mean("Household Income"),
    }

    # Top clusters by profit
    top_clusters = []
    if "Cluster" in df.columns and "Total Profit" in df.columns:
        tc = (
            df.groupby("Cluster")["Total Profit"]
            .sum()
            .sort_values(ascending=False)
            .head(5)
        )
        top_clusters = [{"name": k, "value": _safe_val(v)} for k, v in tc.items()]

    return Response({**kpis, "top_clusters": top_clusters})


# --------------------------------------------------------------------------
# 4) Charts – aggregated datasets for marketing analysis
# --------------------------------------------------------------------------
@api_view(["GET"])
def charts(request):
    try:
        df = _get_filtered(request)
    except FileNotFoundError as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    # --- Profit by Cluster ---
    profit_by_cluster = []
    if "Cluster" in df.columns and "Total Profit" in df.columns:
        grp = df.groupby("Cluster")["Total Profit"].sum().reset_index()
        grp.columns = ["name", "value"]
        grp = grp.sort_values("value", ascending=False)
        profit_by_cluster = [
            {"name": f"Cluster {r['name']}", "value": _safe_val(r["value"])}
            for _, r in grp.iterrows()
        ]

    # --- Avg Profit by Age Group ---
    avg_profit_by_age = []
    if "Age Group" in df.columns and "Total Profit" in df.columns:
        age_order = [
            "Under 18", "18-24", "25-34", "35-44",
            "45-54", "55-64", "55-69", "65-69", "70-Above", "Unknown",
        ]
        grp = df.groupby("Age Group")["Total Profit"].mean().reset_index()
        grp.columns = ["name", "value"]
        grp["value"] = grp["value"].round(2)

        def age_sort_key(name):
            try:
                return age_order.index(name)
            except ValueError:
                return len(age_order)

        grp["_sort"] = grp["name"].apply(age_sort_key)
        grp = grp.sort_values("_sort").drop(columns="_sort")
        avg_profit_by_age = [
            {"name": str(r["name"]), "value": _safe_val(r["value"])}
            for _, r in grp.iterrows()
        ]

    # --- Profit Distribution ---
    profit_distribution = []
    if "Total Profit" in df.columns and len(df) > 0:
        col = df["Total Profit"]
        counts, edges = np.histogram(col, bins=20)
        profit_distribution = [
            {
                "bin": f"${int(edges[i]):,}-${int(edges[i + 1]):,}",
                "count": int(counts[i]),
            }
            for i in range(len(counts))
        ]

    # --- Profit by Dwelling Type ---
    dwelling_profit = []
    if "Dwelling Type Details" in df.columns and "Total Profit" in df.columns:
        grp = (
            df.groupby("Dwelling Type Details")["Total Profit"]
            .sum()
            .sort_values(ascending=False)
            .head(8)
            .reset_index()
        )
        grp.columns = ["name", "value"]
        dwelling_profit = [
            {"name": str(r["name"]), "value": _safe_val(r["value"])}
            for _, r in grp.iterrows()
        ]

    # --- Profit by Gender ---
    profit_by_gender = []
    if "Gender" in df.columns and "Total Profit" in df.columns:
        grp = df.groupby("Gender").agg(
            total_profit=("Total Profit", "sum"),
            avg_profit=("Total Profit", "mean"),
            count=("Total Profit", "size"),
        ).reset_index()
        profit_by_gender = [
            {
                "name": str(r["Gender"]),
                "total_profit": _safe_val(r["total_profit"]),
                "avg_profit": _safe_val(round(r["avg_profit"], 2)),
                "count": _safe_val(r["count"]),
            }
            for _, r in grp.iterrows()
        ]

    # --- Profit by Homeowner Status ---
    profit_by_homeowner = []
    if "Homeowner" in df.columns and "Total Profit" in df.columns:
        grp = df.groupby("Homeowner").agg(
            total_profit=("Total Profit", "sum"),
            avg_profit=("Total Profit", "mean"),
            count=("Total Profit", "size"),
        ).reset_index()
        profit_by_homeowner = [
            {
                "name": str(r["Homeowner"]),
                "total_profit": _safe_val(r["total_profit"]),
                "avg_profit": _safe_val(round(r["avg_profit"], 2)),
                "count": _safe_val(r["count"]),
            }
            for _, r in grp.iterrows()
        ]

    # --- Revenue breakdown by profit component ---
    profit_components = []
    comp_map = {
        "Receiver Revenue": "Profit per Receiver",
        "PPV Revenue": "Profit per PPV order",
        "DVR Revenue": "DVR Service Profit",
        "HD Revenue": "HD Service Profit",
    }
    for label, col_name in comp_map.items():
        if col_name in df.columns:
            profit_components.append({
                "name": label,
                "value": _safe_val(df[col_name].sum()),
            })

    # --- Customer Lifestyle / Interest profile ---
    lifestyle_data = []
    for col in LIFESTYLE_COLUMNS:
        if col in df.columns and len(df) > 0:
            pct = round(df[col].sum() / len(df) * 100, 1)
            lifestyle_data.append({
                "name": col,
                "pct": _safe_val(pct),
                "count": _safe_val(int(df[col].sum())),
            })
    lifestyle_data.sort(key=lambda x: x["pct"], reverse=True)

    # --- Profit by Education ---
    profit_by_education = []
    if "Education Status Details" in df.columns and "Total Profit" in df.columns:
        edu_order = ["High School", "Some College", "Completed College", "Graduate School", "Unknown"]
        grp = df.groupby("Education Status Details").agg(
            avg_profit=("Total Profit", "mean"),
            count=("Total Profit", "size"),
        ).reset_index()
        grp.columns = ["name", "avg_profit", "count"]
        grp["avg_profit"] = grp["avg_profit"].round(2)

        def edu_sort(n):
            try:
                return edu_order.index(n)
            except ValueError:
                return len(edu_order)

        grp["_s"] = grp["name"].apply(edu_sort)
        grp = grp.sort_values("_s").drop(columns="_s")
        profit_by_education = [
            {"name": r["name"], "avg_profit": _safe_val(r["avg_profit"]), "count": _safe_val(r["count"])}
            for _, r in grp.iterrows()
        ]

    return Response({
        "profit_by_cluster": profit_by_cluster,
        "avg_profit_by_age": avg_profit_by_age,
        "profit_distribution": profit_distribution,
        "dwelling_profit": dwelling_profit,
        "profit_by_gender": profit_by_gender,
        "profit_by_homeowner": profit_by_homeowner,
        "profit_components": profit_components,
        "lifestyle_data": lifestyle_data,
        "profit_by_education": profit_by_education,
    })


# --------------------------------------------------------------------------
# 5) Insights – top 10 / bottom 10 customers (required by assignment)
# --------------------------------------------------------------------------
@api_view(["GET"])
def insights(request):
    try:
        df = _get_filtered(request)
    except FileNotFoundError as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    detail_cols = [
        "Customer Code", "Total Profit", "# of Receivers",
        "# of PPV Orders (last 12 Months)", "DVR Service Profit",
        "HD Service Profit", "Age Group", "Gender", "Homeowner",
        "Dwelling Type Details", "Education Status Details", "Cluster",
    ]
    available = [c for c in detail_cols if c in df.columns]

    def to_rows(subset):
        rows = subset[available].to_dict(orient="records")
        for r in rows:
            for k, v in r.items():
                r[k] = _safe_val(v)
        return rows

    top10 = df.nlargest(10, "Total Profit") if "Total Profit" in df.columns else df.head(0)
    bottom10 = df.nsmallest(10, "Total Profit") if "Total Profit" in df.columns else df.head(0)

    # Cluster-level summary for strategic segmentation
    cluster_summary = []
    if "Cluster" in df.columns and "Total Profit" in df.columns:
        grp = df.groupby("Cluster").agg(
            customers=("Total Profit", "size"),
            total_profit=("Total Profit", "sum"),
            avg_profit=("Total Profit", "mean"),
            median_profit=("Total Profit", "median"),
            avg_receivers=("# of Receivers", "mean") if "# of Receivers" in df.columns else ("Total Profit", "size"),
            avg_ppv=("# of PPV Orders (last 12 Months)", "mean") if "# of PPV Orders (last 12 Months)" in df.columns else ("Total Profit", "size"),
        ).reset_index()
        for _, r in grp.iterrows():
            cluster_summary.append({
                "cluster": f"Cluster {r['Cluster']}",
                "customers": _safe_val(r["customers"]),
                "total_profit": _safe_val(r["total_profit"]),
                "avg_profit": _safe_val(round(r["avg_profit"], 2)),
                "median_profit": _safe_val(r["median_profit"]),
                "avg_receivers": _safe_val(round(r["avg_receivers"], 1)),
                "avg_ppv": _safe_val(round(r["avg_ppv"], 1)),
            })

    return Response({
        "columns": available,
        "top10": to_rows(top10),
        "bottom10": to_rows(bottom10),
        "cluster_summary": cluster_summary,
    })


# --------------------------------------------------------------------------
# 6) Table – paginated customer rows with search + sort
# --------------------------------------------------------------------------
TABLE_COLUMNS = [
    "Customer Code",
    "Cluster",
    "Age Group",
    "Total Profit",
    "# of Receivers",
    "# of PPV Orders (last 12 Months)",
    "DVR Service Profit",
    "HD Service Profit",
    "Gender",
    "Homeowner",
    "Dwelling Type Details",
    "Education Status Details",
]


@api_view(["GET"])
def table(request):
    try:
        df = _get_filtered(request)
    except FileNotFoundError as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    available_cols = [c for c in TABLE_COLUMNS if c in df.columns]
    view = df[available_cols].copy()

    search = request.query_params.get("search", "").strip().lower()
    if search:
        text_cols = [c for c in available_cols if view[c].dtype == object]
        if text_cols:
            mask = view[text_cols].apply(
                lambda col: col.str.lower().str.contains(search, na=False)
            ).any(axis=1)
            view = view[mask]

    sort_by = request.query_params.get("sort_by", "Total Profit")
    sort_dir = request.query_params.get("sort_dir", "desc")
    if sort_by in view.columns:
        view = view.sort_values(sort_by, ascending=(sort_dir == "asc"))

    total_count = len(view)

    try:
        page = max(int(request.query_params.get("page", 1)), 1)
    except (ValueError, TypeError):
        page = 1
    try:
        page_size = min(int(request.query_params.get("page_size", 50)), 200)
    except (ValueError, TypeError):
        page_size = 50

    start = (page - 1) * page_size
    end = start + page_size
    page_data = view.iloc[start:end]

    rows = page_data.to_dict(orient="records")
    for row in rows:
        for k, v in row.items():
            row[k] = _safe_val(v)

    return Response({
        "columns": available_cols,
        "rows": rows,
        "total_count": total_count,
        "page": page,
        "page_size": page_size,
        "total_pages": math.ceil(total_count / page_size) if page_size else 1,
    })
