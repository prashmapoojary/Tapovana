export function safeJsonParse(value) {
  try { return value ? JSON.parse(value) : null; } catch { return null; }
}

export function getToken() {
  return sessionStorage.getItem("access_token");
}

export function getUser() {
  return safeJsonParse(sessionStorage.getItem("user"));
}

export function getAccess() {
  return safeJsonParse(sessionStorage.getItem("access"));
}

export function roleLabel(role) {
  const map = {
    SUPER_ADMIN: "Super Admin",
    CO_ADMIN: "Co Admin",
    DOCTOR: "Doctor",
    THERAPIST: "Therapist"
  };
  return map[role] || role || "";
}