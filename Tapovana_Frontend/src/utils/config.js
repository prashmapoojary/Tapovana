export const getApiBase = () => {
  if (typeof window === "undefined") {
    return "https://tapovana.onrender.com";
  }
  const hostname = window.location.hostname;
  // If running on local machine or local hotspot network
  if (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    /^192\.168\./.test(hostname) ||
    /^10\./.test(hostname)
  ) {
    return `http://${hostname}:5000`;
  }
  // Fallback to the live production Render URL
  return "https://tapovana.onrender.com";
};

export const API_BASE = getApiBase();
