import React, { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";

const SESSION_KEY = "smartroad_session";

const ROLE_HOME = {
  user:        "/user/dashboard",
  rto_officer: "/admin/rto-officer",
  analyst:     "/admin/analyst",
  rto_chief:   "/admin/rto-chief",
};

export default function ProtectedRoute({ children, allowedRoles }) {
  const [status, setStatus]     = useState("idle");
  const [authUser, setAuthUser] = useState(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(SESSION_KEY);
      const user  = saved ? JSON.parse(saved) : null;
      if (user && user.role) {
        setAuthUser({ ...user, role: user.role.toLowerCase() });
        setStatus("ok");
      } else {
        setStatus("denied");
      }
    } catch {
      setStatus("denied");
    }
  }, []);

  if (status === "idle") {
    return (
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "center",
        height: "100vh", fontFamily: "sans-serif", color: "#666",
      }}>
        Loading…
      </div>
    );
  }

  if (status === "denied" || !authUser) {
    return <Navigate to="/login" replace />;
  }

  if (!allowedRoles || allowedRoles.includes(authUser.role)) {
    return children;
  }

  return <Navigate to={ROLE_HOME[authUser.role] ?? "/"} replace />;
}