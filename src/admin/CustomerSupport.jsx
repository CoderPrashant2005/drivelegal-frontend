// CustomerSupport.jsx — Admin dashboard for viewing & replying to Contact form messages
import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../Auth/AuthContext";

const API_BASE = process.env.REACT_APP_API_URL || "https://drivelegal-backend-sdkv.onrender.com/api";

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

export default function CustomerSupport() {
  const navigate = useNavigate();
  const { token, logout } = useAuth();

  useEffect(() => {
    const saved = localStorage.getItem("smartroad-theme");
    if (saved) document.documentElement.setAttribute("data-theme", saved);
  }, []);

  const [messages, setMessages]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [listError, setListError] = useState("");
  const [selected, setSelected]   = useState(null);
  const [filter, setFilter]       = useState("all"); // all | new | replied

  const [replyText, setReplyText] = useState("");
  const [sending, setSending]     = useState(false);
  const [sendError, setSendError] = useState("");
  const [sendSuccess, setSendSuccess] = useState("");

  const fetchMessages = useCallback(async () => {
    setLoading(true);
    setListError("");
    try {
      const data = await apiFetch("/support/messages", { method: "GET" }, token);
      setMessages(data.messages || []);
    } catch (err) {
      setListError(err.message || "Failed to load messages.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchMessages(); }, [fetchMessages]);

  const handleSelect = (msg) => {
    setSelected(msg);
    setReplyText("");
    setSendError("");
    setSendSuccess("");
  };

  const handleSendReply = async () => {
    if (!replyText.trim()) {
      setSendError("Reply message cannot be empty.");
      return;
    }
    setSending(true);
    setSendError("");
    setSendSuccess("");
    try {
      await apiFetch(
        `/support/messages/${selected.id}/reply`,
        { method: "POST", body: JSON.stringify({ reply: replyText.trim() }) },
        token
      );
      setSendSuccess("Reply sent successfully!");
      setReplyText("");
      // Update local state so the list + detail reflect the new status immediately
      setMessages((prev) =>
        prev.map((m) =>
          m.id === selected.id
            ? { ...m, status: "replied", reply_message: replyText.trim(), replied_at: new Date().toISOString() }
            : m
        )
      );
      setSelected((prev) => ({
        ...prev,
        status: "replied",
        reply_message: replyText.trim(),
        replied_at: new Date().toISOString(),
      }));
    } catch (err) {
      setSendError(err.message || "Failed to send reply.");
    } finally {
      setSending(false);
    }
  };

  const handleBack = () => {
    logout();
    navigate("/");
  };

  const filteredMessages = messages.filter((m) =>
    filter === "all" ? true : m.status === filter
  );

  const fmtDate = (d) =>
    d ? new Date(d).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : "—";

  return (
    <div style={S.page}>
      <div style={S.header}>
        <div>
          <h1 style={S.title}>🎧 Customer Support Dashboard</h1>
          <p style={S.subtitle}>View and respond to citizen contact form submissions.</p>
        </div>
        <button onClick={handleBack} style={S.logoutBtn}>Logout</button>
      </div>

      <div style={S.layout}>

        {/* ── Message List ───────────────────────────────────────── */}
        <div style={S.listPanel}>
          <div style={S.filterRow}>
            {["all", "unread", "replied"].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                style={{ ...S.filterBtn, ...(filter === f ? S.filterBtnActive : {}) }}
              >
                {f === "all" ? "All" : f === "unread" ? "New" : "Replied"}
              </button>
            ))}
          </div>

          {listError && <p style={S.errorText}>{listError}</p>}

          <div style={S.listScroll}>
            {loading ? (
              <p style={S.emptyState}>Loading messages…</p>
            ) : filteredMessages.length === 0 ? (
              <p style={S.emptyState}>No messages found.</p>
            ) : (
              filteredMessages.map((msg) => (
                <div
                  key={msg.id}
                  onClick={() => handleSelect(msg)}
                  style={{
                    ...S.msgCard,
                    ...(selected?.id === msg.id ? S.msgCardActive : {}),
                  }}
                >
                  <div style={S.msgCardTop}>
                    <span style={S.msgName}>{msg.name}</span>
                    <span
                      style={{
                        ...S.statusBadge,
                        ...(msg.status === "replied" ? S.statusReplied : S.statusNew),
                      }}
                    >
                      {msg.status === "replied" ? "Replied" : "New"}
                    </span>
                  </div>
                  <div style={S.msgSubject}>{msg.subject}</div>
                  <div style={S.msgSnippet}>{msg.message}</div>
                  <div style={S.msgDate}>{fmtDate(msg.created_at)}</div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* ── Detail / Reply Panel ───────────────────────────────── */}
        <div style={S.detailPanel}>
          {!selected ? (
            <div style={S.detailEmpty}>
              <span style={{ fontSize: 40 }}>📭</span>
              <p>Select a message to view details and reply.</p>
            </div>
          ) : (
            <>
              <div style={S.detailHeader}>
                <h2 style={S.detailSubject}>{selected.subject}</h2>
                <span
                  style={{
                    ...S.statusBadge,
                    ...(selected.status === "replied" ? S.statusReplied : S.statusNew),
                  }}
                >
                  {selected.status === "replied" ? "Replied" : "New"}
                </span>
              </div>

              <div style={S.detailMeta}>
                <span><strong>{selected.name}</strong> — {selected.email}</span>
                <span style={S.detailDate}>{fmtDate(selected.created_at)}</span>
              </div>

              <div style={S.messageBox}>{selected.message}</div>

              {selected.status === "replied" && selected.reply_message && (
                <div style={S.priorReplyBox}>
                  <div style={S.priorReplyLabel}>✓ Your reply — {fmtDate(selected.replied_at)}</div>
                  <div style={S.priorReplyText}>{selected.reply_message}</div>
                </div>
              )}

              <div style={S.replySection}>
                <label style={S.label}>
                  {selected.status === "replied" ? "Send another reply" : "Write a reply"}
                </label>
                <textarea
                  style={S.textarea}
                  rows={5}
                  placeholder="Type your response to the citizen…"
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                />
                {sendError && <p style={S.errorText}>{sendError}</p>}
                {sendSuccess && <p style={S.successText}>{sendSuccess}</p>}
                <button
                  style={{ ...S.sendBtn, ...(sending ? S.sendBtnDisabled : {}) }}
                  onClick={handleSendReply}
                  disabled={sending}
                >
                  {sending ? "Sending…" : "Send Reply →"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Inline styles using global.css CSS variables ──────────────────────── */
const S = {
  page: {
    minHeight: "100vh",
    background: "var(--bg-page)",
    color: "var(--text-primary)",
    padding: "32px 40px",
    fontFamily: "'DM Sans', sans-serif",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: "28px",
  },
  title: {
    fontFamily: "'Sora', sans-serif",
    fontSize: "26px",
    fontWeight: 800,
    color: "var(--text-heading)",
    marginBottom: "4px",
  },
  subtitle: {
    fontSize: "14px",
    color: "var(--text-secondary)",
  },
  logoutBtn: {
    padding: "8px 16px",
    borderRadius: "8px",
    background: "rgba(239,68,68,0.15)",
    border: "1px solid rgba(239,68,68,0.4)",
    color: "#ef4444",
    fontSize: "13px",
    fontWeight: 600,
    cursor: "pointer",
  },
  layout: {
    display: "grid",
    gridTemplateColumns: "380px 1fr",
    gap: "24px",
    alignItems: "start",
  },
  listPanel: {
    background: "var(--bg-card)",
    border: "1px solid var(--border-card)",
    borderRadius: "16px",
    boxShadow: "var(--shadow-card)",
    padding: "16px",
  },
  filterRow: {
    display: "flex",
    gap: "8px",
    marginBottom: "14px",
  },
  filterBtn: {
    flex: 1,
    padding: "7px 0",
    borderRadius: "8px",
    border: "1px solid var(--border-input)",
    background: "var(--bg-input)",
    color: "var(--text-secondary)",
    fontSize: "12px",
    fontWeight: 700,
    cursor: "pointer",
    fontFamily: "'Sora', sans-serif",
  },
  filterBtnActive: {
    background: "var(--accent)",
    color: "#fff",
    borderColor: "var(--accent)",
  },
  listScroll: {
    maxHeight: "70vh",
    overflowY: "auto",
    display: "flex",
    flexDirection: "column",
    gap: "10px",
  },
  emptyState: {
    color: "var(--text-muted)",
    fontSize: "13px",
    textAlign: "center",
    padding: "24px 0",
  },
  msgCard: {
    background: "var(--bg-card-alt)",
    border: "1px solid var(--border-card)",
    borderRadius: "12px",
    padding: "12px 14px",
    cursor: "pointer",
    transition: "border-color .2s, transform .15s",
  },
  msgCardActive: {
    borderColor: "var(--accent)",
    boxShadow: "0 0 0 2px var(--accent-light)",
  },
  msgCardTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "4px",
  },
  msgName: {
    fontSize: "13px",
    fontWeight: 700,
    color: "var(--text-heading)",
  },
  msgSubject: {
    fontSize: "13px",
    fontWeight: 600,
    color: "var(--text-primary)",
    marginBottom: "3px",
  },
  msgSnippet: {
    fontSize: "12px",
    color: "var(--text-muted)",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    marginBottom: "6px",
  },
  msgDate: {
    fontSize: "11px",
    color: "var(--text-muted)",
  },
  statusBadge: {
    fontSize: "10px",
    fontWeight: 700,
    padding: "3px 9px",
    borderRadius: "999px",
    textTransform: "uppercase",
    letterSpacing: "0.4px",
  },
  statusNew: {
    background: "rgba(245,158,11,0.15)",
    color: "#d97706",
    border: "1px solid rgba(245,158,11,0.35)",
  },
  statusReplied: {
    background: "rgba(16,185,129,0.15)",
    color: "#10b981",
    border: "1px solid rgba(16,185,129,0.35)",
  },
  detailPanel: {
    background: "var(--bg-card)",
    border: "1px solid var(--border-card)",
    borderRadius: "16px",
    boxShadow: "var(--shadow-card)",
    padding: "28px",
    minHeight: "70vh",
  },
  detailEmpty: {
    height: "100%",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: "12px",
    color: "var(--text-muted)",
    fontSize: "14px",
  },
  detailHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "10px",
  },
  detailSubject: {
    fontFamily: "'Sora', sans-serif",
    fontSize: "20px",
    fontWeight: 800,
    color: "var(--text-heading)",
  },
  detailMeta: {
    display: "flex",
    justifyContent: "space-between",
    fontSize: "13px",
    color: "var(--text-secondary)",
    marginBottom: "18px",
    paddingBottom: "14px",
    borderBottom: "1px solid var(--border-faq)",
  },
  detailDate: {
    color: "var(--text-muted)",
  },
  messageBox: {
    background: "var(--bg-card-alt)",
    border: "1px solid var(--border-card)",
    borderRadius: "12px",
    padding: "16px 18px",
    fontSize: "14px",
    color: "var(--text-primary)",
    lineHeight: 1.6,
    marginBottom: "20px",
    whiteSpace: "pre-wrap",
  },
  priorReplyBox: {
    background: "rgba(16,185,129,0.08)",
    border: "1px solid rgba(16,185,129,0.25)",
    borderRadius: "12px",
    padding: "14px 18px",
    marginBottom: "20px",
  },
  priorReplyLabel: {
    fontSize: "12px",
    fontWeight: 700,
    color: "#10b981",
    marginBottom: "6px",
  },
  priorReplyText: {
    fontSize: "13px",
    color: "var(--text-primary)",
    lineHeight: 1.6,
    whiteSpace: "pre-wrap",
  },
  replySection: { marginTop: "8px" },
  label: {
    display: "block",
    fontSize: "13px",
    fontWeight: 700,
    color: "var(--text-heading)",
    marginBottom: "8px",
    fontFamily: "'Sora', sans-serif",
  },
  textarea: {
    width: "100%",
    padding: "12px 16px",
    border: "1.5px solid var(--border-input)",
    borderRadius: "10px",
    fontSize: "14px",
    color: "var(--text-primary)",
    background: "var(--bg-input)",
    outline: "none",
    boxSizing: "border-box",
    fontFamily: "'DM Sans', inherit",
    resize: "vertical",
    marginBottom: "12px",
  },
  sendBtn: {
    background: "var(--accent)",
    color: "#fff",
    border: "none",
    padding: "12px 28px",
    borderRadius: "50px",
    fontSize: "14px",
    fontWeight: 700,
    cursor: "pointer",
    fontFamily: "'Sora', sans-serif",
  },
  sendBtnDisabled: {
    opacity: 0.6,
    cursor: "not-allowed",
  },
  errorText: {
    color: "#ef4444",
    fontSize: "13px",
    marginBottom: "10px",
  },
  successText: {
    color: "#10b981",
    fontSize: "13px",
    marginBottom: "10px",
  },
};
