import { getToken } from "../utils/session";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

export async function apiFetch(path, options = {}) {
  const token = getToken();
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {})
  };

  if (token) headers.Authorization = `Bearer ${token}`;

  const url = path.startsWith("http://") || path.startsWith("https://") ? path : `${API_BASE}${path}`;
  const res = await fetch(url, { ...options, headers });

  if (res.status === 401) {
    sessionStorage.clear();
    window.location.href = "/";
    throw new Error("Session expired. Please login again.");
  }

  const data = await res.json().catch(() => ({}));

  if (!res.ok) throw new Error(data.message || data.error || "Request failed");

  return data;
}