// Analyst.jsx — Two-panel layout: Left: Chalan Info table | Right: Chalan Request
// DB-backed version — violations table fetched/updated via /api/violations,
// no localStorage persistence.
import React, { useState, useEffect, useRef } from "react";
import { api } from "./api";
import "./admin.css";

// Must match api.js's API_BASE_URL host (without the /api suffix) so
// relative evidence_image paths like "/uploads/violations/x.jpg" resolve
// to the backend, not the frontend's own origin.
const BACKEND_ORIGIN = "https://drivelegal-backend-sdkv.onrender.com";

function resolveImageUrl(path) {
  if (!path) return "";
  return path.startsWith("http") ? path : `${BACKEND_ORIGIN}${path}`;
}

// Maps the real /api/violations response shape into the shape this UI
// was originally built around, so the render code below doesn't need
// to change field-by-field everywhere.
function mapViolationToChallan(v) {
  return {
    id: v.challan_number || String(v.violation_id), // display label
    violation_id: v.violation_id,                    // real PK, used for API calls
    name: v.owner_name || "Unknown",
    mail: v.owner_email || "—",
    plate_no: v.vehicle_number,
    plate_img: resolveImageUrl(v.evidence_image),
    violation: v.violation_type,
    area: [v.address, v.city, v.state].filter(Boolean).join(", ") || "—",
    officer: v.officer_name || "—",
    fine: Number(v.penalty_amount) || 0,
    date: v.violation_time ? new Date(v.violation_time).toLocaleString() : "—",
    status: (v.status || "").toLowerCase(), // "pending" | "approved" | "rejected"
  };
}

// ─── Status Badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  return (
    <span className={`analyst-status-badge ${status}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

// ─── Number Plate Image Modal ─────────────────────────────────────────────────
function PlateModal({ challan, onClose }) {
  if (!challan) return null;
  return (
    <div className="analyst-modal-overlay" onClick={onClose}>
      <div className="analyst-modal-box" onClick={e => e.stopPropagation()}>
        <div className="analyst-modal-header">
          <p className="analyst-modal-title">Number Plate — {challan.plate_no}</p>
          <button className="analyst-modal-close" onClick={onClose}>✕</button>
        </div>
        <img
          src={challan.plate_img}
          alt={`Number plate ${challan.plate_no}`}
          className="analyst-modal-plate-img"
        />
        <div className="analyst-modal-info-grid">
          {[
            ["Chalan ID", challan.id],
            ["Violation", challan.violation],
            ["Area", challan.area],
            ["Officer", challan.officer],
            ["Fine", `₹${challan.fine.toLocaleString()}`],
            ["Date", challan.date],
          ].map(([k, v]) => (
            <div key={k}>
              <p className="analyst-info-key">{k}</p>
              <p className="analyst-info-val">{v}</p>
            </div>
          ))}
        </div>
        <p className="analyst-modal-footer">
          Image captured by RTO Officer · {challan.date}
        </p>
      </div>
    </div>
  );
}

// ─── Chalan Request Detail Panel ─────────────────────────────────────────────
function ChalanRequestPanel({ challans, selected, searchQuery, setSearchQuery, onApprove, onDeny, onClearSelection }) {
  const filtered = searchQuery.trim()
    ? challans.filter(c =>
        c.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.plate_no.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : selected ? [selected] : [];

  const displayChallan = filtered[0] || selected;

  return (
    <div className="analyst-request-panel">
      {/* Header */}
      <div className="analyst-request-header">
        <div className="analyst-request-title-row">
          <button className="analyst-back-btn" onClick={onClearSelection}>← Back</button>
          <h3 className="analyst-request-title">
            Chalan <span className="analyst-muted">request</span>
          </h3>
        </div>
        {/* Search */}
        <div className="analyst-search-wrap">
          <input
            type="text"
            placeholder="Search by Chalan no. or plate no…"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="analyst-search-input"
          />
          <span className="analyst-search-icon">🔍</span>
        </div>
      </div>

      {/* Detail */}
      <div className="analyst-request-body">
        {!displayChallan ? (
          <div className="analyst-empty-state">
            <div className="analyst-empty-icon">📋</div>
            <p className="analyst-empty-text">
              Select a chalan from the info table<br />or search by chalan no.
            </p>
          </div>
        ) : (
          <div>
            {/* Chalan ID + status */}
            <div className="analyst-detail-toprow">
              <span className="analyst-chalan-id-badge">{displayChallan.id}</span>
              <StatusBadge status={displayChallan.status} />
            </div>

            {/* Number plate image */}
            <div className="analyst-plate-img-wrap">
              <div className="analyst-plate-img-header">
                <span className="analyst-plate-img-label">Number Plate Photo</span>
              </div>
              <img
                src={displayChallan.plate_img}
                alt={`Number plate ${displayChallan.plate_no}`}
                className="analyst-plate-img"
              />
            </div>

            {/* Info grid */}
            <div className="analyst-detail-grid">
              {[
                ["👤 Name", displayChallan.name],
                ["📧 Email", displayChallan.mail],
                ["🚗 Plate No.", displayChallan.plate_no],
                ["⚠️ Violation", displayChallan.violation],
                ["📍 Area", displayChallan.area],
                ["👮 Officer", displayChallan.officer],
                ["📅 Date", displayChallan.date],
                ["💰 Fine Amount", `₹${displayChallan.fine.toLocaleString()}`],
              ].map(([k, v]) => (
                <div key={k} className="analyst-detail-card">
                  <p className="analyst-detail-key">{k}</p>
                  <p className="analyst-detail-val">{v}</p>
                </div>
              ))}
            </div>

            {/* Action buttons */}
            {displayChallan.status === "pending" && (
              <div className="analyst-action-row">
                <button
                  onClick={() => onApprove(displayChallan.violation_id)}
                  className="analyst-btn-approve"
                >
                  ✅ Approve Chalan
                </button>
                <button
                  onClick={() => onDeny(displayChallan.violation_id)}
                  className="analyst-btn-deny"
                >
                  ❌ Deny Chalan
                </button>
              </div>
            )}
            {displayChallan.status !== "pending" && (
              <div className="analyst-resolved-note">
                This chalan has already been <strong>{displayChallan.status}</strong>.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Analyst Component ───────────────────────────────────────────────────
export default function Analyst() {
  const [challans, setChallans] = useState([]);
  const [selectedChallan, setSelectedChallan] = useState(null);
  const [plateModalChallan, setPlateModalChallan] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showRequestPanel, setShowRequestPanel] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load pending violations from DB (table: violations, joined with vehicles/users/admins)
  useEffect(() => {
    (async () => {
      try {
        const data = await api.getPendingViolations(); // GET /violations/pending
        setChallans((data.violations || []).map(mapViolationToChallan));
      } catch (e) {
        setError(e.message === "UNAUTHENTICATED"
          ? "Session expired — please log in again."
          : "Failed to load violations.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Theme is a client-only UI preference; kept as-is but could be moved to user prefs in DB.
  // (Removed: localStorage 'smartroad-theme' lookup — assumed handled globally by app shell.)

  const handleApprove = async (violationId) => {
    try {
      await api.approveViolation(violationId); // PATCH /violations/:id/approve
      setChallans(prev => prev.map(c => c.violation_id === violationId ? { ...c, status: "approved" } : c));
      if (selectedChallan?.violation_id === violationId) setSelectedChallan(prev => ({ ...prev, status: "approved" }));
    } catch (e) {
      alert(`Failed to approve violation — ${e.message}`);
    }
  };

  const handleDeny = async (violationId) => {
    try {
      await api.rejectViolation(violationId); // PATCH /violations/:id/reject
      setChallans(prev => prev.map(c => c.violation_id === violationId ? { ...c, status: "rejected" } : c));
      if (selectedChallan?.violation_id === violationId) setSelectedChallan(prev => ({ ...prev, status: "rejected" }));
    } catch (e) {
      alert(`Failed to reject violation — ${e.message}`);
    }
  };

  const requestPanelRef = useRef(null);
  const [panelFlash, setPanelFlash] = useState(false);

  const handleRowClick = (challan) => {
    setSelectedChallan(challan);
    setSearchQuery("");
    setShowRequestPanel(true);
    if (requestPanelRef.current) {
      requestPanelRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    setPanelFlash(true);
    setTimeout(() => setPanelFlash(false), 600);
  };

  const handleBack = async () => {
    try {
      await api.logout(); // best-effort server notification, if the route exists
    } catch (e) {
      // non-fatal — token clearing below is what actually matters for JWT auth
    } finally {
      localStorage.removeItem("smartroad_token");
      window.location.href = "/admin/login";
    }
  };

  const pendingCount = challans.filter(c => c.status === "pending").length;

  if (loading) {
    return <div className="analyst-wrapper"><p>Loading challans…</p></div>;
  }

  return (
    <div className="analyst-wrapper">
      {/* ── Top Nav ── */}
      <nav className="analyst-nav">
        <div className="analyst-nav-left">
          <div className="analyst-nav-icon">🔍</div>
          <span className="analyst-nav-title">Analyst</span>
          {pendingCount > 0 && (
            <span className="analyst-pending-badge">{pendingCount} pending</span>
          )}
        </div>
        <button className="analyst-logout-btn" onClick={handleBack}>
          ← Logout
        </button>
      </nav>

      {error && <div className="analyst-table-empty">{error}</div>}

      {/* ── Two-panel layout ── */}
      <div className="analyst-panels">

        {/* LEFT: Chalan Info */}
        <div className="analyst-left-panel">
          <div className="analyst-panel-header">
            <h3 className="analyst-panel-title">
              Chalan <span className="analyst-muted">info</span>
            </h3>
            <p className="analyst-panel-subtitle">
              Click any row to load its details in the{" "}
              <strong className="analyst-highlight">Chalan Request →</strong> panel
            </p>
          </div>

          <div className="analyst-table-wrap">
            <table className="analyst-table">
              <thead>
                <tr className="analyst-thead-row">
                  {["Mail", "Name", "Plate no.", "View 👁", "Approve/Deny"].map(h => (
                    <th key={h} className="analyst-th">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {challans.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="analyst-table-empty">No challans found.</td>
                  </tr>
                ) : (
                  challans.map((c, i) => (
                    <tr
                      key={c.id}
                      className={`analyst-tr ${selectedChallan?.id === c.id ? "selected" : i % 2 === 0 ? "" : "alt"}`}
                      onClick={() => handleRowClick(c)}
                    >
                      <td className="analyst-td analyst-td-email">{c.mail}</td>
                      <td className="analyst-td analyst-td-name">{c.name}</td>
                      <td className="analyst-td analyst-td-plate">{c.plate_no}</td>
                      <td className="analyst-td">
                        <button
                          onClick={e => { e.stopPropagation(); setPlateModalChallan(c); }}
                          className="analyst-view-btn"
                          title="View number plate photo"
                        >
                          👁 Photo
                        </button>
                      </td>
                      <td className="analyst-td">
                        {c.status === "pending" ? (
                          <div className="analyst-inline-actions">
                            <button
                              onClick={e => { e.stopPropagation(); handleApprove(c.violation_id); }}
                              className="analyst-inline-approve"
                            >✓ Approve</button>
                            <button
                              onClick={e => { e.stopPropagation(); handleDeny(c.violation_id); }}
                              className="analyst-inline-deny"
                            >✗ Deny</button>
                          </div>
                        ) : (
                          <StatusBadge status={c.status} />
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* RIGHT: Chalan Request */}
        <div
          ref={requestPanelRef}
          className={`analyst-right-panel${panelFlash ? " flash" : ""}`}
        >
          <ChalanRequestPanel
            challans={challans}
            selected={challans.find(c => c.id === selectedChallan?.id)}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            onApprove={handleApprove}
            onDeny={handleDeny}
            onClearSelection={() => { setSelectedChallan(null); setShowRequestPanel(false); }}
          />
        </div>
      </div>

      {/* Number Plate Modal */}
      {plateModalChallan && (
        <PlateModal challan={plateModalChallan} onClose={() => setPlateModalChallan(null)} />
      )}
    </div>
  );
}
