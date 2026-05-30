import { getToken } from "../utils/session";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";

export async function apiFetch(path, options = {}) {
  const token = getToken();
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {})
  };

  if (options.headers?.["Content-Type"] === "undefined") {
    delete headers["Content-Type"];
  }

  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
}