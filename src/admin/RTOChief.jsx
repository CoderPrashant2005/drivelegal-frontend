import "./admin.css";
import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../Auth/AuthContext";

// Map UI designation → DB role value
const roleMap = { officer: "rto_officer", analyst: "analyst", support: "customer_support" };

// Map DB role value → UI designation (single source of truth, used everywhere
// so the list view and the optimistic "just created" view can never drift apart)
const designationFromRole = (role) =>
  role === "rto_officer" ? "officer" :
  role === "customer_support" ? "support" : "analyst";

// Strong password: min 8 chars, uppercase, lowercase, number, special char
const isStrongPassword = (pwd) =>
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]).{8,}$/.test(pwd);

const getPasswordStrength = (pwd) => {
  if (!pwd) return null;
  let score = 0;
  if (pwd.length >= 8) score++;
  if (/[A-Z]/.test(pwd)) score++;
  if (/[a-z]/.test(pwd)) score++;
  if (/\d/.test(pwd)) score++;
  if (/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]/.test(pwd)) score++;
  if (score <= 2) return { label: "Weak",   color: "#e74c3c" };
  if (score <= 3) return { label: "Fair",   color: "#f39c12" };
  if (score === 4) return { label: "Good",  color: "#2ecc71" };
  return             { label: "Strong", color: "#27ae60" };
};

// ── tiny API helper ───────────────────────────────────────────────────────
const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

async function apiFetch(path, options = {}, token) {
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
// ─────────────────────────────────────────────────────────────────────────

export default function RTOChief() {
  const navigate = useNavigate();
  const { user, token, logout } = useAuth();   // session.token must be the JWT for the logged-in chief

  // ── theme ────────────────────────────────────────────────────────────
  useEffect(() => {
    const saved = localStorage.getItem("smartroad-theme");
    if (saved) document.documentElement.setAttribute("data-theme", saved);
  }, []);

  // ── form state ───────────────────────────────────────────────────────
  const [form, setForm] = useState({
    name: "", email: "", phone: "", designation: "",
    password: "", confirmPassword: "", area: "",
  });
  const [showPassword, setShowPassword]           = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formError,   setFormError]   = useState("");
  const [formSuccess, setFormSuccess] = useState("");
  const [submitting,  setSubmitting]  = useState(false);

  // ── employee list ────────────────────────────────────────────────────
  const [employees, setEmployees] = useState([]);
  const [loadingList, setLoadingList] = useState(true);
  const [listError,   setListError]   = useState("");

  const fetchStaff = useCallback(async () => {
    setLoadingList(true);
    setListError("");
    try {
      const data = await apiFetch("/auth/admin/staff", { method: "GET" }, token);
      // Map DB rows → UI shape
      setEmployees(
        data.staff.map((s) => ({
          id:          s.id,
          name:        s.full_name,
          email:       s.email,
          designation: designationFromRole(s.role),
          status:      s.disabled ? "disabled" : "active",
        }))
      );
    } catch (err) {
      setListError(err.message || "Failed to load staff list.");
    } finally {
      setLoadingList(false);
    }
  }, [token]);

  useEffect(() => { fetchStaff(); }, [fetchStaff]);

  // ── form handlers ────────────────────────────────────────────────────
  const handleChange = (e) =>
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleGenerate = async (e) => {
    e.preventDefault();
    setFormError("");
    setFormSuccess("");

    const { name, email, phone, designation, password, confirmPassword, area } = form;

    if (!name || !email || !phone || !designation || !password || !confirmPassword || !area) {
      setFormError("All fields are required.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setFormError("Enter a valid email address.");
      return;
    }
    if (!/^\d{10}$/.test(phone)) {
      setFormError("Phone number must be exactly 10 digits.");
      return;
    }
    if (!isStrongPassword(password)) {
      setFormError(
        "Password must be at least 8 characters and include uppercase, lowercase, a number, and a special character."
      );
      return;
    }
    if (password !== confirmPassword) {
      setFormError("Passwords do not match.");
      return;
    }

    setSubmitting(true);
    try {
      const data = await apiFetch(
        "/auth/admin/staff",
        {
          method: "POST",
          body: JSON.stringify({
            full_name:    name,
            email,
            phone_number: phone,
            password,
            role:         roleMap[designation] || designation,
            area,
          }),
        },
        token
      );

      // Optimistically add to list without a full refetch
      const s = data.staff;
      setEmployees((prev) => [
        {
          id:          s.id,
          name:        s.full_name,
          email:       s.email,
          designation: designationFromRole(s.role),
          status:      "active",
        },
        ...prev,
      ]);

      setFormSuccess(`Access point generated for ${email}`);
      setForm({ name: "", email: "", phone: "", designation: "", password: "", confirmPassword: "", area: "" });
    } catch (err) {
      setFormError(err.message || "Failed to create staff account.");
    } finally {
      setSubmitting(false);
    }
  };

  // ── toggle disable / enable ──────────────────────────────────────────
  const handleToggleStatus = async (id) => {
    try {
      const data = await apiFetch(
        `/auth/admin/staff/${id}/toggle`,
        { method: "PATCH" },
        token
      );
      setEmployees((prev) =>
        prev.map((emp) =>
          emp.id === id
            ? { ...emp, status: data.disabled ? "disabled" : "active" }
            : emp
        )
      );
    } catch (err) {
      alert(err.message || "Failed to update status.");
    }
  };

  // ── delete ───────────────────────────────────────────────────────────
  const handleDelete = async (id) => {
    if (!window.confirm("Delete this employee? They will no longer be able to log in.")) return;
    try {
      await apiFetch(`/auth/admin/staff/${id}`, { method: "DELETE" }, token);
      setEmployees((prev) => prev.filter((emp) => emp.id !== id));
    } catch (err) {
      alert(err.message || "Failed to delete staff member.");
    }
  };

  // ── back / logout ────────────────────────────────────────────────────
  const handleBack = () => {
    logout();          // clears session in AuthContext (and any stored token)
    navigate("/");
  };

  const pwdStrength = getPasswordStrength(form.password);

  return (
    <div className="chief-wrapper">
      <div className="chief-container">

        {/* ── Page Header ─────────────────────────────────────────── */}
        <div className="admin-page-header">
          <h2>👑 RTO Chief Dashboard</h2>
          <button className="back-btn" onClick={handleBack}>
            ← Back
          </button>
        </div>

        {/* ── Main Grid ───────────────────────────────────────────── */}
        <div className="chief-grid">

          {/* ── Registration Form ──────────────────────────────────── */}
          <div className="admin-card">
            <h3 className="chief-card-title">Registration Form / Access Point</h3>

            {formError   && <p className="chief-message-error">{formError}</p>}
            {formSuccess && <p className="chief-message-success">{formSuccess}</p>}

            <div className="chief-form-grid">

              <input
                className="chief-input"
                type="text"
                name="name"
                placeholder="Name"
                value={form.name}
                onChange={handleChange}
              />

              <input
                className="chief-input"
                type="email"
                name="email"
                placeholder="Email"
                value={form.email}
                onChange={handleChange}
              />

              <div style={{ display: "flex", alignItems: "stretch", gap: 0 }}>
                <span style={{
                  background: "rgba(255,255,255,0.07)",
                  border: "1px solid rgba(255,255,255,0.15)",
                  borderRight: "none",
                  borderRadius: "8px 0 0 8px",
                  padding: "0 0.75rem",
                  display: "flex",
                  alignItems: "center",
                  color: "#ccc",
                  fontSize: "0.95rem",
                  whiteSpace: "nowrap",
                  userSelect: "none",
                }}>🇮🇳 +91</span>
                <input
                  className="chief-input"
                  style={{ borderRadius: "0 8px 8px 0", flex: 1, margin: 0 }}
                  type="tel"
                  name="phone"
                  placeholder="10-digit mobile number"
                  value={form.phone}
                  onChange={handleChange}
                  maxLength={10}
                />
              </div>

              <select
                className="chief-input"
                name="designation"
                value={form.designation}
                onChange={handleChange}
              >
                <option value="">Designation</option>
                <option value="officer">Officer</option>
                <option value="analyst">Analyst</option>
                <option value="support">Customer Support</option>
              </select>

              {/* Password */}
              <div className="chief-input-full" style={{ position: "relative" }}>
                <input
                  className="chief-input"
                  style={{ width: "100%", boxSizing: "border-box", paddingRight: "2.5rem" }}
                  type={showPassword ? "text" : "password"}
                  name="password"
                  placeholder="Password"
                  value={form.password}
                  onChange={handleChange}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  style={{
                    position: "absolute", right: "0.75rem", top: "50%",
                    transform: "translateY(-50%)", background: "none", border: "none",
                    cursor: "pointer", fontSize: "1.1rem", color: "#aaa", padding: 0, lineHeight: 1,
                  }}
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? "🙈" : "👁️"}
                </button>

                {form.password && pwdStrength && (
                  <div style={{ marginTop: "0.3rem", fontSize: "0.78rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <div style={{ flex: 1, height: "4px", borderRadius: "2px", background: "#333", overflow: "hidden" }}>
                      <div style={{
                        height: "100%",
                        width: pwdStrength.label === "Weak" ? "25%" : pwdStrength.label === "Fair" ? "50%" : pwdStrength.label === "Good" ? "75%" : "100%",
                        background: pwdStrength.color,
                        transition: "width 0.3s",
                        borderRadius: "2px",
                      }} />
                    </div>
                    <span style={{ color: pwdStrength.color, fontWeight: 600 }}>{pwdStrength.label}</span>
                  </div>
                )}
                {form.password && (
                  <p style={{ fontSize: "0.72rem", color: "#999", marginTop: "0.25rem", marginBottom: 0 }}>
                    Min 8 chars · Uppercase · Lowercase · Number · Special char
                  </p>
                )}
              </div>

              {/* Confirm Password */}
              <div className="chief-input-full" style={{ position: "relative" }}>
                <input
                  className="chief-input"
                  style={{ width: "100%", boxSizing: "border-box", paddingRight: "2.5rem" }}
                  type={showConfirmPassword ? "text" : "password"}
                  name="confirmPassword"
                  placeholder="Confirm Password"
                  value={form.confirmPassword}
                  onChange={handleChange}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((v) => !v)}
                  style={{
                    position: "absolute", right: "0.75rem", top: "50%",
                    transform: "translateY(-50%)", background: "none", border: "none",
                    cursor: "pointer", fontSize: "1.1rem", color: "#aaa", padding: 0, lineHeight: 1,
                  }}
                  aria-label="Toggle confirm password visibility"
                >
                  {showConfirmPassword ? "🙈" : "👁️"}
                </button>
              </div>

              <input
                className="chief-input"
                type="text"
                name="area"
                placeholder="Area (RTO)"
                value={form.area}
                onChange={handleChange}
              />

              <button
                className="btn-primary chief-generate-btn"
                onClick={handleGenerate}
                disabled={submitting}
              >
                {submitting ? "Creating…" : "Generate"}
              </button>

            </div>
          </div>

          {/* ── Employee List ───────────────────────────────────────── */}
          <div className="admin-card">
            <h3 className="chief-card-title">Employee List</h3>

            {listError && <p className="chief-message-error">{listError}</p>}

            <table className="chief-table">
              <thead className="chief-table-head">
                <tr>
                  <th className="chief-th">Active User</th>
                  <th className="chief-th">Designation</th>
                  <th className="chief-th chief-action-header">Action</th>
                </tr>
              </thead>

              <tbody>
                {loadingList ? (
                  <tr>
                    <td colSpan={3} className="chief-empty-state">Loading…</td>
                  </tr>
                ) : employees.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="chief-empty-state">No employees found.</td>
                  </tr>
                ) : (
                  employees.map((emp) => (
                    <tr
                      key={emp.id}
                      className={`chief-user-row ${emp.status === "disabled" ? "disabled" : ""}`}
                    >
                      <td className="chief-td">{emp.email}</td>

                      <td className="chief-td">
                        <span className={`chief-badge ${emp.designation}`}>
                          {emp.designation}
                        </span>
                      </td>

                      <td className="chief-td chief-action-cell">
                        <button
                          onClick={() => handleToggleStatus(emp.id)}
                          className={`chief-action-btn ${
                            emp.status === "active" ? "chief-disable" : "chief-enable"
                          }`}
                        >
                          {emp.status === "active" ? "Disable" : "Enable"}
                        </button>

                        <button
                          onClick={() => handleDelete(emp.id)}
                          className="chief-action-btn chief-delete"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

        </div>
      </div>
    </div>
  );
}