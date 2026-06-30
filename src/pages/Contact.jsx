// Contact.jsx — with SMTP + DB form submission
import React, { useState, useEffect } from "react";
import logo from "../a.png";
import { Link, useNavigate } from "react-router-dom";
import Chatbot from "../Components/Chatbot";
import { useSession } from "./useSession";
import "./global.css";

export default function Contact() {
  const navigate  = useNavigate();
  const session   = useSession();
  const isLoggedIn = !!session;

  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem("smartroad-theme") || "light";
    document.documentElement.setAttribute("data-theme", saved);
    return saved === "dark";
  });
  const [scrolled,  setScrolled]  = useState(false);
  const [form,      setForm]      = useState({ name: "", email: "", subject: "", message: "" });
  const [submitted, setSubmitted] = useState(false);
  const [loading,   setLoading]   = useState(false);
  const [chatOpen,  setChatOpen]  = useState(false);
  const [msgAlert,  setMsgAlert]  = useState("");
  const [error,     setError]     = useState("");

  const MSG_WORD_LIMIT = 500;
  const wordCount = (str) => str.trim() === "" ? 0 : str.trim().split(/\s+/).length;

  // ─── FORM SUBMIT → API ───────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!form.name.trim() || !form.email.trim() || !form.subject.trim() || !form.message.trim()) {
      setError("All fields are required.");
      return;
    }
    if (wordCount(form.message) > MSG_WORD_LIMIT) {
      setMsgAlert(`Message exceeds ${MSG_WORD_LIMIT} words. Please shorten it.`);
      return;
    }
    setMsgAlert("");
    setLoading(true);

    try {
   const res = await fetch("https://drivelegal-backend-sdkv.onrender.com/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Something went wrong. Please try again.");
      } else {
        setSubmitted(true);
        setForm({ name: "", email: "", subject: "", message: "" });
      }
    } catch (err) {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 50);
      const bar = document.getElementById("sr-progress-bar");
      if (bar) {
        const s = window.scrollY, t = document.documentElement.scrollHeight - window.innerHeight;
        bar.style.width = t ? `${(s / t) * 100}%` : "0%";
      }
      const btn = document.getElementById("sr-back-top");
      if (btn) btn.classList.toggle("visible", window.scrollY > 400);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const els = document.querySelectorAll(".sr-reveal");
    const io = new IntersectionObserver(
      entries => entries.forEach(e => { if (e.isIntersecting) e.target.classList.add("sr-visible"); }),
      { threshold: 0.1 }
    );
    els.forEach(el => io.observe(el));
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!document.getElementById("sr-progress-bar")) {
      const bar = document.createElement("div"); bar.id = "sr-progress-bar"; document.body.prepend(bar);
    }
    if (!document.getElementById("sr-back-top")) {
      const btn = document.createElement("button"); btn.id = "sr-back-top"; btn.innerHTML = "↑";
      btn.onclick = () => window.scrollTo({ top: 0, behavior: "smooth" }); document.body.appendChild(btn);
    }
    return () => { ["sr-progress-bar", "sr-back-top"].forEach(id => document.getElementById(id)?.remove()); };
  }, []);

  return (
    <div className="sr-page">
      {/* NAVBAR */}
      <nav className={`sr-nav${scrolled ? " sr-nav--scrolled" : ""}`}>
        <div className="sr-nav__brand">
          <img src={logo} alt="Drive Legal" className="sr-nav__logo" width="50" height="50" />
        </div>
        <div className="sr-nav__links">
          {[["Home", "/"], ["About", "/about"], ["Services", "/services"], ["Contact", "/contact"]].map(([l, h]) => (
            <a key={l} href={h} className={`sr-nav__link nl${l === "Contact" ? " sr-nav__link--active" : ""}`}>{l}</a>
          ))}
          <button
            onClick={() => {
              const next = isDark ? "light" : "dark";
              document.documentElement.setAttribute("data-theme", next);
              localStorage.setItem("smartroad-theme", next);
              setIsDark(!isDark);
              window.dispatchEvent(new Event("smartroad-theme-change"));
            }}
            className="sr-nav__theme-btn"
          >{isDark ? "Light" : "Dark"}</button>
          {isLoggedIn ? (
            <div className="sr-nav__user-pill">
              <span className="sr-nav__user-name">👤 {session.name?.split(" ")[0]}</span>
              <button
                className="sr-nav__logout-btn"
                onClick={() => { localStorage.removeItem("smartroad_session"); navigate("/login"); }}
              >Logout</button>
            </div>
          ) : (
            <Link to="/login" className="sr-nav__btn">Login →</Link>
          )}
        </div>
      </nav>

      {/* HERO */}
      <section className="sr-page-hero page-enter">
        <div className="sr-page-hero__glow sr-page-hero__glow--lower" aria-hidden="true" />
        <div className="sr-page-hero__badge">Contact Us</div>
        <h1 className="sr-page-hero__title">We're Here to Help</h1>
        <p className="sr-page-hero__sub" style={{ maxWidth: "500px" }}>
          Have a question about your challan, our services, or need technical support? Reach out to us.
        </p>
      </section>

      {/* CONTACT CONTENT */}
      <section className="sr-contact-section">
        {/* INFO */}
        <div>
          <h2 className="sr-contact-info__title sr-reveal">Get in Touch</h2>
          <p className="sr-contact-info__desc sr-reveal">Our support team is available Monday to Saturday, 9 AM to 6 PM IST.</p>

          {[
            { icon: "📞", label: "Phone",  value: "1800-XXX-XXXX (Toll Free)", href: "tel:1800XXXXXXX" },
            { icon: "✉️", label: "Email",  value: "drivelegalinfo@gmail.com",  href: "mailto:drivelegalinfo@gmail.com" },
            { icon: "🏢", label: "Office", value: "RTO Headquarters, New Delhi - 110001" },
            { icon: "🕐", label: "Hours",  value: "Mon–Sat: 9:00 AM – 6:00 PM IST" },
          ].map((c, i) => (
            <div key={i} className="sr-contact-card cc sr-reveal" style={{ cursor: c.href ? "pointer" : "default" }}>
              <div className="sr-contact-icon-wrap">{c.icon}</div>
              <div>
                <div className="sr-contact-label">{c.label}</div>
                {c.href ? (
                  <a href={c.href} className="sr-contact-value" style={{ textDecoration: "none", color: "inherit" }}
                    onMouseEnter={e => e.currentTarget.style.textDecoration = "underline"}
                    onMouseLeave={e => e.currentTarget.style.textDecoration = "none"}>
                    {c.value}
                  </a>
                ) : (
                  <div className="sr-contact-value">{c.value}</div>
                )}
              </div>
            </div>
          ))}

          <div id="quick-help" className="sr-faq-box sr-reveal">
            <h3 className="sr-faq-title">Quick Help</h3>
            {[
              { q: "How do I check my challan status?",       href: "/user/challans" },
              { q: "I paid but challan still shows pending?", href: "mailto:drivelegalinfo@gmail.com?subject=Challan Still Pending After Payment" },
              { q: "How do I change my registered vehicle?",  href: "/user/profile" },
              { q: "How to report a wrong challan?",          href: "mailto:drivelegalinfo@gmail.com?subject=Wrong Challan Dispute" },
            ].map(({ q, href }, i) => (
              <a key={i} href={href} className="sr-faq-item fq"
                style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
                <span className="sr-faq-icon">❓</span> {q}
              </a>
            ))}
          </div>
        </div>

        {/* FORM */}
        <div className="sr-reveal">
          {submitted ? (
            <div className="sr-success-box success-in">
              <div className="sr-success-icon">✅</div>
              <h3 className="sr-success-title">Message Sent!</h3>
              <p className="sr-success-desc">We've received your message and will respond within 24 hours.</p>
              <button onClick={() => setSubmitted(false)} className="sr-btn-primary btn-p">Send Another</button>
            </div>
          ) : (
            <div className="sr-form-card">
              <h2 className="sr-form-title">Send a Message</h2>

              {/* Error Banner */}
              {error && (
                <div style={{
                  marginBottom: "14px", padding: "10px 14px", borderRadius: "8px",
                  background: "rgba(239,68,68,0.10)", border: "1px solid rgba(239,68,68,0.35)",
                  color: "#ef4444", fontSize: "13px", fontWeight: 500
                }}>
                  ⚠️ {error}
                </div>
              )}

              <label className="sr-label">
                Full Name
                <input
                  className="sr-input form-inp"
                  placeholder="Your full name"
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                />
              </label>

              <label className="sr-label">
                Email Address
                <input
                  type="email"
                  className="sr-input form-inp"
                  placeholder="your@email.com"
                  value={form.email}
                  onChange={e => setForm({ ...form, email: e.target.value })}
                />
              </label>

              <label className="sr-label">
                Subject
                <input
                  className="sr-input form-inp"
                  placeholder="What is this regarding?"
                  value={form.subject}
                  onChange={e => setForm({ ...form, subject: e.target.value })}
                />
              </label>

              <label className="sr-label">
                <span style={{ display: "flex", justifyContent: "space-between" }}>
                  Message
                  <span style={{ color: wordCount(form.message) > 500 ? "#ef4444" : "var(--sr-muted)", fontSize: "12px" }}>
                    {wordCount(form.message)} / 500 words
                  </span>
                </span>
                <textarea
                  className="sr-input sr-input--textarea form-inp"
                  placeholder="Describe your issue or question… (max 500 words)"
                  value={form.message}
                  onChange={e => {
                    setForm({ ...form, message: e.target.value });
                    setMsgAlert(wordCount(e.target.value) > 500
                      ? `Message exceeds 500 words (currently ${wordCount(e.target.value)} words). Please shorten it.`
                      : "");
                  }}
                  style={{ borderColor: wordCount(form.message) > 500 ? "#ef4444" : undefined }}
                />
                {msgAlert && (
                  <div style={{
                    marginTop: "6px", padding: "8px 12px", borderRadius: "8px",
                    background: "rgba(239,68,68,0.10)", border: "1px solid rgba(239,68,68,0.35)",
                    color: "#ef4444", fontSize: "13px", fontWeight: 500, display: "flex", alignItems: "center", gap: "6px"
                  }}>
                    ⚠️ {msgAlert}
                  </div>
                )}
              </label>

              <button
                onClick={handleSubmit}
                className={`sr-submit-btn btn-p${loading ? " sr-submit-btn--loading" : ""}`}
                disabled={loading}
              >
                {loading ? (
                  <span className="sr-submit-btn__spinner">
                    <span className="spin">⏳</span> Sending…
                  </span>
                ) : "Send Message →"}
              </button>
            </div>
          )}
        </div>
      </section>

      {/* FOOTER */}
      <footer className="sr-footer">
        <div className="sr-footer__grid">
          <div>
            <div className="sr-footer__brand-row">
              <span className="sr-footer__brand-icon">
                <img src={logo} alt="Drive Legal" className="sr-footer__brand-icon" />
              </span>
            </div>
            <p className="sr-footer__brand-tagline">India's Smart Traffic Enforcement &amp;<br />Road Safety Platform.</p>
            <p className="sr-footer__tagline">Helping citizens, traffic officers, and administrators manage violations, challans, and road safety services through a unified digital ecosystem.</p>
            <div className="sr-footer__socials">
              {[["𝕏","Twitter"],["in","LinkedIn"],["▶","YouTube"],["⌥","GitHub"]].map(([icon, label]) => (
                <span key={label} className="sr-footer__social-icon" title={label}>{icon}</span>
              ))}
            </div>
          </div>
          <div>
            <div className="sr-footer__col-title"><span className="sr-footer__col-title-icon">🔗</span> Quick Links</div>
            <span className="sr-footer__col-underline" />
            {[["Home","/"],["About Us","/about"],["Services", isLoggedIn ? "/services" : "/login"],["Contact Us","/contact"],["FAQs","/contact#quick-help"]].map(([label, href]) => (
              <a key={label} href={href} className="sr-footer__link">{label}</a>
            ))}
          </div>
          <div>
            <div className="sr-footer__col-title"><span className="sr-footer__col-title-icon">👤</span> User Portals</div>
            <span className="sr-footer__col-underline" />
            {[["👤","Citizen Dashboard","/user/dashboard"],["📋","Challan Services","/user/challans"],["📍","Location Services","/user/location-info"]].map(([icon, name, servicePath]) => (
              <Link key={name} to={isLoggedIn ? servicePath : "/login"} className="sr-footer__portal-item" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: "10px" }}>
                <div className="sr-footer__portal-icon">{icon}</div>
                <span className="sr-footer__portal-name">{name}</span>
              </Link>
            ))}
          </div>
          <div>
            <div className="sr-footer__col-title"><span className="sr-footer__col-title-icon">👥</span> Admin Services</div>
            <span className="sr-footer__col-underline" />
           {[["🚔","Officer Portal"],["📊","Analyst Portal"],["👑","Chief Dashboard"],["⚙️","Admin Panel"],["👥","Customer Support"]].map(([icon, name]) => (
              <Link key={name} to="/admin/login" className="sr-footer__portal-item" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: "10px" }}>
                <div className="sr-footer__portal-icon">{icon}</div>
                <span className="sr-footer__portal-name">{name}</span>
              </Link>
            ))}
          </div>
          <div>
            <div className="sr-footer__col-title"><span className="sr-footer__col-title-icon">🎧</span> Contact &amp; Support</div>
            <span className="sr-footer__col-underline" />
            {[
              { icon: "✉️", text: "drivelegalinfo@gmail.com", href: "mailto:drivelegalinfo@gmail.com" },
              { icon: "📞", text: "+91 98765 43210",          href: "tel:+919876543210" },
              { icon: "🕐", text: "Support Hours\nMon – Fri : 9 AM – 6 PM" },
              { icon: "📍", text: "India" },
            ].map((c, i) => (
              <div key={i} className="sr-footer__contact-row">
                <span className="sr-footer__contact-icon">{c.icon}</span>
                {c.href ? (
                  <a href={c.href} style={{ color: "inherit", textDecoration: "none" }}
                    onMouseEnter={e => e.currentTarget.style.textDecoration = "underline"}
                    onMouseLeave={e => e.currentTarget.style.textDecoration = "none"}>{c.text}</a>
                ) : <span>{c.text}</span>}
              </div>
            ))}
          </div>
        </div>
        <div className="sr-footer__bottom">
          <div className="sr-footer__bottom-left">© 2026 <span className="sr-footer__accent-text">Drive Legal</span>. All Rights Reserved.</div>
          <div className="sr-footer__bottom-links">
            <a href="#" className="sr-footer__bottom-link">Privacy Policy</a>
            <span className="sr-footer__bottom-divider">|</span>
            <a href="#" className="sr-footer__bottom-link">Terms of Use</a>
            <span className="sr-footer__bottom-divider">|</span>
            <a href="#" className="sr-footer__bottom-link">Accessibility</a>
          </div>
          <div className="sr-footer__bottom-right">
            <span className="sr-footer__made-with">Made with ❤️ for Safer Indian Roads</span>
            <button className="sr-footer__back-top" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>↑</button>
          </div>
        </div>
      </footer>

      {chatOpen && <Chatbot onClose={() => setChatOpen(false)} />}
      <button
        onClick={() => setChatOpen(o => !o)}
        title="AI Assistant"
        className={`sr-chat-fab sr-chat-fab--sm ${chatOpen ? "sr-chat-fab--sm-open" : "sr-chat-fab--sm-closed"}`}
        aria-label={chatOpen ? "Close chat" : "Open AI Assistant"}
      >
        {chatOpen ? "✕" : "💬"}
      </button>
    </div>
  );
}
