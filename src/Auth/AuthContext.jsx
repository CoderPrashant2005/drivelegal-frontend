// AuthContext.jsx — fully API-driven (Node.js + MySQL)
// All auth goes through /api/auth/* — no localStorage user store.
// Only the session token is kept in localStorage for page-refresh persistence.

import React, { createContext, useContext, useState } from "react";

const AuthContext = createContext();

const API_BASE     = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
const TOKEN_KEY    = "smartroad_token";
const REFRESH_KEY  = "smartroad_refresh";
const SESSION_KEY  = "smartroad_session";

// ── tiny fetch wrapper ────────────────────────────────────────────────────────
async function apiFetch(path, options = {}, token = null) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Request failed");
  return data;
}

// ── role → frontend redirect map (used by login pages) ───────────────────────
export const roleRedirects = {
  rto_chief:   "/admin/rto-chief",
  rto_officer: "/admin/rto-officer",
  analyst:     "/admin/analyst",
  user:        "/user/dashboard",
};

export function AuthProvider({ children }) {

  // Restore session from localStorage on page refresh
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem(SESSION_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  });

  // Expose token so components like RTOChief can pass it to apiFetch
  const token = localStorage.getItem(TOKEN_KEY);

  // ── LOGIN (citizens + all admin roles — one endpoint handles both) ──────────
  const login = async (email, password) => {
    const data = await apiFetch("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });

    // Persist tokens
    localStorage.setItem(TOKEN_KEY,   data.token);
    localStorage.setItem(REFRESH_KEY, data.refreshToken);

    const session = {
      id:        data.user.id,
      name:      data.user.full_name,
      email:     data.user.email,
      role:      (data.user.role || "").toLowerCase(), // user | rto_chief | rto_officer | analyst — normalized in case the DB enum is uppercase
      token:     data.token,             // convenient for components that need it
    };
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    setUser(session);

    return session;   // caller uses session.role to redirect
  };

  // ── CITIZEN REGISTER ────────────────────────────────────────────────────────
  const register = async ({ name, email, password, phone, state, city, licenseplate, vehicles, vehicleType, modelName }) => {
    const data = await apiFetch("/auth/register", {
      method: "POST",
      body: JSON.stringify({
        full_name:    name,
        email,
        password,
        phone_number: phone        || undefined,
        state:        state        || undefined,
        city:         city         || undefined,
        licenseplate: licenseplate || undefined,
        vehicles:     vehicles     || undefined,
        vehicle_type: vehicleType  || undefined,
        model_name:   modelName    || undefined,
        role: "user",
        type: "user",
      }),
    });

    // Auto-login after registration
    localStorage.setItem(TOKEN_KEY,   data.token);
    localStorage.setItem(REFRESH_KEY, data.refreshToken);

    const session = {
      id:    data.user.id,
      name:  data.user.full_name,
      email: data.user.email,
      role:  "user",
      token: data.token,
    };
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    setUser(session);

    return session;
  };

  // ── LOGOUT ──────────────────────────────────────────────────────────────────
  const logout = () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_KEY);
    localStorage.removeItem(SESSION_KEY);
    setUser(null);
  };

  // ── REFRESH ACCESS TOKEN ────────────────────────────────────────────────────
  const refreshAccessToken = async () => {
    const refreshToken = localStorage.getItem(REFRESH_KEY);
    if (!refreshToken) throw new Error("No refresh token");

    const data = await apiFetch("/auth/refresh", {
      method: "POST",
      body: JSON.stringify({ refreshToken }),
    });

    localStorage.setItem(TOKEN_KEY, data.token);
    // Update token in session too
    const session = JSON.parse(localStorage.getItem(SESSION_KEY) || "{}");
    session.token = data.token;
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    setUser((prev) => prev ? { ...prev, token: data.token } : prev);

    return data.token;
  };

  // ── GET FULL PROFILE FROM API ───────────────────────────────────────────────
  const getFullProfile = async () => {
    if (!user) return null;
    const currentToken = localStorage.getItem(TOKEN_KEY);
    try {
      // Admin roles hit /auth/admin/me, citizens hit /auth/me
      const isAdmin = ["rto_chief", "rto_officer", "analyst"].includes(user.role);
      const data = await apiFetch(
        isAdmin ? "/auth/admin/me" : "/auth/me",
        { method: "GET" },
        currentToken
      );
      return data.user;
    } catch {
      return user;  // fall back to cached session
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      token,           // raw JWT string — pass to apiFetch calls in other components
      login,
      register,
      logout,
      refreshAccessToken,
      getFullProfile,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}