// LocationInfo.jsx
import React, { useState } from "react";
import logo from "../a.png";
import { useNavigate } from "react-router-dom";
import "./user.css";

const STATE_LAWS = {
  "Delhi": [
    "Speed limit: 50 km/h in residential areas, 70 km/h on arterial roads",
    "Helmet mandatory for all two-wheeler riders and pillion passengers",
    "Seatbelt mandatory for all occupants in a motor vehicle",
    "No parking within 5m of a fire hydrant or junction",
    "Mobile phone use while driving: fine ₹5,000",
    "Drunk driving (BAC > 0.03%): fine ₹10,000 + imprisonment up to 6 months",
    "Red light jumping: fine ₹5,000 for first offence",
    "Odd-Even scheme applicable on notified dates (private cars)",
  ],
  "Maharashtra": [
    "Speed limit: 40 km/h in city, 60 km/h on state highways",
    "Triple riding on two-wheelers is a punishable offence: fine ₹2,000",
    "Helmet compulsory; fine ₹1,000 for violation",
    "Lane driving mandatory on expressways",
    "Mumbai: No heavy vehicles allowed in city limits during 8AM–11PM",
    "Pollution Under Control (PUC) certificate mandatory",
    "Tinted glass prohibited beyond permissible VLT levels",
  ],
  "Karnataka": [
    "Speed limit: 50 km/h urban, 80 km/h highways",
    "Helmet mandatory; fine ₹1,000 + licence suspension",
    "Seatbelt violation: fine ₹1,000",
    "Bengaluru: No vehicle older than 15 years (diesel) / 20 years (petrol) allowed",
    "Right of way: pedestrians at zebra crossings have priority",
    "Overloading: fine up to ₹2,000 per extra tonne",
  ],
  "Tamil Nadu": [
    "Speed limit: 40 km/h in city, 70 km/h on highways",
    "Helmet mandatory for two-wheelers: fine ₹1,000",
    "Auto-rickshaws must use meters within Chennai city limits",
    "No honking near hospitals, schools, and courts",
    "Heavy vehicles banned in Chennai city core during peak hours",
    "Seatbelt for all passengers: fine ₹500",
  ],
  "Uttar Pradesh": [
    "Speed limit: 40 km/h urban areas, 60 km/h on state highways",
    "Helmet compulsory for riders and pillion",
    "Overloading of goods vehicles: heavy penalty + vehicle impound",
    "Driving without licence: fine ₹5,000",
    "School zones: speed limit 25 km/h mandatory",
    "No parking on main roads during peak hours (8AM–10AM, 5PM–8PM)",
  ],
  "default": [
    "Helmet mandatory for all two-wheeler riders (Motor Vehicles Act, Section 129)",
    "Seatbelt compulsory for driver and all passengers",
    "Speed limits: 30 km/h in school zones, 50 km/h urban, 80 km/h highways",
    "Mobile phone use while driving: fine ₹5,000 (MV Act 2019)",
    "Drunk driving: BAC > 0.03% — fine ₹10,000 + up to 6 months imprisonment",
    "Red light jumping: fine ₹1,000–₹5,000",
    "No entry violation: fine ₹500",
    "Driving without insurance: fine ₹2,000",
    "Pollution Under Control (PUC) certificate mandatory for all vehicles",
    "Overloading passengers: fine ₹1,000 per extra passenger",
  ],
};

export default function LocationInfo() {
  const navigate = useNavigate();
  const [status, setStatus] = useState("idle");
  const [data, setData]     = useState(null);
  const [error, setError]   = useState("");

  const fetchLocation = () => {
    setStatus("loading");
    setError("");
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser.");
      setStatus("error");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`);
          const geo = await res.json();
          const addr = geo.address || {};
          const state    = addr.state || "Unknown";
          const district = addr.county || addr.state_district || addr.city || "Unknown";
          const city     = addr.city || addr.town || addr.village || addr.suburb || "Unknown";
          const laws     = STATE_LAWS[state] || STATE_LAWS["default"];
          setData({ state, district, city, latitude: latitude.toFixed(5), longitude: longitude.toFixed(5), laws });
          setStatus("success");
        } catch {
          setError("Could not fetch location details. Check your internet connection.");
          setStatus("error");
        }
      },
      (err) => {
        setError(err.code === 1
          ? "Location access denied. Please allow location permission in your browser."
          : "Unable to retrieve your location. Try again.");
        setStatus("error");
      },
      { timeout: 10000 }
    );
  };

  return (
    <div className="u-page">
      {/* NAV */}
      <nav className="u-nav">
        <div className="u-nav-brand">
          <img src={logo} alt="Drive Legal" className="sr-nav__logo" width={50} height={50} />
        </div>
        <button onClick={() => navigate(-1)} className="u-nav-back">Back to Dashboard</button>
      </nav>

      <div className="u-main-md">
        {/* HEADER */}
        <div className="u-page-header">
          <div className="u-page-header-icon">📍</div>
          <div>
            <h1 className="u-page-title">Location Info</h1>
            <p className="u-page-sub">Know the transport laws at your current location</p>
          </div>
        </div>

        {/* IDLE */}
        {status === "idle" && (
          <div className="u-idle-card">
            <div style={{ fontSize: "56px", marginBottom: "16px" }}>🗺️</div>
            <h2 className="u-idle-title">Find Your Location's Traffic Laws</h2>
            <p className="u-idle-sub">
              This service detects your exact location using GPS and shows the applicable
              state transport laws, speed limits, and traffic rules for where you are right now.
            </p>
            <button onClick={fetchLocation} className="u-btn-primary">📍 Detect My Location</button>
            <p className="u-idle-note">Your location data is never stored on our servers.</p>
          </div>
        )}

        {/* LOADING */}
        {status === "loading" && (
          <div className="u-idle-card">
            <div style={{ fontSize: "48px", marginBottom: "16px" }} className="spin">🔄</div>
            <h2 className="u-idle-title">Fetching your location…</h2>
            <p className="u-idle-sub">Please allow location access if prompted by your browser.</p>
          </div>
        )}

        {/* ERROR */}
        {status === "error" && (
          <div className="u-idle-card">
            <div style={{ fontSize: "48px", marginBottom: "16px" }}>⚠️</div>
            <h2 className="u-idle-title" style={{ color: "#f87171" }}>Location Error</h2>
            <p className="u-idle-sub">{error}</p>
            <button onClick={fetchLocation} className="u-btn-primary">Try Again</button>
          </div>
        )}

        {/* SUCCESS */}
        {status === "success" && data && (
          <div>
            <div className="u-location-card">
              <div className="u-loc-row">
                <div className="u-loc-item">
                  <div className="u-loc-label">State</div>
                  <div className="u-loc-val">{data.state}</div>
                </div>
                <div className="u-loc-divider" />
                <div className="u-loc-item">
                  <div className="u-loc-label">District</div>
                  <div className="u-loc-val">{data.district}</div>
                </div>
                <div className="u-loc-divider" />
                <div className="u-loc-item">
                  <div className="u-loc-label">City / Area</div>
                  <div className="u-loc-val">{data.city}</div>
                </div>
                <div className="u-loc-divider" />
                <div className="u-loc-item">
                  <div className="u-loc-label">Coordinates</div>
                  <div className="u-loc-val">{data.latitude}, {data.longitude}</div>
                </div>
              </div>
            </div>

            <div className="u-laws-header">
              <span className="u-laws-badge">📜</span>
              <span className="u-laws-title">
                Transport Laws applicable in <strong>{data.state}</strong>
              </span>
            </div>

            <div className="u-laws-list">
              {data.laws.map((law, i) => (
                <div key={i} className="u-law-item">
                  <div className="u-law-num">{i + 1}</div>
                  <div className="u-law-text">{law}</div>
                </div>
              ))}
            </div>

            <button onClick={fetchLocation} className="u-btn-ghost">🔄 Refresh Location</button>
          </div>
        )}
      </div>
    </div>
  );
}