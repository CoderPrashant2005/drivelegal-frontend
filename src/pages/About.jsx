// About.jsx — all inline styles moved to global.css
import React, { useState, useEffect, useRef } from "react";
import logo from "../a.png";
import { Link, useNavigate } from "react-router-dom";
import Chatbot from "../Components/Chatbot";
import challanImg   from "../assets/mascots/challan-viewer.png";
import aiImg        from "../assets/mascots/ai-assistant.png";
import locationImg  from "../assets/mascots/location-rules.png";
import analyticsImg from "../assets/mascots/analytics-dashboard.png";
import accessImg    from "../assets/mascots/role-based-access.png";
import { useSession } from "./useSession";
import "./global.css";

function useCountUp(target, duration = 1600, start = false) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!start) return;
    let raf;
    const t0 = performance.now();
    const tick = (now) => {
      const p = Math.min((now - t0) / duration, 1);
      const e = 1 - Math.pow(1 - p, 3);
      setCount(Math.floor(e * target));
      if (p < 1) raf = requestAnimationFrame(tick);
      else setCount(target);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration, start]);
  return count;
}

const MascotImg = ({ src, alt, size = 80 }) => (
  <img src={src} alt={alt} width={size} height={size} className="sr-mascot-img" />
);

const MascotCitizen = ({ size = 80 }) => <MascotImg src={challanImg}   alt="Citizen"     size={size} />;
const MascotOfficer = ({ size = 80 }) => <MascotImg src={accessImg}    alt="RTO Officer" size={size} />;
const MascotAnalyst = ({ size = 80 }) => <MascotImg src={analyticsImg} alt="Analyst"     size={size} />;
const MascotChief   = ({ size = 80 }) => <MascotImg src={locationImg}  alt="RTO Chief"   size={size} />;

const MASCOTS = [MascotCitizen, MascotOfficer, MascotAnalyst, MascotChief];

const HeroMascot    = () => <MascotImg src={accessImg}  alt="Traffic Officer" size={120} />;
const MissionMascot = () => <MascotImg src={challanImg} alt="Citizen on Road" size={160} />;

const TEAM_STATS = [
  { val: 50000, suffix: "+", role: "Citizens",     icon: "👤", desc: "Registered users managing their challans online." },
  { val: 200,   suffix: "+", role: "RTO Officers", icon: "🚔", desc: "Active officers issuing and verifying challans daily." },
  { val: 50,    suffix: "+", role: "Analysts",     icon: "📊", desc: "Experts generating insights from traffic data." },
  { val: 15,    suffix: "+", role: "RTO Chiefs",   icon: "👑", desc: "District-level administrators overseeing operations." },
];

function TeamCard({ t, started, MascotComponent }) {
  const val = useCountUp(t.val, 1600, started);
  return (
    <div className="sr-team-card tc">
      <div className="sr-team-card__mascot">
        <MascotComponent size={72} />
      </div>
      <div className="sr-team-card__value">{val.toLocaleString()}{t.suffix}</div>
      <div className="sr-team-card__role">{t.role}</div>
      <div className="sr-team-card__desc">{t.desc}</div>
    </div>
  );
}

export default function About() {
  const navigate = useNavigate();
  const session    = useSession();
  const isLoggedIn = !!session;

  const [isDark, setIsDark]             = useState(() => {
    const saved = localStorage.getItem("smartroad-theme") || "light";
    document.documentElement.setAttribute("data-theme", saved);
    return saved === "dark";
  });
  const [scrolled,     setScrolled]     = useState(false);
  const [statsVisible, setStatsVisible] = useState(false);
  const [chatOpen,     setChatOpen]     = useState(false);
  const statsRef = useRef(null);

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
    if (!statsRef.current) return;
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) setStatsVisible(true); }, { threshold: 0.3 });
    io.observe(statsRef.current);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    const els = document.querySelectorAll(".sr-reveal");
    const io = new IntersectionObserver(
      (entries) => entries.forEach(e => { if (e.isIntersecting) e.target.classList.add("sr-visible"); }),
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
      btn.onclick = () => window.scrollTo({ top: 0, behavior: "smooth" });
      document.body.appendChild(btn);
    }
    return () => { ["sr-progress-bar", "sr-back-top"].forEach(id => document.getElementById(id)?.remove()); };
  }, []);

  return (
    <div className="sr-page">
      {/* NAVBAR */}
      <nav className={`sr-nav${scrolled ? " sr-nav--scrolled" : ""}`}>
        <div className="sr-nav__brand">
  <img
    src={logo}
    alt="Drive Legal"
    className="sr-nav__logo"
    width={'50'}
    height={'50'}
    alignItems="auto"
  />
</div>
        <div className="sr-nav__links">
          {[["Home", "/"], ["About", "/about"], ["Services", "/services"], ["Contact", "/contact"]].map(([l, h]) => (
            <a key={l} href={h}
              className={`sr-nav__link nl${l === "About" ? " sr-nav__link--active" : ""}`}
            >{l}</a>
          ))}
          <button onClick={() => { const next = isDark ? "light" : "dark"; document.documentElement.setAttribute("data-theme", next); localStorage.setItem("smartroad-theme", next); setIsDark(!isDark); window.dispatchEvent(new Event("smartroad-theme-change")); }} className="sr-nav__theme-btn">{isDark ? "Light" : "Dark"}</button>
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
        <div className="sr-page-hero__glow" aria-hidden="true" />
        <div className="sr-page-hero__badge">About Us</div>
        <h1 className="sr-page-hero__title">Building Safer Roads<br />Through Technology</h1>
        <p className="sr-page-hero__sub">SmartRoad is India's modern traffic management platform connecting citizens, officers, and administrators for efficient and transparent road safety.</p>
        <div className="sr-page-hero__mascot-wrap">
          <HeroMascot />
        </div>
      </section>

      {/* MISSION */}
      <section className="sr-section">
        <div className="sr-mission-grid">
          <div className="sr-reveal">
            <div className="sr-section-label">Our Mission</div>
            <h2 className="sr-section-title sr-section-title--left">Bridging the Gap Between Citizens &amp; Authorities</h2>
            <p className="sr-body-text">We believe road safety is a shared responsibility. SmartRoad was built to make challan management transparent, fast, and fair for everyone.</p>
            <p className="sr-body-text">Our platform empowers citizens to stay informed, officers to act efficiently, and administrators to make data-driven decisions that save lives.</p>
            <div className="sr-mission-mascot-wrap sr-reveal">
              <MissionMascot />
            </div>
          </div>
          <div className="sr-mission-cards">
            {[
              { icon: "🎯", title: "Transparency",  desc: "Every challan, every action — fully visible and auditable." },
              { icon: "⚡", title: "Efficiency",    desc: "Cut processing time from days to seconds." },
              { icon: "🤝", title: "Accessibility", desc: "Available to every citizen, everywhere in India." },
            ].map((m, i) => (
              <div key={i} className="sr-mission-card mc sr-reveal">
                <span className="sr-mission-icon">{m.icon}</span>
                <div>
                  <div className="sr-mission-title">{m.title}</div>
                  <div className="sr-mission-desc">{m.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TEAM STATS */}
      <section className="sr-blue-section">
        <h2 className="sr-section-title--white sr-reveal">Our Platform Serves</h2>
        <div ref={statsRef} className="sr-team-grid">
          {TEAM_STATS.map((t, i) => {
            const MascotComponent = MASCOTS[i];
            return (
              <div key={i} className="sr-reveal" style={{ transitionDelay: `${i * 0.08}s` }}>
                <TeamCard t={t} started={statsVisible} MascotComponent={MascotComponent} />
              </div>
            );
          })}
        </div>
      </section>

      {/* VALUES */}
      <section className="sr-section">
        <div className="sr-values-header sr-reveal">
          <div className="sr-section-label">What We Stand For</div>
          <h2 className="sr-section-title">Our Values</h2>
        </div>
        <div className="sr-values-grid">
          {[
            { mascotSrc: accessImg,    alt: "Security First", title: "Security First", desc: "Role-based access ensures only authorized personnel access sensitive data." },
            { mascotSrc: challanImg,   alt: "User Friendly",  title: "User Friendly",  desc: "Designed for everyone — from tech-savvy youth to senior citizens." },
            { mascotSrc: locationImg,  alt: "India-Centric",  title: "India-Centric",  desc: "Built for Indian roads, Indian laws, and Indian users." },
            { mascotSrc: analyticsImg, alt: "Data Driven",    title: "Data Driven",    desc: "Every decision backed by real traffic data and analytics." },
          ].map((v, i) => (
            <div key={i} className="sr-value-card vc sr-reveal">
              <div className="sr-value-card__mascot">
                <MascotImg src={v.mascotSrc} alt={v.alt} size={72} />
              </div>
              <h3 className="sr-value-card__title">{v.title}</h3>
              <p className="sr-value-card__desc">{v.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="sr-cta sr-reveal">
        <div className="sr-cta__glow sr-cta__glow--sm" aria-hidden="true" />
        <h2 className="sr-cta__title">Be part of safer roads</h2>
        <p className="sr-cta__sub">Join SmartRoad today and experience smarter traffic management.</p>
        <Link to="/login" className="sr-btn-primary sr-btn-primary--lg btn-p">Get Started →</Link>
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


      {/* Chatbot FAB + Panel */}
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
