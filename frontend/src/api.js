const envUrl = import.meta.env.VITE_API_BASE_URL?.trim();
const BASE = envUrl ? envUrl.replace(/\/+$/, "") : "http://localhost:8000";

if (import.meta.env.PROD && !envUrl) {
  console.warn(
    "[api] VITE_API_BASE_URL is not set — falling back to localhost. " +
    "Set this in your Netlify environment variables."
  );
}

function buildQuery(filters) {
  const params = new URLSearchParams();
  if (filters.cluster?.length)
    params.set("cluster", filters.cluster.join(","));
  if (filters.age_group?.length)
    params.set("age_group", filters.age_group.join(","));
  if (filters.dwelling?.length)
    params.set("dwelling", filters.dwelling.join(","));
  if (filters.education?.length)
    params.set("education", filters.education.join(","));
  if (filters.gender?.length)
    params.set("gender", filters.gender.join(","));
  if (filters.homeowner?.length)
    params.set("homeowner", filters.homeowner.join(","));
  if (filters.marital?.length)
    params.set("marital", filters.marital.join(","));
  return params.toString();
}

async function fetchJSON(path) {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) throw new Error(`API ${res.status}: ${res.statusText}`);
  return res.json();
}

export async function fetchHealth() {
  return fetchJSON("/api/health/");
}

export async function fetchMetadata() {
  return fetchJSON("/api/metadata/");
}

export async function fetchSummary(filters = {}) {
  const qs = buildQuery(filters);
  return fetchJSON(`/api/summary/${qs ? "?" + qs : ""}`);
}

export async function fetchCharts(filters = {}) {
  const qs = buildQuery(filters);
  return fetchJSON(`/api/charts/${qs ? "?" + qs : ""}`);
}

export async function fetchInsights(filters = {}) {
  const qs = buildQuery(filters);
  return fetchJSON(`/api/insights/${qs ? "?" + qs : ""}`);
}

export async function fetchTable(filters = {}, { page = 1, pageSize = 50, search = "", sortBy = "Total Profit", sortDir = "desc", ranking = "", bucket = "" } = {}) {
  const qs = buildQuery(filters);
  const extra = new URLSearchParams({
    page: String(page),
    page_size: String(pageSize),
    sort_by: sortBy,
    sort_dir: sortDir,
  });
  if (search) extra.set("search", search);
  if (ranking) extra.set("ranking", ranking);
  if (bucket) extra.set("bucket", bucket);
  const sep = qs ? `${qs}&${extra}` : extra.toString();
  return fetchJSON(`/api/table/?${sep}`);
}

export async function fetchClusterProfile(clusterId, filters = {}) {
  const qs = buildQuery(filters);
  return fetchJSON(`/api/cluster-profile/${clusterId}/${qs ? "?" + qs : ""}`);
}

export async function fetchRankingProfile(rankingType, filters = {}) {
  const qs = buildQuery(filters);
  return fetchJSON(`/api/ranking-profile/${rankingType}/${qs ? "?" + qs : ""}`);
}

export async function fetchBucketProfile(bucketType, filters = {}) {
  const qs = buildQuery(filters);
  return fetchJSON(`/api/bucket-profile/${bucketType}/${qs ? "?" + qs : ""}`);
}

export async function fetchAllRecords(filters = {}, { search = "", sortBy = "Total Profit", sortDir = "desc", ranking = "", bucket = "" } = {}) {
  const qs = buildQuery(filters);
  const extra = new URLSearchParams({
    page: "1",
    page_size: "99999",
    sort_by: sortBy,
    sort_dir: sortDir,
  });
  if (search) extra.set("search", search);
  if (ranking) extra.set("ranking", ranking);
  if (bucket) extra.set("bucket", bucket);
  const sep = qs ? `${qs}&${extra}` : extra.toString();
  return fetchJSON(`/api/table/?${sep}`);
}
