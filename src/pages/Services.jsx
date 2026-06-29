// Services.jsx
import React, { useState, useEffect } from "react";
import logo from "../a.png";
import { Link, useNavigate } from "react-router-dom";
import Chatbot from "../Components/Chatbot";
import challanImg   from "../assets/mascots/challan-viewer.png";
import aiImg        from "../assets/mascots/ai-assistant.png";
import locationImg  from "../assets/mascots/location-rules.png";
import analyticsImg from "../assets/mascots/analytics-dashboard.png";
import accessImg    from "../assets/mascots/role-based-access.png";
import { useSession } from "./useSession";
import { useAuth } from "../Auth/AuthContext";
import WelcomeBadge from "./WelcomeBadge";
import "./global.css";

const MascotImg = ({ src, alt, size = 64 }) => (
  <img src={src} alt={alt} width={size} height={size} className="sr-mascot-img" />
);

export default function Services() {
  const navigate   = useNavigate();
  const session    = useSession();       // ✅ reactive session state
  const { logout } = useAuth();
  const isLoggedIn = !!session;
  const isAdmin    = ["rto_officer", "analyst", "rto_chief"].includes(session?.role);

  const [scrolled,  setScrolled]  = useState(false);
  const [chatOpen,  setChatOpen]  = useState(false);

  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem("smartroad-theme");
    if (saved) document.documentElement.setAttribute("data-theme", saved);
    return saved === "dark";
  });

  const toggleTheme = () => {
    const next = isDark ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("smartroad-theme", next);
    setIsDark(!isDark);
    window.dispatchEvent(new Event("smartroad-theme-change"));
  };

  // ─── If NOT logged in, redirect immediately to login then back here ───
  useEffect(() => {
    if (session === null) {
      navigate("/login", { state: { from: "/services" }, replace: true });
    }
  // Only run once on mount — not on every session change
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 50);
      const bar = document.getElementById("sr-progress-bar");
      if (bar) {
        const s = window.scrollY, t = document.documentElement.scrollHeight - window.innerHeight;
        bar.style.width = t ? `${(s / t) * 100}%` : "0%";
      }
      document.getElementById("sr-back-top")?.classList.toggle("visible", window.scrollY > 400);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const els = document.querySelectorAll(".sr-reveal");
    const io  = new IntersectionObserver(
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

  // Don't render anything while redirecting
  if (!isLoggedIn) return null;

  return (
    <div className="sr-page">

      {/* ✅ Hello / Welcome back banner — auto-hides after 5s */}
      <WelcomeBadge session={session} />

      {/* NAVBAR */}
      <nav className={`sr-nav${scrolled ? " sr-nav--scrolled" : ""}`}>
        <div className="sr-nav__brand">
          <img src={logo} alt="Drive Legal" className="sr-nav__logo" width={50} height={50} />
        </div>
        <div className="sr-nav__links">
          {[["Home", "/"], ["About", "/about"], ["Services", "/services"], ["Contact", "/contact"]].map(([l, h]) => (
            <a key={l} href={h} className={`sr-nav__link nl${l === "Services" ? " sr-nav__link--active" : ""}`}>{l}</a>
          ))}

          <button onClick={toggleTheme} className="sr-nav__theme-btn">{isDark ? "Light" : "Dark"}</button>

          {/* ✅ No "My Dashboard" — show user name + logout pill instead */}
          <div className="sr-nav__user-pill">
            <span className="sr-nav__user-name">👤 {session.name?.split(" ")[0]}</span>
            <button
              className="sr-nav__logout-btn"
              onClick={() => {
                logout();
                navigate("/login");
              }}
            >Logout</button>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section className="sr-page-hero page-enter">
        <div className="sr-page-hero__glow sr-page-hero__glow--lower" aria-hidden="true" />
        <div className="sr-page-hero__badge">Our Services</div>
        <h1 className="sr-page-hero__title">Everything You Need<br />for Road Safety</h1>
        <p className="sr-page-hero__sub" style={{ maxWidth: "540px" }}>
          Tailored services for every user — citizens, officers, analysts and administrators.
        </p>
      </section>

      {/* CITIZEN SERVICES — hidden for admin roles */}
      {!isAdmin && (
      <section className="sr-section">
        <div className="sr-reveal">
          <div className="sr-role-tag">👤 For Citizens</div>
          <h2 className="sr-role-title">Citizen Services</h2>
          <p className="sr-role-desc">Manage your traffic challans, stay updated on laws, and access location-based traffic info.</p>
          <div className="sr-logged-in-banner">
            ✅ Logged in as <strong>{session.name}</strong> — click any card to get started!
          </div>
        </div>

        <div className="sr-service-grid">
          {[
            { mascotSrc: challanImg,  alt: "View Challans", title: "View My Challans", desc: "Access all your traffic challans in one place — status, amount, due date.",        tag: "Free",    userPath: "/user/challans"      },
            { mascotSrc: locationImg, alt: "Location Info", title: "Location Info",    desc: "Get traffic rules, speed limits and penalties specific to your current location.", tag: "Live",    userPath: "/user/location-info" },
            { mascotSrc: aiImg,       alt: "AI Assistant",  title: "AI Assistant",     desc: "Ask our chatbot any traffic law question and get instant, accurate answers.",      tag: "24/7",    userPath: null                  },
          ].map((s, i) => (
            <div
              key={i}
              className="sr-service-card sc sr-reveal sr-service-card--clickable"
              onClick={() => s.userPath ? navigate(s.userPath) : setChatOpen(true)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === "Enter" && (s.userPath ? navigate(s.userPath) : setChatOpen(true))}
            >
              <div className="sr-service-card__top">
                <MascotImg src={s.mascotSrc} alt={s.alt} size={64} />
                <span className="sr-service-tag">{s.tag}</span>
              </div>
              <h3 className="sr-service-title">{s.title}</h3>
              <p className="sr-service-desc">{s.desc}</p>
              <div className="sr-service-card__cta">
                {s.userPath === null ? "Open Chatbot →" : "Go to Service →"}
              </div>
            </div>
          ))}
        </div>
      </section>
      )}

      {/* OFFICER SERVICES */}
      <section className="sr-officer-section">
        <div className="sr-reveal">
          <div className="sr-role-tag sr-role-tag--officer">🚔 For RTO Officers</div>
          <h2 className="sr-role-title">Officer Tools</h2>
          <p className="sr-role-desc">Efficient tools to issue, verify, and manage challans on the go.</p>
        </div>
        <div className="sr-service-grid">
          {[
            { mascotSrc: accessImg,    alt: "Issue Challans",  title: "Issue Challans",  desc: "Quickly issue challans with vehicle details, violation type and photo evidence." },
            { mascotSrc: challanImg,   alt: "Verify Vehicles", title: "Verify Vehicles", desc: "Instant vehicle registration and insurance verification from any location."      },
            { mascotSrc: analyticsImg, alt: "Daily Reports",   title: "Daily Reports",   desc: "Auto-generated daily activity reports for accountability and performance tracking." },
            { mascotSrc: challanImg,   alt: "Challan History", title: "Challan History", desc: "Full history of all challans issued — searchable, filterable, exportable."        },
          ].map((s, i) => (
            <div key={i} className="sr-service-card sr-service-card--officer sc sr-reveal">
              <div className="sr-service-card__mascot">
                <MascotImg src={s.mascotSrc} alt={s.alt} size={64} />
              </div>
              <h3 className="sr-service-title">{s.title}</h3>
              <p className="sr-service-desc">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="sr-cta sr-reveal">
        <div className="sr-cta__glow sr-cta__glow--sm" aria-hidden="true" />
        <h2 className="sr-cta__title">Access Your Services Now</h2>
        <p className="sr-cta__sub">Login with your credentials to access your role-specific dashboard.</p>
        <Link to="/login" className="sr-btn-primary sr-btn-primary--lg btn-p">Login to Portal →</Link>
      </section>

      {/* FOOTER */}
      <footer className="sr-footer">
        <div className="sr-footer__grid">

          {/* COL 1 — Brand */}
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

          {/* COL 2 — Quick Links */}
          <div>
            <div className="sr-footer__col-title">
              <span className="sr-footer__col-title-icon">🔗</span> Quick Links
            </div>
            <span className="sr-footer__col-underline" />
            {[
              ["Home",       "/"],
              ["About Us",   "/about"],
              ["Services",   isLoggedIn ? "/services" : "/login"],
              ["Contact Us", "/contact"],
              ["FAQs",       "/contact#quick-help"],
            ].map(([label, href]) => (
              <a key={label} href={href} className="sr-footer__link">{label}</a>
            ))}
          </div>

          {/* COL 3 — User Portals */}
          <div>
            <div className="sr-footer__col-title">
              <span className="sr-footer__col-title-icon">👤</span> User Portals
            </div>
            <span className="sr-footer__col-underline" />
            {[
              ["👤", "Citizen Dashboard", "/user/dashboard"],
              ["📋", "Challan Services",  "/user/challans"],
              ["📍", "Location Services", "/user/location-info"],
            ].map(([icon, name, servicePath]) => (
              <Link
                key={name}
                to={isLoggedIn ? servicePath : "/login"}
                className="sr-footer__portal-item"
                style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: "10px" }}
              >
                <div className="sr-footer__portal-icon">{icon}</div>
                <span className="sr-footer__portal-name">{name}</span>
              </Link>
            ))}
          </div>

          {/* COL 4 — Admin Services */}
          <div>
            <div className="sr-footer__col-title">
              <span className="sr-footer__col-title-icon">👥</span> Admin Services
            </div>
            <span className="sr-footer__col-underline" />
            {[["🚔","Officer Portal"],["📊","Analyst Portal"],["👑","Chief Dashboard"],["⚙️","Admin Panel"],["👥","Customer Support"]].map(([icon, name]) => (
              <Link key={name} to="/admin/login" className="sr-footer__portal-item" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: "10px" }}>
                <div className="sr-footer__portal-icon">{icon}</div>
                <span className="sr-footer__portal-name">{name}</span>
              </Link>
            ))}
          </div>

          {/* COL 5 — Contact & Support */}
          <div>
            <div className="sr-footer__col-title">
              <span className="sr-footer__col-title-icon">🎧</span> Contact &amp; Support
            </div>
            <span className="sr-footer__col-underline" />
            {[
              { icon: "✉️", text: "drivelegalinfo@gmail.com",        href: "mailto:drivelegalinfo@gmail.com" },
              { icon: "📞", text: "+91 98765 43210",               href: "tel:+919876543210" },
              { icon: "🕐", text: "Support Hours\nMon – Fri : 9 AM – 6 PM" },
              { icon: "📍", text: "India" },
            ].map((c, i) => (
              <div key={i} className="sr-footer__contact-row">
                <span className="sr-footer__contact-icon">{c.icon}</span>
                {c.href ? (
                  <a href={c.href} style={{ color: "inherit", textDecoration: "none" }}
                    onMouseEnter={e => e.currentTarget.style.textDecoration = "underline"}
                    onMouseLeave={e => e.currentTarget.style.textDecoration = "none"}>
                    {c.text}
                  </a>
                ) : (
                  <span>{c.text}</span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* ── BOTTOM BAR ── */}
        <div className="sr-footer__bottom">
          <div className="sr-footer__bottom-left">
            © 2026 <span className="sr-footer__accent-text">Drive Legal</span>. All Rights Reserved.
          </div>
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