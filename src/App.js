import React, { createContext, useContext, useState, useCallback } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./Auth/AuthContext";
import ProtectedRoute from "./Auth/ProtectedRoute";
import Home from "./pages/Home";
import About from "./pages/About";
import Services from "./pages/Services";
import Contact from "./pages/Contact";
import Login from "./Auth/Login";
import AdminLogin from "./Auth/AdminLogin";
import ResetPassword from "./Auth/ResetPassword";
import LocationInfo from "./user/LocationInfo";
import UserChallanDashboard from "./user/UserChallanDashboard";
import RTOOfficer from "./admin/RTOOfficer";
import Analyst from "./admin/Analyst";
import RTOChief from "./admin/RTOChief";
import CustomerSupport from "./admin/CustomerSupport";
export const ThemeContext = createContext({ theme: "dark", toggleTheme: () => {} });
export const useTheme = () => useContext(ThemeContext);

function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem("smartroad-theme") || "light";
    document.documentElement.setAttribute("data-theme", saved);
    return saved;
  });
  const toggleTheme = useCallback(() => {
    setTheme(prev => {
      const next = prev === "light" ? "dark" : "light";
      document.documentElement.setAttribute("data-theme", next);
      localStorage.setItem("smartroad-theme", next);
      window.dispatchEvent(new Event("smartroad-theme-change"));
      return next;
    });
  }, []);
  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function ThemeToggleBtn({ className = "" }) {
  const { theme, toggleTheme } = useTheme();
  return (
    <button
      onClick={toggleTheme}
      className={`theme-toggle rto-theme-toggle u-theme-toggle ${className}`}
      aria-label="Toggle colour theme"
      title={theme === "light" ? "Switch to Dark Mode" : "Switch to Light Mode"}
    >
      {theme === "light" ? "🌙 Dark" : "☀️ Light"}
    </button>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/about" element={<About />} />
            <Route path="/services" element={<Services />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/login" element={<Login />} />
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/user/location-info" element={
              <ProtectedRoute allowedRoles={["user"]}><LocationInfo /></ProtectedRoute>
            } />
            <Route path="/user/challans" element={
              <ProtectedRoute allowedRoles={["user"]}><UserChallanDashboard /></ProtectedRoute>
            } />
            <Route path="/admin/rto-officer" element={
              <ProtectedRoute allowedRoles={["rto_officer"]}><RTOOfficer /></ProtectedRoute>
            } />
            <Route path="/admin/analyst" element={
              <ProtectedRoute allowedRoles={["analyst"]}><Analyst /></ProtectedRoute>
            } />
            <Route path="/admin/rto-chief" element={
              <ProtectedRoute allowedRoles={["rto_chief"]}><RTOChief /></ProtectedRoute>
            } />
            <Route path="/admin/customer-support" element={
               <ProtectedRoute allowedRoles={["customer_support"]}><CustomerSupport /></ProtectedRoute>
} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;