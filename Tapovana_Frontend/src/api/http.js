import { getToken } from "../utils/session";

export const getApiBase = () => {
  if (typeof window === "undefined") {
    return "https://tapovana.onrender.com";
  }
  const hostname = window.location.hostname;
  if (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    /^192\.168\./.test(hostname) ||
    /^10\./.test(hostname)
  ) {
    return `http://${hostname}:5000`;
  }
  return "https://tapovana.onrender.com";
};

export const API_BASE = getApiBase();

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