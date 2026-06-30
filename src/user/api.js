// api.js — Shared backend API client
// =====================================
// NOTE: confirmed working backend port is 5000 (verified live via browser
// console test against /api/auth/vehicles/mine). If your backend actually
// runs on a different port, update this.
const API_BASE_URL = "https://drivelegal-backend-sdkv.onrender.com/api";

// The backend (middleware/auth.js) authenticates via a Bearer token read
// from the Authorization header — NOT cookies. The token is stored in
// localStorage under "smartroad_token" (confirmed via Application tab).
const TOKEN_KEY = "smartroad_token";

function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

function authHeader() {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function apiFetch(path, options = {}) {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...authHeader(),
      ...(options.headers || {}),
    },
    ...options,
  });

  if (res.status === 401) {
    // Token missing/invalid/expired — caller should redirect to login
    const err = new Error("UNAUTHENTICATED");
    err.status = 401;
    throw err;
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message || `API error: ${res.status}`);
  }
  return res.json();
}

export const api = {
  // ── Auth / Session ──
  getCurrentUser: () => apiFetch("/auth/me"),
  login: (email, password) =>
    apiFetch("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }),
  logout: () => apiFetch("/auth/logout", { method: "POST" }),

  // ── Challans (user-facing, approved violations) ──
  getMyChallans: () => apiFetch("/violations/mine"),
  payChallan: (id) => apiFetch(`/challans/${id}/pay`, { method: "POST" }),

  // ── Violations (analyst) ──
  getPendingViolations: () => apiFetch("/violations/pending"),
  approveViolation: (id) => apiFetch(`/violations/${id}/approve`, { method: "PATCH" }),
  rejectViolation: (id) => apiFetch(`/violations/${id}/reject`, { method: "PATCH" }),

  // ── Violations (officer) ──
  lookupOwnerByPlate: (plate) => apiFetch(`/violations/vehicle-lookup?plate=${encodeURIComponent(plate)}`),
  getMyIssuedViolations: () => apiFetch("/violations/my"),
};

// Special variant for multipart (FormData) requests — bypasses JSON content-type
// so the browser can set the correct multipart boundary itself.
export async function apiFetchMultipart(path, formData) {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers: { ...authHeader() }, // no Content-Type — browser sets it for FormData
    body: formData,
  });
  if (res.status === 401) {
    const err = new Error("UNAUTHENTICATED");
    err.status = 401;
    throw err;
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message || `API error: ${res.status}`);
  }
  return res.json();
}
