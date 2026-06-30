import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../Auth/AuthContext";
import "./user.css";

const MYSQL_API     = process.env.REACT_APP_API_URL || "https://drivelegal-backend-sdkv.onrender.com/api";
const STREAMLIT_URL  = process.env.REACT_APP_STREAMLIT_URL || "https://prashant-2025-drivelegal-dashboard-backend.hf.space";

// ── Fetch helper ───────────────────────────────────────────────────────────────
async function mysqlFetch(path, token) {
  const res = await fetch(`${MYSQL_API}${path}`, {
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "MySQL API error");
  return data;
}

export default function UserChallanDashboard() {
  const navigate    = useNavigate();
  const { user, token } = useAuth();

  const [vehicles,      setVehicles]      = useState([]);
  const [selectedPlate, setSelectedPlate] = useState(null);
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState(null);

  // ── Load user vehicles ──────────────────────────────────────────────────
  // (Challan/violation data now lives only in the embedded Streamlit
  // dashboard below — no separate MySQL challans fetch needed here.)
  useEffect(() => {
    if (!token) { navigate("/login"); return; }
    (async () => {
      try {
        const vData = await mysqlFetch("/auth/vehicles/mine", token);
        const vList = vData.vehicles || [];
        setVehicles(vList);
        if (vList.length > 0) setSelectedPlate(vList[0].vehicle_number);
      } catch (e) {
        setError("Failed to load your data. Please try again.");
      } finally {
        setLoading(false);
      }
    })();
  }, [token, navigate]);

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", color: "#666" }}>
        Loading your dashboard…
      </div>
    );
  }

  return (
    <div className="u-page">
      {/* ── NAV ── */}
      <nav className="u-nav">
        <div className="u-nav-brand" style={{ fontWeight: 700, fontSize: "1.2rem" }}>
          🚗 DriveLegal
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <span style={{ color: "#9ca3af", fontSize: "0.9rem" }}>
            {user?.name || "User"}
          </span>
          <button onClick={() => navigate(-1)} className="u-nav-back">← Back</button>
        </div>
      </nav>

      <div className="u-main u-main--full">

        {error && (
          <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 8, padding: "12px 16px", marginBottom: 20, color: "#ef4444" }}>
            {error}
          </div>
        )}

        {/* ── VEHICLE SELECTOR ── */}
        {vehicles.length > 1 && (
          <div style={{ marginBottom: 24 }}>
            <label style={{ color: "#9ca3af", fontSize: "0.85rem", marginBottom: 8, display: "block" }}>
              Select Vehicle
            </label>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              {vehicles.map(v => (
                <button
                  key={v.vehicle_number}
                  onClick={() => setSelectedPlate(v.vehicle_number)}
                  style={{
                    padding: "8px 18px", borderRadius: 8, border: "1px solid",
                    borderColor: selectedPlate === v.vehicle_number ? "#6366f1" : "rgba(255,255,255,0.1)",
                    background: selectedPlate === v.vehicle_number ? "rgba(99,102,241,0.15)" : "transparent",
                    color: selectedPlate === v.vehicle_number ? "#6366f1" : "#9ca3af",
                    cursor: "pointer", fontWeight: 600,
                  }}
                >
                  🚘 {v.vehicle_number}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════ */}
        {/* Live Streamlit dashboard — this now IS the page,  */}
        {/* no "My Challans" tab: that data is already shown  */}
        {/* inside this embedded dashboard.                   */}
        {/* ════════════════════════════════════════════════ */}
        {!selectedPlate ? (
          <div className="u-empty">
            <div className="u-empty-icon">📡</div>
            <div className="u-empty-title">Dashboard data unavailable</div>
            <div className="u-empty-sub">No vehicle registered. Please register a vehicle first.</div>
          </div>
        ) : (
          <div style={{ borderRadius: 12, overflow: "hidden", border: "1px solid rgba(255,255,255,0.08)" }}>
            <iframe
              key={selectedPlate}
              src={`${STREAMLIT_URL}/?car=${encodeURIComponent(selectedPlate)}`}
              title="DriveLegal Live Dashboard"
              style={{ width: "100%", height: "calc(100vh - 140px)", border: "none", display: "block" }}
              allow="clipboard-write"
            />
          </div>
        )}
      </div>
    </div>
  );
}