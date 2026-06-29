// useSession.js — shared hook for reading the citizen session reactively
// Import this in Home, About, Contact, Services — any page that needs
// the logged-in user or the welcome badge.
import { useState, useEffect } from "react";

const SESSION_KEY = "smartroad_session";

function readSession() {
  try { return JSON.parse(localStorage.getItem(SESSION_KEY) || "null"); }
  catch { return null; }
}

export function useSession() {
  const [session, setSession] = useState(() => readSession());

  useEffect(() => {
    // Re-read immediately on mount (catches post-login navigation)
    setSession(readSession());

    // Re-read whenever the tab regains focus
    const onFocus = () => setSession(readSession());
    window.addEventListener("focus", onFocus);

    // Re-read on localStorage changes from other tabs
    const onStorage = (e) => {
      if (e.key === SESSION_KEY) setSession(readSession());
    };
    window.addEventListener("storage", onStorage);

    return () => {
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  return session; // null when logged out, object when logged in
}
