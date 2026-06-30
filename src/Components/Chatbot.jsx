// Chatbot.jsx — AI-powered floating chatbot, talks to OUR backend (Groq)
// Topics: traffic laws, penalties, SmartRoad services
import React, { useState, useRef, useEffect } from "react";

// Point this at your own backend. Backend holds the Groq API key.
const API_BASE = process.env.REACT_APP_API_URL || "https://drivelegal-backend-sdkv.onrender.com/api";

export default function Chatbot({ onClose }) {
  const [messages, setMessages] = useState([
    { from: "bot", text: "Hi! 👋 I'm your SmartRoad Traffic Law Assistant. Ask me about traffic laws, penalties, or how to pay your challan." },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg = { from: "user", text };
    const history = [...messages, userMsg];
    setMessages(history);
    setInput("");
    setLoading(true);

    try {
      const apiMessages = history
        .filter(m => m.from === "user" || m.from === "bot")
        .map(m => ({ role: m.from === "user" ? "user" : "assistant", content: m.text }));

      // Call our own backend proxy — Groq API key stays server-side only.
      const res = await fetch(`${API_BASE}/chatbot`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: apiMessages }),
      });

      if (!res.ok) throw new Error("Request failed");

      const data = await res.json();
      const reply = data.reply || "Sorry, I couldn't get a response. Please try again.";
      setMessages(prev => [...prev, { from: "bot", text: reply }]);
    } catch (err) {
      setMessages(prev => [...prev, { from: "bot", text: "⚠️ Connection error. Please try again shortly." }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } };

  return (
    <div style={S.wrap}>
      {/* Header */}
      <div style={S.header}>
        <div style={S.headerLeft}>
          <span style={S.avatar}></span>
          <div>
            <div style={S.headerTitle}>Traffic Law Assistant</div>
            <div style={S.headerSub}>SmartRoad AI · Always online</div>
          </div>
        </div>
        <button style={S.closeBtn} onClick={onClose} aria-label="Close chat">✕</button>
      </div>

      {/* Messages */}
      <div style={S.body}>
        {messages.map((m, i) => (
          <div key={i} style={{ display: "flex", justifyContent: m.from === "user" ? "flex-end" : "flex-start", marginBottom: "10px" }}>
            {m.from === "bot" && <span style={S.botAvatar}></span>}
            <div style={m.from === "user" ? S.userBubble : S.botBubble}>
              {m.text}
            </div>
          </div>
        ))}
        {loading && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <span style={S.botAvatar}></span>
            <div style={{ ...S.botBubble, display: "flex", gap: 4, padding: "12px 16px" }}>
              {[0,1,2].map(i => <span key={i} style={{ ...S.dot, animationDelay: `${i*0.18}s` }} />)}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={S.inputRow}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKey}
          placeholder="Ask about laws, fines, challans…"
          style={S.input}
          disabled={loading}
        />
        <button style={{ ...S.sendBtn, opacity: loading || !input.trim() ? 0.5 : 1 }} onClick={sendMessage} disabled={loading || !input.trim()}>
          ➤
        </button>
      </div>
    </div>
  );
}

const S = {
  wrap: {
    position: "fixed", bottom: 90, right: 24, width: 360, height: 480,
    background: "#ffffff",
    border: "1px solid rgba(29,78,216,0.15)",
    borderRadius: 20,
    display: "flex", flexDirection: "column",
    boxShadow: "0 24px 64px rgba(0,0,0,0.18), 0 4px 16px rgba(29,78,216,0.12)",
    overflow: "hidden",
    fontFamily: "'DM Sans', sans-serif",
    zIndex: 1000,
    animation: "chatIn 0.35s cubic-bezier(.22,1,.36,1) both",
  },
  header: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "14px 16px",
    background: "linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%)",
  },
  headerLeft: { display: "flex", alignItems: "center", gap: 10 },
  avatar: { fontSize: 26, lineHeight: 1 },
  headerTitle: { fontSize: 14, fontWeight: 700, color: "#fff", fontFamily: "'Sora', sans-serif" },
  headerSub: { fontSize: 11, color: "rgba(255,255,255,0.7)", marginTop: 1 },
  closeBtn: {
    background: "rgba(255,255,255,0.15)", border: "none", borderRadius: 8,
    color: "#fff", fontSize: 14, cursor: "pointer", padding: "4px 9px", lineHeight: 1,
  },
  body: {
    flex: 1, overflowY: "auto", padding: "14px 14px 4px",
    background: "#f8faff",
    display: "flex", flexDirection: "column",
  },
  botAvatar: { fontSize: 18, marginRight: 6, alignSelf: "flex-end", marginBottom: 2, flexShrink: 0 },
  botBubble: {
    background: "#fff", border: "1px solid #e5e9f7",
    borderRadius: "18px 18px 18px 4px",
    padding: "10px 14px", fontSize: 13, lineHeight: 1.6,
    color: "#1a2340", maxWidth: "82%",
    boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
    whiteSpace: "pre-wrap",
  },
  userBubble: {
    background: "linear-gradient(135deg, #1d4ed8, #2563eb)",
    borderRadius: "18px 18px 4px 18px",
    padding: "10px 14px", fontSize: 13, lineHeight: 1.6,
    color: "#fff", maxWidth: "82%",
    whiteSpace: "pre-wrap",
  },
  dot: {
    width: 7, height: 7, borderRadius: "50%",
    background: "#93c5fd",
    display: "inline-block",
    animation: "bounce 0.9s ease-in-out infinite",
  },
  inputRow: {
    display: "flex", gap: 8, padding: "10px 12px",
    borderTop: "1px solid #e5e9f7",
    background: "#fff",
  },
  input: {
    flex: 1, border: "1.5px solid #e5e9f7", borderRadius: 12,
    padding: "9px 13px", fontSize: 13, fontFamily: "'DM Sans', sans-serif",
    outline: "none", color: "#1a2340", background: "#f8faff",
  },
  sendBtn: {
    background: "#1d4ed8", color: "#fff", border: "none",
    borderRadius: 12, padding: "9px 14px", fontSize: 16, cursor: "pointer",
    transition: "all 0.2s",
  },
};
