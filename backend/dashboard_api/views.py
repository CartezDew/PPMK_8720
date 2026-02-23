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
        "marital": "Marital Status",
    }
    counts = {}
    for key, col in filter_columns.items():
        if col in df.columns:
            vals = sorted(df[col].dropna().unique().tolist(), key=str)
            result[key] = vals
            vc = df[col].value_counts()
            counts[key] = {str(v): int(vc.get(v, 0)) for v in vals}
        else:
            result[key] = []
            counts[key] = {}

    result["counts"] = counts
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
        grp = df.groupby("Cluster").agg(
            value=("Total Profit", "sum"),
            count=("Total Profit", "size"),
        ).reset_index()
        grp = grp.sort_values("value", ascending=False)
        profit_by_cluster = [
            {"name": f"Cluster {r['Cluster']}", "value": _safe_val(r["value"]), "count": _safe_val(r["count"])}
            for _, r in grp.iterrows()
        ]

    # --- Avg Profit by Age Group ---
    avg_profit_by_age = []
    if "Age Group" in df.columns and "Total Profit" in df.columns:
        age_order = [
            "Under 18", "18-24", "25-34", "35-44",
            "45-54", "55-64", "55-69", "65-69", "70-Above", "Unknown",
        ]
        grp = df.groupby("Age Group").agg(
            value=("Total Profit", "mean"),
            count=("Total Profit", "size"),
        ).reset_index()
        grp["value"] = grp["value"].round(2)

        def age_sort_key(name):
            try:
                return age_order.index(name)
            except ValueError:
                return len(age_order)

        grp["_sort"] = grp["Age Group"].apply(age_sort_key)
        grp = grp.sort_values("_sort").drop(columns="_sort")
        avg_profit_by_age = [
            {"name": str(r["Age Group"]), "value": _safe_val(r["value"]), "count": _safe_val(r["count"])}
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
        grp = df.groupby("Dwelling Type Details").agg(
            value=("Total Profit", "sum"),
            count=("Total Profit", "size"),
        ).reset_index()
        grp = grp.sort_values("value", ascending=False).head(8)
        dwelling_profit = [
            {"name": str(r["Dwelling Type Details"]), "value": _safe_val(r["value"]), "count": _safe_val(r["count"])}
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

    # --- Profit by Marital Status ---
    profit_by_marital = []
    if "Marital Status" in df.columns and "Total Profit" in df.columns:
        grp = df.groupby("Marital Status").agg(
            total_profit=("Total Profit", "sum"),
            avg_profit=("Total Profit", "mean"),
            count=("Total Profit", "size"),
        ).reset_index()
        profit_by_marital = [
            {
                "name": str(r["Marital Status"]),
                "total_profit": _safe_val(r["total_profit"]),
                "avg_profit": _safe_val(round(r["avg_profit"], 2)),
                "count": _safe_val(r["count"]),
            }
            for _, r in grp.iterrows()
        ]

    # --- Responder Rating Distribution ---
    responder_data = []
    if "Responder Rating" in df.columns and "Total Profit" in df.columns:
        grp = df.groupby("Responder Rating").agg(
            avg_profit=("Total Profit", "mean"),
            count=("Total Profit", "size"),
        ).reset_index()
        grp = grp.sort_values("Responder Rating")
        responder_data = [
            {
                "name": f"Rating {int(r['Responder Rating'])}",
                "avg_profit": _safe_val(round(r["avg_profit"], 2)),
                "count": _safe_val(r["count"]),
            }
            for _, r in grp.iterrows()
        ]

    # --- Lifestyle Profit Correlation ---
    lifestyle_profit = []
    if "Total Profit" in df.columns and len(df) > 0:
        overall_avg = df["Total Profit"].mean()
        for col in LIFESTYLE_COLUMNS:
            if col not in df.columns:
                continue
            active = df[df[col] == 1]
            inactive = df[df[col] != 1]
            if len(active) == 0:
                continue
            avg_yes = active["Total Profit"].mean()
            avg_no = inactive["Total Profit"].mean() if len(inactive) > 0 else 0
            diff = avg_yes - avg_no
            lifestyle_profit.append({
                "name": col,
                "avg_profit_yes": _safe_val(round(avg_yes, 2)),
                "avg_profit_no": _safe_val(round(avg_no, 2)),
                "diff": _safe_val(round(diff, 2)),
                "count": len(active),
                "pct": _safe_val(round(len(active) / len(df) * 100, 1)),
            })
        lifestyle_profit.sort(key=lambda x: x["diff"], reverse=True)

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
        "profit_by_marital": profit_by_marital,
        "responder_data": responder_data,
        "lifestyle_profit": lifestyle_profit,
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
        "Household Income", "Number of Total Rooms", "Marital Status",
        "Est. Mortgage Loan Amount",
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

    top10_buckets = []
    bottom10_buckets = []
    bucket_detail_cols = [
        "Customer Code", "Total Profit", "# of Receivers",
        "DVR Service Profit", "HD Service Profit",
        "Age Group", "Gender", "Cluster",
    ]
    bkt_avail = [c for c in bucket_detail_cols if c in df.columns]

    if "Total Profit" in df.columns:
        bucket_grp = df.groupby("Total Profit").agg(
            count=("Customer Code", "nunique") if "Customer Code" in df.columns else ("Total Profit", "size"),
        ).reset_index().rename(columns={"Total Profit": "profit"})
        bucket_grp["sum_profit"] = bucket_grp["profit"] * bucket_grp["count"]

        def bucket_customers(profit_val):
            subset = df[df["Total Profit"] == profit_val][bkt_avail].head(100)
            rows = subset.to_dict(orient="records")
            for row in rows:
                for k, v in row.items():
                    row[k] = _safe_val(v)
            return rows

        top_b = bucket_grp.nlargest(10, "profit")
        for _, r in top_b.iterrows():
            top10_buckets.append({
                "profit": _safe_val(r["profit"]),
                "count": _safe_val(r["count"]),
                "max_profit": _safe_val(r["profit"]),
                "sum_profit": _safe_val(r["sum_profit"]),
                "customers": bucket_customers(r["profit"]),
            })

        bottom_b = bucket_grp.nsmallest(10, "profit")
        for _, r in bottom_b.iterrows():
            bottom10_buckets.append({
                "profit": _safe_val(r["profit"]),
                "count": _safe_val(r["count"]),
                "min_profit": _safe_val(r["profit"]),
                "sum_profit": _safe_val(r["sum_profit"]),
                "customers": bucket_customers(r["profit"]),
            })

    return Response({
        "columns": available,
        "top10": to_rows(top10),
        "bottom10": to_rows(bottom10),
        "cluster_summary": cluster_summary,
        "top10_buckets": top10_buckets,
        "bottom10_buckets": bottom10_buckets,
    })


# --------------------------------------------------------------------------
# 6) Cluster profile – demographic breakdown for a single cluster
# --------------------------------------------------------------------------
@api_view(["GET"])
def cluster_profile(request, cluster_id):
    df = get_dataframe()
    if "Cluster" not in df.columns:
        return Response({"error": "No Cluster column"}, status=400)

    cdf = df[df["Cluster"].astype(str) == str(cluster_id)]
    cdf = apply_filters(cdf, request.query_params)
    if cdf.empty:
        return Response({"error": "No data for this cluster"}, status=404)

    total = len(cdf)

    def breakdown(col, agg_cols=None):
        if col not in cdf.columns:
            return []
        grp = cdf.groupby(col)
        rows = []
        for val, g in grp:
            row = {"name": _safe_val(val), "count": len(g), "pct": round(len(g) / total * 100, 1)}
            if "# of Receivers" in g.columns:
                row["avg_receivers"] = _safe_val(round(g["# of Receivers"].mean(), 1))
            if "Age" in g.columns:
                row["avg_age"] = _safe_val(round(g["Age"].mean()))
            if "Household Income" in g.columns:
                row["avg_income"] = _safe_val(round(g["Household Income"].mean()))
            rows.append(row)
        rows.sort(key=lambda r: r["count"], reverse=True)
        return rows

    lifestyle = {}
    for col in LIFESTYLE_COLUMNS:
        if col in cdf.columns:
            active_mask = cdf[col] == 1
            active = int(active_mask.sum())
            inactive = total - active
            active_grp = cdf[active_mask]
            inactive_grp = cdf[~active_mask]
            entry = {
                "count": active,
                "pct": round(active / total * 100, 1),
            }
            if "Household Income" in cdf.columns:
                entry["avg_income_yes"] = _safe_val(round(active_grp["Household Income"].mean())) if active > 0 else 0
                entry["avg_income_no"] = _safe_val(round(inactive_grp["Household Income"].mean())) if inactive > 0 else 0
            if "Total Profit" in cdf.columns:
                entry["avg_profit_yes"] = _safe_val(round(active_grp["Total Profit"].mean(), 2)) if active > 0 else 0
                entry["avg_profit_no"] = _safe_val(round(inactive_grp["Total Profit"].mean(), 2)) if inactive > 0 else 0
            lifestyle[col.lower().replace(" ", "_")] = entry

    resp_breakdown = []
    if "Responder Rating" in cdf.columns:
        resp_breakdown = breakdown("Responder Rating")

    def simple_breakdown(col):
        if col not in cdf.columns:
            return []
        grp = cdf.groupby(col)
        rows = []
        for val, g in grp:
            avg_profit = _safe_val(round(g["Total Profit"].mean(), 2)) if "Total Profit" in g.columns else 0
            total_profit_grp = _safe_val(g["Total Profit"].sum()) if "Total Profit" in g.columns else 0
            rows.append({
                "name": _safe_val(val),
                "count": len(g),
                "pct": round(len(g) / total * 100, 1),
                "avg_profit": avg_profit,
                "total_profit": total_profit_grp,
            })
        rows.sort(key=lambda r: r["count"], reverse=True)
        return rows

    dvr_adopters = int((cdf["DVR Service"] == 1).sum()) if "DVR Service" in cdf.columns else 0
    hd_adopters = int((cdf["HD Programming Service"] == 1).sum()) if "HD Programming Service" in cdf.columns else 0
    ppv_users = int((cdf["# of PPV Orders (last 12 Months)"] > 0).sum()) if "# of PPV Orders (last 12 Months)" in cdf.columns else 0

    service_adoption = {
        "dvr": {"count": dvr_adopters, "pct": round(dvr_adopters / total * 100, 1)},
        "hd": {"count": hd_adopters, "pct": round(hd_adopters / total * 100, 1)},
        "ppv": {"count": ppv_users, "pct": round(ppv_users / total * 100, 1)},
    }

    avg_mortgage = _safe_val(round(cdf["Est. Mortgage Loan Amount"].mean())) if "Est. Mortgage Loan Amount" in cdf.columns else 0
    avg_rooms = _safe_val(round(cdf["Number of Total Rooms"].mean(), 1)) if "Number of Total Rooms" in cdf.columns else 0

    profile = {
        "cluster": str(cluster_id),
        "total_customers": total,
        "total_all_customers": len(df),
        "avg_profit": _safe_val(round(cdf["Total Profit"].mean(), 2)) if "Total Profit" in cdf.columns else 0,
        "total_profit": _safe_val(cdf["Total Profit"].sum()) if "Total Profit" in cdf.columns else 0,
        "avg_receivers": _safe_val(round(cdf["# of Receivers"].mean(), 1)) if "# of Receivers" in cdf.columns else 0,
        "avg_age": _safe_val(round(cdf["Age"].mean())) if "Age" in cdf.columns else 0,
        "avg_income": _safe_val(round(cdf["Household Income"].mean())) if "Household Income" in cdf.columns else 0,
        "avg_mortgage": avg_mortgage,
        "avg_rooms": avg_rooms,
        "gender": simple_breakdown("Gender"),
        "marital": simple_breakdown("Marital Status"),
        "homeowner_status": simple_breakdown("Homeowner"),
        "service_adoption": service_adoption,
        "dwelling": breakdown("Dwelling Type Details"),
        "education": breakdown("Education Status Details"),
        "home_business": breakdown("Home Business"),
        "responder_rating": resp_breakdown,
        "lifestyle": lifestyle,
    }
    return Response(profile)


# --------------------------------------------------------------------------
# 7) Ranking profile – demographic breakdown for top/bottom 10 customers
# --------------------------------------------------------------------------
@api_view(["GET"])
def ranking_profile(request, ranking_type):
    if ranking_type not in ("top10", "bottom10"):
        return Response({"error": "Invalid ranking type"}, status=400)

    df = get_dataframe()
    if "Total Profit" not in df.columns:
        return Response({"error": "No Total Profit column"}, status=400)

    filtered_df = apply_filters(df, request.query_params)
    if filtered_df.empty:
        return Response({"error": "No data after filters"}, status=404)

    if ranking_type == "top10":
        cdf = filtered_df.nlargest(10, "Total Profit")
    else:
        cdf = filtered_df.nsmallest(10, "Total Profit")

    total = len(cdf)

    def breakdown(col):
        if col not in cdf.columns:
            return []
        grp = cdf.groupby(col)
        rows = []
        for val, g in grp:
            row = {"name": _safe_val(val), "count": len(g), "pct": round(len(g) / total * 100, 1)}
            if "# of Receivers" in g.columns:
                row["avg_receivers"] = _safe_val(round(g["# of Receivers"].mean(), 1))
            if "Age" in g.columns:
                row["avg_age"] = _safe_val(round(g["Age"].mean()))
            if "Household Income" in g.columns:
                row["avg_income"] = _safe_val(round(g["Household Income"].mean()))
            rows.append(row)
        rows.sort(key=lambda r: r["count"], reverse=True)
        return rows

    lifestyle = {}
    for col in LIFESTYLE_COLUMNS:
        if col in cdf.columns:
            active_mask = cdf[col] == 1
            active = int(active_mask.sum())
            inactive = total - active
            active_grp = cdf[active_mask]
            inactive_grp = cdf[~active_mask]
            entry = {
                "count": active,
                "pct": round(active / total * 100, 1),
            }
            if "Household Income" in cdf.columns:
                entry["avg_income_yes"] = _safe_val(round(active_grp["Household Income"].mean())) if active > 0 else 0
                entry["avg_income_no"] = _safe_val(round(inactive_grp["Household Income"].mean())) if inactive > 0 else 0
            if "Total Profit" in cdf.columns:
                entry["avg_profit_yes"] = _safe_val(round(active_grp["Total Profit"].mean(), 2)) if active > 0 else 0
                entry["avg_profit_no"] = _safe_val(round(inactive_grp["Total Profit"].mean(), 2)) if inactive > 0 else 0
            lifestyle[col.lower().replace(" ", "_")] = entry

    resp_breakdown = []
    if "Responder Rating" in cdf.columns:
        resp_breakdown = breakdown("Responder Rating")

    def simple_breakdown(col):
        if col not in cdf.columns:
            return []
        grp = cdf.groupby(col)
        rows = []
        for val, g in grp:
            avg_profit = _safe_val(round(g["Total Profit"].mean(), 2)) if "Total Profit" in g.columns else 0
            total_profit_grp = _safe_val(g["Total Profit"].sum()) if "Total Profit" in g.columns else 0
            rows.append({
                "name": _safe_val(val),
                "count": len(g),
                "pct": round(len(g) / total * 100, 1),
                "avg_profit": avg_profit,
                "total_profit": total_profit_grp,
            })
        rows.sort(key=lambda r: r["count"], reverse=True)
        return rows

    dvr_adopters = int((cdf["DVR Service"] == 1).sum()) if "DVR Service" in cdf.columns else 0
    hd_adopters = int((cdf["HD Programming Service"] == 1).sum()) if "HD Programming Service" in cdf.columns else 0
    ppv_users = int((cdf["# of PPV Orders (last 12 Months)"] > 0).sum()) if "# of PPV Orders (last 12 Months)" in cdf.columns else 0

    service_adoption = {
        "dvr": {"count": dvr_adopters, "pct": round(dvr_adopters / total * 100, 1)},
        "hd": {"count": hd_adopters, "pct": round(hd_adopters / total * 100, 1)},
        "ppv": {"count": ppv_users, "pct": round(ppv_users / total * 100, 1)},
    }

    avg_mortgage = _safe_val(round(cdf["Est. Mortgage Loan Amount"].mean())) if "Est. Mortgage Loan Amount" in cdf.columns else 0
    avg_rooms = _safe_val(round(cdf["Number of Total Rooms"].mean(), 1)) if "Number of Total Rooms" in cdf.columns else 0

    # Individual customer rows for the detail table
    detail_cols = [
        "Customer Code", "Total Profit", "# of Receivers",
        "Age Group", "Gender", "Homeowner", "Cluster",
    ]
    avail = [c for c in detail_cols if c in cdf.columns]
    customers = cdf[avail].to_dict(orient="records")
    for row in customers:
        for k, v in row.items():
            row[k] = _safe_val(v)

    profile = {
        "ranking_type": ranking_type,
        "total_customers": total,
        "total_all_customers": len(filtered_df),
        "avg_profit": _safe_val(round(cdf["Total Profit"].mean(), 2)),
        "total_profit": _safe_val(cdf["Total Profit"].sum()),
        "avg_receivers": _safe_val(round(cdf["# of Receivers"].mean(), 1)) if "# of Receivers" in cdf.columns else 0,
        "avg_age": _safe_val(round(cdf["Age"].mean())) if "Age" in cdf.columns else 0,
        "avg_income": _safe_val(round(cdf["Household Income"].mean())) if "Household Income" in cdf.columns else 0,
        "avg_mortgage": avg_mortgage,
        "avg_rooms": avg_rooms,
        "gender": simple_breakdown("Gender"),
        "marital": simple_breakdown("Marital Status"),
        "homeowner_status": simple_breakdown("Homeowner"),
        "service_adoption": service_adoption,
        "dwelling": breakdown("Dwelling Type Details"),
        "education": breakdown("Education Status Details"),
        "home_business": breakdown("Home Business"),
        "responder_rating": resp_breakdown,
        "lifestyle": lifestyle,
        "customers": customers,
    }
    return Response(profile)


# --------------------------------------------------------------------------
# 8) Bucket profile – demographic breakdown for top/bottom 10 profit buckets
# --------------------------------------------------------------------------
@api_view(["GET"])
def bucket_profile(request, bucket_type):
    if bucket_type not in ("top10", "bottom10"):
        return Response({"error": "Invalid bucket type"}, status=400)

    df = get_dataframe()
    if "Total Profit" not in df.columns:
        return Response({"error": "No Total Profit column"}, status=400)

    filtered_df = apply_filters(df, request.query_params)
    if filtered_df.empty:
        return Response({"error": "No data after filters"}, status=404)

    unique_profits = filtered_df["Total Profit"].drop_duplicates()
    if bucket_type == "top10":
        bucket_vals = unique_profits.nlargest(10).values
    else:
        bucket_vals = unique_profits.nsmallest(10).values

    cdf = filtered_df[filtered_df["Total Profit"].isin(bucket_vals)]
    total = len(cdf)
    if total == 0:
        return Response({"error": "No data for these buckets"}, status=404)

    bucket_list = []
    for val in sorted(bucket_vals, reverse=(bucket_type == "top10")):
        subset = cdf[cdf["Total Profit"] == val]
        bucket_list.append({
            "profit": _safe_val(val),
            "count": len(subset),
            "sum_profit": _safe_val(val * len(subset)),
        })

    def breakdown(col):
        if col not in cdf.columns:
            return []
        grp = cdf.groupby(col)
        rows = []
        for val, g in grp:
            row = {"name": _safe_val(val), "count": len(g), "pct": round(len(g) / total * 100, 1)}
            if "# of Receivers" in g.columns:
                row["avg_receivers"] = _safe_val(round(g["# of Receivers"].mean(), 1))
            if "Age" in g.columns:
                row["avg_age"] = _safe_val(round(g["Age"].mean()))
            if "Household Income" in g.columns:
                row["avg_income"] = _safe_val(round(g["Household Income"].mean()))
            rows.append(row)
        rows.sort(key=lambda r: r["count"], reverse=True)
        return rows

    lifestyle = {}
    for col in LIFESTYLE_COLUMNS:
        if col in cdf.columns:
            active_mask = cdf[col] == 1
            active = int(active_mask.sum())
            inactive = total - active
            active_grp = cdf[active_mask]
            inactive_grp = cdf[~active_mask]
            entry = {
                "count": active,
                "pct": round(active / total * 100, 1),
            }
            if "Household Income" in cdf.columns:
                entry["avg_income_yes"] = _safe_val(round(active_grp["Household Income"].mean())) if active > 0 else 0
                entry["avg_income_no"] = _safe_val(round(inactive_grp["Household Income"].mean())) if inactive > 0 else 0
            if "Total Profit" in cdf.columns:
                entry["avg_profit_yes"] = _safe_val(round(active_grp["Total Profit"].mean(), 2)) if active > 0 else 0
                entry["avg_profit_no"] = _safe_val(round(inactive_grp["Total Profit"].mean(), 2)) if inactive > 0 else 0
            lifestyle[col.lower().replace(" ", "_")] = entry

    resp_breakdown = []
    if "Responder Rating" in cdf.columns:
        resp_breakdown = breakdown("Responder Rating")

    def simple_breakdown(col):
        if col not in cdf.columns:
            return []
        grp = cdf.groupby(col)
        rows = []
        for val, g in grp:
            avg_profit = _safe_val(round(g["Total Profit"].mean(), 2)) if "Total Profit" in g.columns else 0
            total_profit_grp = _safe_val(g["Total Profit"].sum()) if "Total Profit" in g.columns else 0
            rows.append({
                "name": _safe_val(val),
                "count": len(g),
                "pct": round(len(g) / total * 100, 1),
                "avg_profit": avg_profit,
                "total_profit": total_profit_grp,
            })
        rows.sort(key=lambda r: r["count"], reverse=True)
        return rows

    dvr_adopters = int((cdf["DVR Service"] == 1).sum()) if "DVR Service" in cdf.columns else 0
    hd_adopters = int((cdf["HD Programming Service"] == 1).sum()) if "HD Programming Service" in cdf.columns else 0
    ppv_users = int((cdf["# of PPV Orders (last 12 Months)"] > 0).sum()) if "# of PPV Orders (last 12 Months)" in cdf.columns else 0

    service_adoption = {
        "dvr": {"count": dvr_adopters, "pct": round(dvr_adopters / total * 100, 1)},
        "hd": {"count": hd_adopters, "pct": round(hd_adopters / total * 100, 1)},
        "ppv": {"count": ppv_users, "pct": round(ppv_users / total * 100, 1)},
    }

    avg_mortgage = _safe_val(round(cdf["Est. Mortgage Loan Amount"].mean())) if "Est. Mortgage Loan Amount" in cdf.columns else 0
    avg_rooms = _safe_val(round(cdf["Number of Total Rooms"].mean(), 1)) if "Number of Total Rooms" in cdf.columns else 0

    profile = {
        "bucket_type": bucket_type,
        "total_customers": total,
        "total_all_customers": len(filtered_df),
        "num_buckets": len(bucket_vals),
        "buckets": bucket_list,
        "avg_profit": _safe_val(round(cdf["Total Profit"].mean(), 2)),
        "total_profit": _safe_val(cdf["Total Profit"].sum()),
        "avg_receivers": _safe_val(round(cdf["# of Receivers"].mean(), 1)) if "# of Receivers" in cdf.columns else 0,
        "avg_age": _safe_val(round(cdf["Age"].mean())) if "Age" in cdf.columns else 0,
        "avg_income": _safe_val(round(cdf["Household Income"].mean())) if "Household Income" in cdf.columns else 0,
        "avg_mortgage": avg_mortgage,
        "avg_rooms": avg_rooms,
        "gender": simple_breakdown("Gender"),
        "marital": simple_breakdown("Marital Status"),
        "homeowner_status": simple_breakdown("Homeowner"),
        "service_adoption": service_adoption,
        "dwelling": breakdown("Dwelling Type Details"),
        "education": breakdown("Education Status Details"),
        "home_business": breakdown("Home Business"),
        "responder_rating": resp_breakdown,
        "lifestyle": lifestyle,
    }
    return Response(profile)


# --------------------------------------------------------------------------
# 9) Table – paginated customer rows with search + sort
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
    "Household Income",
    "Number of Total Rooms",
    "Marital Status",
    "Est. Mortgage Loan Amount",
]


@api_view(["GET"])
def table(request):
    try:
        df = _get_filtered(request)
    except FileNotFoundError as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    ranking = request.query_params.get("ranking", "").strip()
    if ranking in ("top10", "bottom10"):
        if "Total Profit" in df.columns:
            df = df.nlargest(10, "Total Profit") if ranking == "top10" else df.nsmallest(10, "Total Profit")

    bucket = request.query_params.get("bucket", "").strip()
    if bucket in ("top10", "bottom10"):
        if "Total Profit" in df.columns:
            unique_profits = df["Total Profit"].drop_duplicates()
            bucket_vals = unique_profits.nlargest(10).values if bucket == "top10" else unique_profits.nsmallest(10).values
            df = df[df["Total Profit"].isin(bucket_vals)]

    available_cols = [c for c in TABLE_COLUMNS if c in df.columns]
    view = df[available_cols].copy()

    search_raw = request.query_params.get("search", "").strip()
    MONEY_COLS = {"Total Profit", "DVR Service Profit", "HD Service Profit"}
    is_dollar_search = search_raw.startswith("$")
    search = search_raw.lower().replace("$", "").replace(",", "")
    if search:
        if is_dollar_search:
            try:
                val = float(search)
                money_available = [c for c in MONEY_COLS if c in view.columns]
                mask = view[money_available].apply(
                    lambda col: col == val
                ).any(axis=1)
            except ValueError:
                mask = view.apply(
                    lambda col: col.astype(str).str.lower().str.contains(search, na=False, regex=False)
                ).any(axis=1)
        else:
            mask = view.apply(
                lambda col: col.astype(str).str.lower().str.contains(search, na=False, regex=False)
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
        page_size = min(int(request.query_params.get("page_size", 50)), 100000)
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
