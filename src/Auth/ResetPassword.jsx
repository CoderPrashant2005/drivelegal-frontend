// src/Auth/ResetPassword.jsx
import React, { useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";

/* ─── Inline style objects ─────────────────────────────────────────────────
   Palette pulled from your app's dark-navy/purple theme visible in the
   screenshot:
     Primary bg   : #0f0c29 → #302b63 → #24243e  (deep navy-purple)
     Card bg       : rgba(255,255,255,0.06)  glassmorphism
     Accent        : #7c6af7  (purple-violet)
     Accent hover  : #9b8dff
     Text primary  : #e8e6ff
     Text muted    : #a09cc0
     Input bg      : rgba(255,255,255,0.08)
     Border        : rgba(255,255,255,0.12)
     Error         : #ff6b7a
     Success       : #4caf82
─────────────────────────────────────────────────────────────────────────── */

const S = {
  page: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)",
    fontFamily: "'Segoe UI', system-ui, sans-serif",
    padding: "1rem",
  },
  card: {
    width: "100%",
    maxWidth: "420px",
    background: "rgba(255,255,255,0.06)",
    backdropFilter: "blur(18px)",
    WebkitBackdropFilter: "blur(18px)",
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: "16px",
    padding: "2.5rem 2rem",
    boxShadow: "0 8px 40px rgba(0,0,0,0.45)",
  },
  logo: {
    textAlign: "center",
    fontSize: "2rem",
    marginBottom: "0.5rem",
  },
  title: {
    margin: "0 0 0.35rem",
    fontSize: "1.6rem",
    fontWeight: 700,
    color: "#e8e6ff",
    textAlign: "center",
    letterSpacing: "-0.3px",
  },
  subtitle: {
    margin: "0 0 1.8rem",
    fontSize: "0.88rem",
    color: "#a09cc0",
    textAlign: "center",
    lineHeight: 1.5,
  },
  field: {
    marginBottom: "1.1rem",
  },
  label: {
    display: "block",
    marginBottom: "0.4rem",
    fontSize: "0.82rem",
    fontWeight: 600,
    color: "#c4bfee",
    letterSpacing: "0.3px",
    textTransform: "uppercase",
  },
  inputWrap: {
    position: "relative",
    display: "flex",
    alignItems: "center",
  },
  input: {
    width: "100%",
    padding: "0.7rem 2.6rem 0.7rem 0.9rem",
    background: "rgba(255,255,255,0.08)",
    border: "1px solid rgba(255,255,255,0.15)",
    borderRadius: "8px",
    color: "#e8e6ff",
    fontSize: "0.95rem",
    outline: "none",
    transition: "border-color 0.2s, box-shadow 0.2s",
    boxSizing: "border-box",
  },
  eyeBtn: {
    position: "absolute",
    right: "0.6rem",
    background: "none",
    border: "none",
    cursor: "pointer",
    fontSize: "1rem",
    padding: "0.2rem",
    lineHeight: 1,
    color: "#a09cc0",
  },
  error: {
    margin: "0 0 1rem",
    padding: "0.65rem 0.9rem",
    background: "rgba(255,107,122,0.15)",
    border: "1px solid rgba(255,107,122,0.4)",
    borderRadius: "8px",
    color: "#ff6b7a",
    fontSize: "0.85rem",
  },
  btn: {
    width: "100%",
    padding: "0.78rem",
    background: "linear-gradient(135deg, #7c6af7 0%, #5b4fcf 100%)",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    fontSize: "0.97rem",
    fontWeight: 700,
    cursor: "pointer",
    letterSpacing: "0.4px",
    transition: "opacity 0.2s, transform 0.15s",
    marginTop: "0.4rem",
  },
  btnDisabled: {
    opacity: 0.6,
    cursor: "not-allowed",
  },
  backLink: {
    display: "block",
    marginTop: "1.3rem",
    textAlign: "center",
    fontSize: "0.87rem",
    color: "#7c6af7",
    textDecoration: "none",
  },
  successIcon: {
    textAlign: "center",
    fontSize: "3rem",
    marginBottom: "0.5rem",
  },
  successBar: {
    height: "4px",
    background: "linear-gradient(90deg, #4caf82, #7c6af7)",
    borderRadius: "2px",
    marginBottom: "1.5rem",
    animation: "growBar 0.6s ease-out forwards",
  },
};

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const token = searchParams.get("token") || "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm]   = useState("");
  const [showPwd, setShowPwd]   = useState(false);
  const [status, setStatus]     = useState("idle"); // idle | loading | success | error
  const [errorMsg, setErrorMsg] = useState("");

  // Focus ring on inputs
  const [focused, setFocused] = useState("");

  const inputStyle = (id) => ({
    ...S.input,
    borderColor: focused === id
      ? "#7c6af7"
      : "rgba(255,255,255,0.15)",
    boxShadow: focused === id
      ? "0 0 0 3px rgba(124,106,247,0.25)"
      : "none",
  });

  async function handleSubmit(e) {
    e.preventDefault();
    setErrorMsg("");

    if (password.length < 8) {
      setErrorMsg("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setErrorMsg("Passwords do not match.");
      return;
    }

    setStatus("loading");

    try {
      // ✏️  Replace with your actual API endpoint
      const res = await fetch("http://localhost:5000/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword: password }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data?.message || "Reset failed. The link may have expired.");
      }

      setStatus("success");
      setTimeout(() => navigate("/login"), 3000);
    } catch (err) {
      setStatus("error");
      setErrorMsg(err.message);
    }
  }

  // ── No token ──────────────────────────────────────────────────────────
  if (!token) {
    return (
      <div style={S.page}>
        <div style={S.card}>
          <div style={S.logo}>🔗</div>
          <h2 style={S.title}>Invalid Link</h2>
          <p style={S.subtitle}>
            This reset link is missing its token.<br />
            Please request a new one from the login page.
          </p>
          <Link to="/login" style={{ ...S.btn, display: "block", textAlign: "center", textDecoration: "none" }}>
            Back to Login
          </Link>
        </div>
      </div>
    );
  }

  // ── Success ───────────────────────────────────────────────────────────
  if (status === "success") {
    return (
      <div style={S.page}>
        <div style={S.card}>
          <div style={S.successIcon}>✅</div>
          <div style={S.successBar} />
          <h2 style={S.title}>Password Updated!</h2>
          <p style={S.subtitle}>
            Your password has been reset successfully.<br />
            Redirecting to login in 3 seconds…
          </p>
          <Link to="/login" style={{ ...S.btn, display: "block", textAlign: "center", textDecoration: "none" }}>
            Go to Login
          </Link>
        </div>
      </div>
    );
  }

  // ── Form ──────────────────────────────────────────────────────────────
  return (
    <div style={S.page}>
      <div style={S.card}>
        <div style={S.logo}>🔐</div>
        <h2 style={S.title}>Reset Password</h2>
        <p style={S.subtitle}>Enter your new password below.</p>

        <form onSubmit={handleSubmit} noValidate>

          {/* New Password */}
          <div style={S.field}>
            <label htmlFor="rp-password" style={S.label}>New Password</label>
            <div style={S.inputWrap}>
              <input
                id="rp-password"
                type={showPwd ? "text" : "password"}
                style={inputStyle("rp-password")}
                placeholder="Min. 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onFocus={() => setFocused("rp-password")}
                onBlur={() => setFocused("")}
                required
                autoComplete="new-password"
              />
              <button
                type="button"
                style={S.eyeBtn}
                onClick={() => setShowPwd((v) => !v)}
                aria-label={showPwd ? "Hide password" : "Show password"}
              >
                {showPwd ? "🙈" : "👁️"}
              </button>
            </div>
          </div>

          {/* Confirm Password */}
          <div style={S.field}>
            <label htmlFor="rp-confirm" style={S.label}>Confirm Password</label>
            <div style={S.inputWrap}>
              <input
                id="rp-confirm"
                type={showPwd ? "text" : "password"}
                style={inputStyle("rp-confirm")}
                placeholder="Re-enter new password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                onFocus={() => setFocused("rp-confirm")}
                onBlur={() => setFocused("")}
                required
                autoComplete="new-password"
              />
            </div>
          </div>

          {/* Error */}
          {(status === "error" || errorMsg) && (
            <p style={S.error} role="alert">⚠️ {errorMsg || "Something went wrong. Please try again."}</p>
          )}

          {/* Submit */}
          <button
            type="submit"
            style={status === "loading" ? { ...S.btn, ...S.btnDisabled } : S.btn}
            disabled={status === "loading"}
            onMouseEnter={(e) => { if (status !== "loading") e.target.style.opacity = "0.88"; }}
            onMouseLeave={(e) => { e.target.style.opacity = "1"; }}
          >
            {status === "loading" ? "⏳ Updating…" : "Set New Password"}
          </button>
        </form>

        <Link to="/login" style={S.backLink}
          onMouseEnter={(e) => e.target.style.color = "#9b8dff"}
          onMouseLeave={(e) => e.target.style.color = "#7c6af7"}
        >
          ← Back to Login
        </Link>
      </div>
    </div>
  );
}