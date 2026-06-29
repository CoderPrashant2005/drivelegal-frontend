// AdminLogin.jsx — Admin portal: Login + Forgot Password only (no registration)
// Registration is handled separately from RTO Chief's dashboard
import React, { useState, useEffect } from "react";
import logo from "../a.png";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "./AuthContext";

const EyeIcon = ({ open }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    {open ? (<><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></>) : (
      <><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></>
    )}
  </svg>
);

export default function AdminLogin() {
  const [tab, setTab]           = useState("login"); // login | forgot
  const [showPass, setShowPass] = useState(false);
  const [form, setForm]         = useState({ email: "", password: "" });
  const [forgotEmail, setForgotEmail] = useState("");
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);
  const [forgotSent, setForgotSent] = useState(false);

  const { login } = useAuth();
  const navigate  = useNavigate();

  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem("smartroad-theme") || "light";
    return saved === "dark";
  });

  useEffect(() => {
    // Apply on mount
    const saved = localStorage.getItem("smartroad-theme") || "light";
    document.documentElement.setAttribute("data-theme", saved);
    setIsDark(saved === "dark");

    // React to theme changes made on other pages
    const onThemeChange = () => {
      const current = localStorage.getItem("smartroad-theme") || "light";
      document.documentElement.setAttribute("data-theme", current);
      setIsDark(current === "dark");
    };
    window.addEventListener("smartroad-theme-change", onThemeChange);
    window.addEventListener("storage", onThemeChange);
    return () => {
      window.removeEventListener("smartroad-theme-change", onThemeChange);
      window.removeEventListener("storage", onThemeChange);
    };
  }, []);

  // Inject autofill override CSS — browser ignores inline background on autofilled inputs
  useEffect(() => {
    const id = "sr-admin-autofill-fix";
    if (document.getElementById(id)) return;
    const style = document.createElement("style");
    style.id = id;
    style.textContent = `
      [data-theme="dark"] input:-webkit-autofill,
      [data-theme="dark"] input:-webkit-autofill:hover,
      [data-theme="dark"] input:-webkit-autofill:focus {
        -webkit-box-shadow: 0 0 0px 1000px #150e05 inset !important;
        -webkit-text-fill-color: #e8c898 !important;
        caret-color: #e8c898 !important;
        border: 1.5px solid #3d2810 !important;
        transition: background-color 9999s ease-in-out 0s;
      }
      [data-theme="light"] input:-webkit-autofill,
      [data-theme="light"] input:-webkit-autofill:hover,
      [data-theme="light"] input:-webkit-autofill:focus {
        -webkit-box-shadow: 0 0 0px 1000px rgba(255,255,255,0.85) inset !important;
        -webkit-text-fill-color: #1a0e08 !important;
        caret-color: #1a0e08 !important;
        border: 1.5px solid rgba(44,26,16,0.30) !important;
        transition: background-color 9999s ease-in-out 0s;
      }
    `;
    document.head.appendChild(style);
    return () => document.getElementById(id)?.remove();
  }, []);

  const roleRedirects = {
  rto_officer:      "/admin/rto-officer",
  analyst:          "/admin/analyst",
  rto_chief:        "/admin/rto-chief",
  customer_support: "/admin/customer-support",
};

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const switchTab = (t) => {
    setTab(t); setError(""); setForgotSent(false); setShowPass(false);
  };

  const handleLogin = async () => {
    setError("");
    if (!form.email || !form.password) { setError("Please fill in all fields."); return; }
    setLoading(true);
    try {
      const emailKey = form.email.trim().toLowerCase();

      // ── Check role BEFORE calling login() so no ghost session is created ──
      const allUsers = JSON.parse(localStorage.getItem("smartroad_users") || "[]");
      const matchedUser = allUsers.find(
        u => u.email.trim().toLowerCase() === emailKey && u.password === form.password
      );
      if (matchedUser && matchedUser.role === "user") {
        setError("This is the Admin portal. Please use the Citizen login page instead.");
        setLoading(false);
        return;
      }

      // ── Clear any stale session and allow fresh login ──
      const activeSessions = JSON.parse(localStorage.getItem("smartroad-active-sessions") || "{}");
      delete activeSessions[emailKey];
      localStorage.setItem("smartroad-active-sessions", JSON.stringify(activeSessions));

      const session = await login(form.email, form.password);

      navigate(roleRedirects[session.role] || "/");
    } catch (e) {
      setError(e.message || "Invalid email or password.");
    }
    setLoading(false);
  };

  const handleForgot = async () => {
    setError("");
    if (!forgotEmail) { setError("Please enter your email."); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(forgotEmail)) { setError("Enter a valid email address."); return; }
    setLoading(true);
    try {
      const res = await fetch("http://localhost:5000/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: forgotEmail.trim().toLowerCase() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to send reset link.");
      setForgotSent(true);
    } catch (e) {
      setError(e.message || "Something went wrong. Please try again.");
    }
    setLoading(false);
  };

  const S = getS(isDark);

  return (
    <div style={S.page}>

      {/* LEFT PANEL */}
      <div style={S.leftPanel}>
        <div style={S.leftContent}>
          <div style={S.brand}><img
    src={logo}
    alt="Drive Legal"
    width={'200'}
    height={'200'}
  /></div>
          <h1 style={S.leftTitle}>RTO Officer<br />Admin Portal</h1>
          <p style={S.leftSub}>Secure access for RTO Officers, Analysts, and Chiefs. All accounts are provisioned by your RTO Chief.</p>
          <div style={S.leftFeatures}>
            {["Role-based secure access", "Real-time challan updates", "AI-powered traffic assistant", "24/7 availability"].map((f, i) => (
              <div key={i} style={S.leftFeature}>✓ {f}</div>
            ))}
          </div>
          <div style={S.infoCallout}>
            <div style={S.infoCalloutIcon}>🔐</div>
            <div>
              <div style={S.infoCalloutTitle}>Account Access</div>
              <div style={S.infoCalloutText}>Login with credentials provided by your RTO Chief. New accounts are created by the Chief from their dashboard.</div>
            </div>
          </div>
        </div>
        <div style={S.leftStats}>
          <div style={S.leftStat}><span style={S.leftStatNum}>50K+</span><span style={S.leftStatLabel}>Users</span></div>
          <div style={S.leftStat}><span style={S.leftStatNum}>12K+</span><span style={S.leftStatLabel}>Challans</span></div>
          <div style={S.leftStat}><span style={S.leftStatNum}>99%</span><span style={S.leftStatLabel}>Uptime</span></div>
        </div>
      </div>

      {/* RIGHT PANEL */}
      <div style={S.rightPanel}>
        <div style={S.formCard}>

          <button onClick={() => navigate("/")} style={S.backBtn}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            Back
          </button>

          {/* TABS: Login + Forgot only */}
          <div style={S.tabs}>
            <button onClick={() => switchTab("login")}  style={{ ...S.tab, ...(tab === "login"  ? S.tabActive : {}) }}>Login</button>
            <button onClick={() => switchTab("forgot")} style={{ ...S.tab, ...(tab === "forgot" ? S.tabActive : {}) }}>Forgot Password</button>
          </div>

          {error && <div style={S.errorBox}>⚠️ {error}</div>}

          {/* ── LOGIN ── */}
          {tab === "login" && (
            <div>
              <h2 style={S.formTitle}>Welcome Back</h2>
              <p style={S.formSub}>Sign in with your registered email & password</p>

              <div style={{ marginBottom: "14px" }}>
                <label style={S.label}>Email Address</label>
                <input
                  style={S.input}
                  type="email"
                  placeholder="you@rto.gov.in"
                  autoComplete="off"
                  value={form.email}
                  onChange={e => set("email", e.target.value)}
                />
              </div>

              <div style={{ marginBottom: "14px" }}>
                <label style={S.label}>Password</label>
                <div style={S.passWrap}>
                  <input
                    style={{ ...S.input, paddingRight: "44px" }}
                    type={showPass ? "text" : "password"}
                    placeholder="Enter your password"
                    autoComplete="new-password"
                    value={form.password}
                    onChange={e => set("password", e.target.value)}
                    onKeyDown={e => e.key === "Enter" && handleLogin()}
                  />
                  <button type="button" onClick={() => setShowPass(v => !v)} style={S.eyeBtn}>
                    <EyeIcon open={showPass} />
                  </button>
                </div>
              </div>

              <div style={S.forgotRow}>
                <button onClick={() => switchTab("forgot")} style={S.forgotLink}>Forgot password?</button>
              </div>

              <button onClick={handleLogin} style={S.submitBtn} disabled={loading}>
                {loading ? "Signing in…" : "Sign In →"}
              </button>

              <div style={S.infoBox}>
                🛈 &nbsp;Don't have an account? Contact your <strong>RTO Chief</strong> to get registered.
              </div>
            </div>
          )}

          {/* ── FORGOT PASSWORD ── */}
          {tab === "forgot" && !forgotSent && (
            <div>
              <h2 style={S.formTitle}>Reset Password</h2>
              <p style={S.formSub}>Enter your registered email to receive a reset link</p>
              <div style={{ marginBottom: "14px" }}>
                <label style={S.label}>Email Address</label>
                <input
                  style={S.input}
                  type="email"
                  placeholder="your@rto.gov.in"
                  autoComplete="off"
                  value={forgotEmail}
                  onChange={e => setForgotEmail(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleForgot()}
                />
              </div>
              <button onClick={handleForgot} style={S.submitBtn} disabled={loading}>
                {loading ? "Sending…" : "Send Reset Link →"}
              </button>
              <p style={S.switchText}>
                <button onClick={() => switchTab("login")} style={S.switchLink}>← Back to Login</button>
              </p>
            </div>
          )}

          {tab === "forgot" && forgotSent && (
            <div style={S.successBox}>
              <div style={{ fontSize: "52px", marginBottom: "12px" }}>📧</div>
              <h3 style={S.successTitle}>Reset Link Sent!</h3>
              <p style={S.successDesc}>Check your email inbox for the password reset link.</p>
              <button onClick={() => switchTab("login")} style={S.submitBtn}>Back to Login →</button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

/* ── Styles ── */
function getS(d) {
  return {
    page: {
      display: "flex", minHeight: "100vh",
      fontFamily: "'Segoe UI', sans-serif",
      background: d ? "#0a1929" : "#F5F0E8",
      transition: "background 0.3s",
    },
    leftPanel: {
      flex: "0 0 420px",
      background: d
        ? "linear-gradient(160deg,#0d2137 0%,#020d18 100%)"
        : "linear-gradient(160deg,#2C1A10 0%,#1a0e08 100%)",
      padding: "40px 48px", display: "flex",
      flexDirection: "column", justifyContent: "space-between",
      color: "#ffffff",
    },
    backLink: {
      color: d ? "#93c5fd" : "#F5F0E8",
      textDecoration: "none", fontSize: "14px", fontWeight: 600,
      display: "inline-flex", alignItems: "center", gap: "4px",
    },
    leftContent: {
      flex: 1, display: "flex",
      flexDirection: "column", justifyContent: "center",
    },
    brand: {
      fontSize: "22px", fontWeight: 800, marginBottom: "28px",
      color: "#ffffff",
    },
    leftTitle: {
      fontSize: "40px", fontWeight: 900, lineHeight: 1.15,
      marginBottom: "16px", letterSpacing: "-1.5px",
      color: "#ffffff",
    },
    leftSub: {
      fontSize: "15px",
      color: d ? "#bfdbfe" : "rgba(255,255,255,0.80)",
      lineHeight: 1.7, marginBottom: "20px",
    },
    leftFeatures: {
      display: "flex", flexDirection: "column",
      gap: "8px", marginBottom: "24px",
    },
    leftFeature: {
      color: d ? "#bfdbfe" : "rgba(255,255,255,0.85)",
      fontSize: "14px",
    },
    infoCallout: {
      background: d ? "rgba(255,255,255,0.10)" : "rgba(255,255,255,0.15)",
      borderRadius: "12px", padding: "14px 16px",
      border: d ? "1px solid rgba(255,255,255,0.15)" : "1px solid rgba(255,255,255,0.30)",
      display: "flex", gap: "12px", alignItems: "flex-start",
    },
    infoCalloutIcon:  { fontSize: "24px", lineHeight: 1 },
    infoCalloutTitle: {
      fontWeight: 700, fontSize: "14px", marginBottom: "4px",
      color: "#ffffff",
    },
    infoCalloutText: {
      fontSize: "13px",
      color: d ? "#bfdbfe" : "rgba(255,255,255,0.80)",
      lineHeight: 1.5,
    },
    leftStats: {
      display: "flex", gap: "36px", paddingTop: "24px",
      borderTop: d
        ? "1px solid rgba(255,255,255,0.15)"
        : "1px solid rgba(255,255,255,0.30)",
    },
    leftStat:      { display: "flex", flexDirection: "column" },
    leftStatNum:   { fontSize: "26px", fontWeight: 900, color: "#ffffff" },
    leftStatLabel: {
      fontSize: "12px",
      color: d ? "#93c5fd" : "#F5F0E8",
    },
    rightPanel: {
      flex: 1,
      background: d ? "#0f1f2e" : "#F5F0E8",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: "40px 48px", overflowY: "auto",
      transition: "background 0.3s",
    },
    formCard: {
      background:   d ? "#112233" : "#EDE8DF",
      borderRadius: "24px", padding: "40px",
      boxShadow:    d ? "0 8px 40px rgba(0,0,0,0.4)" : "0 8px 40px rgba(44,26,16,0.18)",
      width: "100%", maxWidth: "420px",
      transition: "background 0.3s",
      border: d ? "none" : "1px solid rgba(44,26,16,0.20)",
    },
    backBtn: {
      display: "inline-flex", alignItems: "center", gap: "5px",
      padding: "6px 12px",
      background: d ? "#0f1f2e" : "rgba(44,26,16,0.10)",
      border: d ? "1.5px solid #1e3a5f" : "1.5px solid rgba(44,26,16,0.30)",
      borderRadius: "8px",
      color: d ? "#94a3b8" : "#2C1A10",
      fontSize: "13px", fontWeight: 600, cursor: "pointer",
      marginBottom: "20px",
    },
    tabs: {
      display: "flex", gap: "4px",
      background: d ? "#0a1929" : "rgba(44,26,16,0.12)",
      borderRadius: "10px", padding: "4px", marginBottom: "24px",
    },
    tab: {
      flex: 1, padding: "8px 4px", border: "none",
      borderRadius: "8px", fontSize: "13px", fontWeight: 600,
      cursor: "pointer", background: "transparent",
      color: d ? "#94a3b8" : "#7a5a48",
    },
    tabActive: {
      background: d ? "#1e3a5f" : "#F5F0E8",
      color:      d ? "#93c5fd" : "#2C1A10",
      boxShadow:  d ? "0 2px 8px rgba(0,0,0,0.3)" : "0 2px 8px rgba(44,26,16,0.20)",
    },
    formTitle: {
      fontSize: "22px", fontWeight: 800,
      color: d ? "#f1f5f9" : "#100806",
      marginBottom: "4px",
    },
    formSub: {
      fontSize: "13px",
      color: d ? "#94a3b8" : "#7a5a48",
      marginBottom: "20px",
    },
    label: {
      display: "block", fontSize: "12px", fontWeight: 700,
      color: d ? "#94a3b8" : "#2C1A10",
      marginBottom: "5px", textTransform: "uppercase",
      letterSpacing: "0.4px",
    },
    input: {
      width: "100%", padding: "11px 13px",
      border: d ? "1.5px solid #1e3a5f" : "1.5px solid rgba(44,26,16,0.30)",
      borderRadius: "9px", fontSize: "14px",
      color:       d ? "#e2e8f0" : "#1a0e08",
      background:  d ? "#0a1929" : "rgba(255,255,255,0.85)",
      outline: "none", boxSizing: "border-box",
      fontFamily: "inherit",
    },
    passWrap: { position: "relative" },
    eyeBtn: {
      position: "absolute", right: "12px", top: "50%",
      transform: "translateY(-50%)",
      background: "none", border: "none", cursor: "pointer",
      color: d ? "#94a3b8" : "#7a5a48",
      padding: "2px", display: "flex", alignItems: "center",
    },
    forgotRow:  { textAlign: "right", marginBottom: "14px", marginTop: "-6px" },
    forgotLink: {
      background: "none", border: "none",
      color: d ? "#93c5fd" : "#2C1A10",
      fontSize: "13px", fontWeight: 600, cursor: "pointer",
    },
    submitBtn: {
      width: "100%",
      background: d ? "#1d4ed8" : "#2C1A10",
      color: "#fff", border: "none",
      padding: "13px", borderRadius: "10px",
      fontSize: "15px", fontWeight: 700, cursor: "pointer",
      marginBottom: "14px", marginTop: "4px",
    },
    errorBox: {
      background: d ? "#2d0a0a" : "rgba(220,38,38,0.10)",
      border:     d ? "1px solid #7f1d1d" : "1px solid rgba(220,38,38,0.35)",
      color:      d ? "#fca5a5" : "#dc2626",
      padding: "10px 14px", borderRadius: "9px",
      fontSize: "13px", marginBottom: "14px",
    },
    infoBox: {
      background: d ? "#0d2137" : "rgba(44,26,16,0.08)",
      border:     d ? "1px solid #1e3a5f" : "1px solid rgba(44,26,16,0.25)",
      color:      d ? "#93c5fd" : "#2C1A10",
      padding: "10px 14px", borderRadius: "9px",
      fontSize: "12px", lineHeight: 1.6,
    },
    successBox:   { textAlign: "center", padding: "24px 0" },
    successTitle: {
      fontSize: "22px", fontWeight: 800,
      color: d ? "#f1f5f9" : "#100806", marginBottom: "8px",
    },
    successDesc: {
      fontSize: "14px",
      color: d ? "#94a3b8" : "#7a5a48",
      marginBottom: "24px", lineHeight: 1.6,
    },
    switchText: {
      fontSize: "13px", color: d ? "#94a3b8" : "#7a5a48",
      textAlign: "center", margin: 0,
    },
    switchLink: {
      background: "none", border: "none",
      color: d ? "#93c5fd" : "#2C1A10",
      fontWeight: 600, cursor: "pointer", fontSize: "13px",
    },
  };
}