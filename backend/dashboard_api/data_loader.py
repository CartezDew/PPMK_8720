"""
CSV loader with in-memory caching.

The DataFrame is read once and stored in module-level state.  A file-mtime
check avoids stale data if the CSV is updated while the server is running.
"""

import logging
import os
import threading
import time

import numpy as np
import pandas as pd
from django.conf import settings

logger = logging.getLogger(__name__)

_lock = threading.Lock()
_cache: dict = {
    "df": None,
    "mtime": None,
}

EXPECTED_COLUMNS = {
    "Customer Code": "numeric",
    "Total Profit": "numeric",
    "# of Receivers": "numeric",
    "# of PPV Orders (last 12 Months)": "numeric",
    "Profit per Receiver": "numeric",
    "Profit per PPV order": "numeric",
    "DVR Service Profit": "numeric",
    "HD Service Profit": "numeric",
    "DVR Service": "numeric",
    "HD Programming Service": "numeric",
    "Est. Mortgage Loan Amount": "numeric",
    "Household Income": "numeric",
    "Age": "numeric",
    "Number of Total Rooms": "numeric",
    "Responder Rating": "numeric",
    "Cluster": "category",
    "Age Group": "category",
    "Gender": "category",
    "Homeowner": "category",
    "Dwelling Type Details": "category",
    "Education Status Details": "category",
    "Marital Status": "category",
}

# Binary lifestyle/interest flags from the data dictionary
LIFESTYLE_COLUMNS = [
    "Photography", "Gardening", "Cooking", "Gourmet Food",
    "Home Business", "Readers", "New Age", "Upscale", "Computer",
]

GENDER_MAP = {"0": "Female", "1": "Male"}
HOMEOWNER_MAP = {"0": "Renter", "1": "Homeowner"}
MARITAL_MAP = {"0": "Single", "1": "Married"}

FILTER_PARAM_MAP = {
    "cluster": "Cluster",
    "age_group": "Age Group",
    "dwelling": "Dwelling Type Details",
    "education": "Education Status Details",
    "gender": "Gender",
    "homeowner": "Homeowner",
    "marital": "Marital Status",
}


def _clean_numeric(series: pd.Series) -> pd.Series:
    """Strip $, commas, whitespace and coerce to float; NaN -> 0."""
    return (
        series.astype(str)
        .str.replace("$", "", regex=False)
        .str.replace(",", "", regex=False)
        .str.strip()
        .pipe(pd.to_numeric, errors="coerce")
        .fillna(0)
    )


def _load_and_clean() -> pd.DataFrame:
    csv_path = settings.CSV_FILE_PATH
    logger.info("Reading CSV from %s", csv_path)

    df = pd.read_csv(csv_path, low_memory=False)

    missing = [c for c in EXPECTED_COLUMNS if c not in df.columns]
    if missing:
        logger.warning("Missing expected columns: %s", missing)

    for col, dtype in EXPECTED_COLUMNS.items():
        if col not in df.columns:
            continue
        if dtype == "numeric":
            df[col] = _clean_numeric(df[col])
        else:
            df[col] = df[col].astype(str).str.strip()
            df[col] = df[col].replace({"nan": "Unknown", "": "Unknown"})

    for col in LIFESTYLE_COLUMNS:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors="coerce").fillna(0).astype(int)

    # Map coded values to human-readable labels for display
    if "Gender" in df.columns:
        df["Gender"] = df["Gender"].map(GENDER_MAP).fillna("Unknown")
    if "Homeowner" in df.columns:
        df["Homeowner"] = df["Homeowner"].map(HOMEOWNER_MAP).fillna("Unknown")
    if "Marital Status" in df.columns:
        df["Marital Status"] = df["Marital Status"].astype(str).map(MARITAL_MAP).fillna("Unknown")

    return df


def get_dataframe() -> pd.DataFrame:
    """Return the cached DataFrame, reloading only when the file changes."""
    csv_path = str(settings.CSV_FILE_PATH)
    try:
        current_mtime = os.path.getmtime(csv_path)
    except OSError:
        raise FileNotFoundError(f"CSV not found at {csv_path}")

    if _cache["df"] is not None and _cache["mtime"] == current_mtime:
        return _cache["df"]

    with _lock:
        if _cache["df"] is not None and _cache["mtime"] == current_mtime:
            return _cache["df"]

        start = time.time()
        df = _load_and_clean()
        elapsed = time.time() - start
        logger.info("CSV loaded: %d rows in %.2fs", len(df), elapsed)

        _cache["df"] = df
        _cache["mtime"] = current_mtime

    return _cache["df"]


def apply_filters(df: pd.DataFrame, params: dict) -> pd.DataFrame:
    """
    Apply query-string filters.  Multi-select via comma-separated values,
    e.g. ?cluster=1,2,3&gender=Male,Female
    """
    for param_name, col_name in FILTER_PARAM_MAP.items():
        raw = params.get(param_name)
        if not raw or col_name not in df.columns:
            continue
        values = [v.strip() for v in raw.split(",") if v.strip()]
        if values:
            df = df[df[col_name].isin(values)]
    return df
