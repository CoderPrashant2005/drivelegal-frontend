// WelcomeBadge.jsx — drop this into ANY page to show the hello/welcome-back badge
// Usage: <WelcomeBadge session={session} />
// session comes from useSession() hook
import React, { useState, useEffect } from "react";

const getVisitKey = (email) => `smartroad_services_visited_${email}`;

export default function WelcomeBadge({ session }) {
  const [text, setText] = useState("");
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!session?.name || !session?.email) {
      setVisible(false);
      return;
    }
    const visitKey = getVisitKey(session.email);
    const hasVisited = localStorage.getItem(visitKey) === "true";

    setText(
      hasVisited
        ? `👋 Welcome back, ${session.name}!`
        : `🎉 Hello, ${session.name}! Welcome aboard.`
    );
    setVisible(true);

    if (!hasVisited) localStorage.setItem(visitKey, "true");

    const t = setTimeout(() => setVisible(false), 5000);
    return () => clearTimeout(t);
  }, [session?.email]); // re-run if user switches accounts

  if (!visible) return null;

  return (
    <div className="sr-welcome-badge">
      {text}
      <button
        className="sr-welcome-badge__close"
        onClick={() => setVisible(false)}
        aria-label="Dismiss"
      >✕</button>
    </div>
  );
}
