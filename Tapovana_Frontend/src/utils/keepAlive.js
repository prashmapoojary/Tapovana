/**
 * keepAlive.js
 *
 * Prevents the Render free-tier backend from going to sleep by pinging
 * the /health endpoint every 14 minutes (Render sleeps after 15 min idle).
 *
 * Starts automatically when the frontend loads and runs silently in the background.
 */

const API_BASE = (() => {
  if (typeof window === "undefined") return "https://tapovana.onrender.com";
  const hostname = window.location.hostname;
  if (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    /^192\.168\./.test(hostname) ||
    /^10\./.test(hostname)
  ) {
    return `http://${hostname}:5000`;
  }
  return import.meta.env.VITE_API_BASE_URL || "https://tapovana.onrender.com";
})();
const PING_INTERVAL_MS = 14 * 60 * 1000; // 14 minutes

let intervalId = null;

async function pingServer() {
  try {
    const res = await fetch(`${API_BASE}/health`, {
      method: "GET",
      cache: "no-store",
    });
    const data = await res.json().catch(() => ({}));
    console.log(
      `[KeepAlive] ✅ Backend alive — ${new Date().toLocaleTimeString()} | status: ${data.status || "ok"}`
    );
  } catch (err) {
    console.warn(`[KeepAlive] ⚠️ Backend ping failed — ${new Date().toLocaleTimeString()}`, err.message);
  }
}

/**
 * Starts the keep-alive cron.
 * Pings immediately on call, then repeats every PING_INTERVAL_MS.
 * Safe to call multiple times — won't create duplicate intervals.
 */
export function startKeepAlive() {
  if (intervalId !== null) return; // already running

  pingServer(); // ping immediately on startup

  intervalId = setInterval(pingServer, PING_INTERVAL_MS);
  console.log(
    `[KeepAlive] 🟢 Started — pinging ${API_BASE}/health every 14 minutes.`
  );
}

/**
 * Stops the keep-alive cron (e.g. on logout or cleanup).
 */
export function stopKeepAlive() {
  if (intervalId !== null) {
    clearInterval(intervalId);
    intervalId = null;
    console.log("[KeepAlive] 🔴 Stopped.");
  }
}
