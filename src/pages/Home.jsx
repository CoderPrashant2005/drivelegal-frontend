// Home.jsx
import React, { useState, useEffect, useRef } from "react";
import logo from "../a.png";
import { Link } from "react-router-dom";
import Chatbot from "../Components/Chatbot";
import challanImg   from "../assets/mascots/challan-viewer.png";
import aiImg        from "../assets/mascots/ai-assistant.png";
import locationImg  from "../assets/mascots/location-rules.png";
import analyticsImg from "../assets/mascots/analytics-dashboard.png";
import accessImg    from "../assets/mascots/role-based-access.png";
import { useSession } from "./useSession";
import "./global.css";

const SLIDES = [
  { url: "https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?w=1800&q=85", tag: "🚔 Police Awareness Drive",  title: "Traffic Police & Citizens\nWorking Together",    sub: "Real-time challan issuance and road safety awareness across India's cities.", accent: "#f59e0b" },
  { url: "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=1800&q=85", tag: "📱 Digital E-Challan",       title: "Pay Your Fine.\nAnywhere. Instantly.",            sub: "No queues. No paperwork. Settle traffic fines in seconds via SmartRoad.",    accent: "#34d399" },
  { url: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1800&q=85", tag: "⚖️ Know Your Laws",          title: "Drive Legal.\nStay Protected.",                   sub: "Understand traffic rules, penalties and your rights as a road user in India.", accent: "#60a5fa" },
  { url: "https://images.unsplash.com/photo-1533106958148-daeeab2f3e5e?w=1800&q=85", tag: "🛣️ Smarter Roads",        title: "India's Highways\nMonitored 24/7",                sub: "Live traffic data, violation tracking and RTO coordination across 1,45,000+ km.", accent: "#f472b6" },
];
const SLIDE_DURATION = 4500;

const MascotImg = ({ src, alt, size = 96 }) => <img src={src} alt={alt} width={size} height={size} className="sr-mascot-img" />;
const MascotChallans  = () => <MascotImg src={challanImg}   alt="Challan Viewer"     />;
const MascotAI        = () => <MascotImg src={aiImg}        alt="AI Assistant"        />;
const MascotLocation  = () => <MascotImg src={locationImg}  alt="Location Rules"      />;
const MascotAnalytics = () => <MascotImg src={analyticsImg} alt="Analytics Dashboard" />;
const MascotAccess    = () => <MascotImg src={accessImg}    alt="Role-Based Access"   />;
const MascotCitizen   = () => <MascotImg src={challanImg}   alt="Citizen"             />;
const MascotOfficer   = () => <MascotImg src={accessImg}    alt="RTO Officer"         />;
const MascotAnalyst   = () => <MascotImg src={analyticsImg} alt="Analyst"             />;
const MascotChief     = () => <MascotImg src={locationImg}  alt="RTO Chief"           />;

const FEATURES = [
  { mascot: () => <MascotChallans />,  title: "My Challans",         desc: "View all issued challans with status, amount, and due dates in one clean dashboard." },
  { mascot: () => <MascotAI />,        title: "AI Assistant",        desc: "Ask our chatbot any traffic law question and get instant, accurate answers." },
  { mascot: () => <MascotLocation />,  title: "Location Rules",      desc: "Get speed limits, penalties and rules specific to your current city or highway." },
  { mascot: () => <MascotAnalytics />, title: "Analytics Dashboard", desc: "Analysts and chiefs get deep violation trends, charts and exportable reports." },
  { mascot: () => <MascotAccess />,    title: "Role-Based Access",   desc: "Military-grade access control — citizen, officer, analyst, chief. Each sees only their own view." },
];
const ROLES = [
  { mascot: () => <MascotCitizen />, role: "Citizen",     desc: "Check challans, pay fines, and stay updated on traffic laws.",  path: "/login" },
  { mascot: () => <MascotOfficer />, role: "RTO Officer", desc: "Issue challans, verify vehicles, and file daily reports.",       path: "/login" },
  { mascot: () => <MascotAnalyst />, role: "Analyst",     desc: "Deep analytics, violation trends, and data-driven reporting.",   path: "/login" },
  { mascot: () => <MascotChief />,   role: "RTO Chief",   desc: "Full oversight: manage officers, analysts and all system data.", path: "/login" },
];
const STATS = [
  { val: 50000,  suffix: "+", label: "Citizens"     },
  { val: 200,    suffix: "+", label: "Officers"     },
  { val: 145000, suffix: "+", label: "km Monitored" },
  { val: 99,     suffix: "%", label: "Uptime"       },
];

function useCountUp(target, duration = 1800, start = false) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!start) return;
    let raf;
    const startTime = performance.now();
    const tick = (now) => {
      const p = Math.min((now - startTime) / duration, 1);
      setCount(Math.floor((1 - Math.pow(1 - p, 3)) * target));
      if (p < 1) raf = requestAnimationFrame(tick); else setCount(target);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration, start]);
  return count;
}
function StatItem({ stat, started }) {
  const val = useCountUp(stat.val, 1800, started);
  return (
    <div className="sr-stat-item">
      <span className="sr-stat-item__value">{val.toLocaleString()}{stat.suffix}</span>
      <span className="sr-stat-item__label">{stat.label}</span>
    </div>
  );
}

export default function Home() {
  const [scrolled,     setScrolled]     = useState(false);
  const [current,      setCurrent]      = useState(0);
  const [animKey,      setAnimKey]      = useState(0);
  const [statsVisible, setStatsVisible] = useState(false);
  const [chatOpen,     setChatOpen]     = useState(false);
  const statsRef = useRef(null);
  const timerRef = useRef(null);

  const session    = useSession();
  const isLoggedIn = !!session;

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

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 50);
      const bar = document.getElementById("sr-progress-bar");
      if (bar) { const sc = window.scrollY, t = document.documentElement.scrollHeight - window.innerHeight; bar.style.width = t ? `${(sc/t)*100}%` : "0%"; }
      document.getElementById("sr-back-top")?.classList.toggle("visible", window.scrollY > 400);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!statsRef.current) return;
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) setStatsVisible(true); }, { threshold: 0.4 });
    io.observe(statsRef.current);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    const els = document.querySelectorAll(".sr-reveal");
    const io = new IntersectionObserver(entries => entries.forEach(e => { if (e.isIntersecting) e.target.classList.add("sr-visible"); }), { threshold: 0.12 });
    els.forEach(el => io.observe(el));
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    timerRef.current = setInterval(() => { setCurrent(c => { setAnimKey(k => k+1); return (c+1)%SLIDES.length; }); }, SLIDE_DURATION);
    return () => clearInterval(timerRef.current);
  }, []);

  useEffect(() => {
    if (!document.getElementById("sr-progress-bar")) { const b = document.createElement("div"); b.id="sr-progress-bar"; document.body.prepend(b); }
    if (!document.getElementById("sr-back-top"))     { const b = document.createElement("button"); b.id="sr-back-top"; b.innerHTML="↑"; b.onclick=()=>window.scrollTo({top:0,behavior:"smooth"}); document.body.appendChild(b); }
    return () => { ["sr-progress-bar","sr-back-top"].forEach(id => document.getElementById(id)?.remove()); };
  }, []);

  const slide = SLIDES[current];

  return (
    <div className="sr-page">

      {/* NAVBAR */}
      <nav className={`sr-nav${scrolled ? " sr-nav--scrolled" : " sr-nav--hero-top"}`}>
        <div className="sr-nav__brand">
          <img src={logo} alt="Drive Legal" className="sr-nav__logo" width={50} height={50} />
        </div>
        <div className="sr-nav__links">
          {["Home","About","Services","Contact"].map(l => (
            <a key={l} href={l==="Home"?"/":`/${l.toLowerCase()}`} className="sr-nav__link nl">{l}</a>
          ))}
          <button onClick={toggleTheme} className="sr-nav__theme-btn">{isDark ? "Light" : "Dark"}</button>
          {/* Logged in: show user name + logout. Logged out: show Login button */}
          {isLoggedIn ? (
            <div className="sr-nav__user-pill">
              <span className="sr-nav__user-name">👤 {session.name?.split(" ")[0]}</span>
              <button
                className="sr-nav__logout-btn"
                onClick={() => { localStorage.removeItem("smartroad_session"); window.location.reload(); }}
              >Logout</button>
            </div>
          ) : (
            <Link to="/login" className="sr-nav__btn">Login →</Link>
          )}
        </div>
      </nav>

      {/* HERO SLIDESHOW */}
      <section className="sr-hero">
        <div className="sr-hero__particle-overlay" aria-hidden="true">
          {Array.from({length:18}).map((_,i) => <div key={i} className="particle" style={{"--i":i}} />)}
        </div>
        <div className="sr-hero__slide-bg">
          {SLIDES.map((s,i) => (
            <div key={i} className={`sr-hero__slide-layer ${i===current?"slide-active":"slide-hidden"}`} style={{backgroundImage:`url(${s.url})`}} />
          ))}
          <div className="sr-hero__overlay" />
          <div className="sr-hero__accent-bar" style={{background:slide.accent}} />
        </div>
        <div key={animKey} className="sr-hero__content hero-content-in">
          <span className="sr-hero__badge" style={{borderColor:slide.accent,color:slide.accent,background:"rgba(0,0,0,0.4)"}}>{slide.tag}</span>
          <h1 className="sr-hero__title">
            {slide.title.split("\n").map((line,i) => <span key={i} className={`title-line title-line-${i}`}>{line}<br /></span>)}
          </h1>
          <p className="sr-hero__sub">{slide.sub}</p>
          <div className="sr-hero__btns">
            <Link to="/services" className="sr-btn-primary btn-p" style={{background:slide.accent,color:slide.accent==="#f59e0b"?"#000":"#fff"}}>Get Started →</Link>
            <a href="/services" className="sr-btn-ghost btn-g">View Services</a>
          </div>
        </div>
        <div className="sr-hero__progress-strip">
          {SLIDES.map((s,i) => (
            <div key={i} onClick={() => { setCurrent(i); setAnimKey(k=>k+1); clearInterval(timerRef.current); timerRef.current=setInterval(()=>{setCurrent(c=>{setAnimKey(k=>k+1);return (c+1)%SLIDES.length;});},SLIDE_DURATION); }} className="sr-hero__progress-track">
              <div className={i===current?"progress-fill-active":"progress-fill-rest"} style={{background:i===current?s.accent:"rgba(255,255,255,0.35)"}} />
            </div>
          ))}
        </div>
        <div ref={statsRef} className="sr-hero__stats-bar">
          {STATS.map((s,i) => <StatItem key={i} stat={s} started={statsVisible} />)}
        </div>
      </section>

      {/* FEATURES */}
      <section className="sr-section--features page-enter">
        <div className="sr-reveal">
          <h2 className="sr-section-title">Everything You Need</h2>
          <p className="sr-section-sub">One platform for citizens, officers, analysts and chiefs.</p>
        </div>
        <div className="sr-feature-grid">
          {FEATURES.map((f,i) => (
            <div key={i} className="sr-feature-card fc sr-reveal">
              <div className="sr-feature-icon">{f.mascot()}</div>
              <h3 className="sr-feature-title">{f.title}</h3>
              <p className="sr-feature-desc">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ROLE CARDS */}
      <section className="sr-roles">
        <h2 className="sr-section-title--white sr-reveal">Who Uses Drive Legal?</h2>
        <div className="sr-role-grid">
          {ROLES.map((r,i) => (
            <div key={i} className="sr-role-card rc sr-reveal">
              <div className="sr-role-card__mascot">{r.mascot()}</div>
              <h3 className="sr-role-card__title">{r.role}</h3>
              <p className="sr-role-card__desc">{r.desc}</p>
              <Link to={r.path} className="sr-role-card__btn">Access Portal →</Link>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="sr-cta sr-cta--white sr-reveal">
        <div className="sr-cta__glow" aria-hidden="true" />
        <h2 className="sr-cta__title">Ready to get started?</h2>
        <p className="sr-cta__sub">Join thousands of citizens and officers already using SmartRoad.</p>
        <Link to="/login" className="sr-btn-primary btn-p">Login / Register →</Link>
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
      <button onClick={() => setChatOpen(o=>!o)} className={`sr-chat-fab ${chatOpen?"sr-chat-fab--open":"sr-chat-fab--closed"}`} aria-label="Toggle AI Assistant" title="Traffic Law AI Assistant">
        {chatOpen ? <span className="sr-chat-fab__close-icon">✕</span> : <img src={aiImg} alt="AI Assistant" width={42} height={42} className="sr-chat-fab__mascot-img" />}
      </button>
    </div>
  );
}
