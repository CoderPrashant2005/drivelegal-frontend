// RTOOfficer.jsx
// Enhanced E-Challan Indian Traffic Police Interface
// DB-backed version — owner lookup, AI detection, and challan submission all go
// through the backend API (tables: vehicles, challans, officers), no localStorage.
import React, { useState, useRef, useEffect } from "react";
import { api, apiFetchMultipart } from "./api";
import "./admin.css";

export default function RTOOfficer() {

  // Officer profile loaded from server session (table: officers / users)
  const [officer, setOfficer] = useState({ id: "TP-5678", name: "Officer" });

  useEffect(() => {
    (async () => {
      try {
        const me = await api.getCurrentUser(); // GET /auth/me -> officers table
        setOfficer({ id: me.officer_code || me.id, name: me.name });
      } catch (e) {
        // Not logged in — leave default; route guard elsewhere should redirect
      }
    })();
  }, []);

  const [photo, setPhoto] = useState(null);
  const [preview, setPreview] = useState(null);
  const [facingMode, setFacingMode] = useState("environment"); // front / back
  const [cameraActive, setCameraActive] = useState(false);
  const [streamRef, setStreamRef] = useState(null);

  // ── CHANGE 2: AI Model API URL (configurable, defaults to localhost Python model)
  const [aiApiUrl, setAiApiUrl] = useState("http://localhost:8001/challan/detect");
  const [showAiConfig, setShowAiConfig] = useState(false);

  // Editable detail fields
  const [plateNo, setPlateNo] = useState("");
  const [violation, setViolation] = useState("");
  const [sectionNo, setSectionNo] = useState("");
  const [location, setLocation] = useState("Fetching...");
  const [captureTime, setCaptureTime] = useState("");       // human-readable display only
  const [captureTimeISO, setCaptureTimeISO] = useState(""); // real timestamp sent to backend
  const [ownerName, setOwnerName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [ownerLoading, setOwnerLoading] = useState(false);
  const [fineAmount, setFineAmount] = useState(""); // manual entry; auto-filled by AI if available

  const [violationData, setViolationData] = useState(null);
  const [loading, setLoading] = useState(false);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const uploadInputRef = useRef(null);

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      alert("Please select a valid image file.");
      return;
    }
    stopStream();
    setPhoto(file);
    setPreview(URL.createObjectURL(file));
    const now = new Date();
    setCaptureTime(now.toLocaleString());
    setCaptureTimeISO(now.toISOString());
    e.target.value = "";
  };

  // GPS on mount
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setLocation(`${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`),
        () => setLocation("Location unavailable")
      );
    }
  }, []);

  const stopStream = () => {
    if (streamRef) {
      streamRef.getTracks().forEach((t) => t.stop());
      setStreamRef(null);
    }
    setCameraActive(false);
  };

  const startCamera = async (mode) => {
    stopStream();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: mode || facingMode },
      });
      if (videoRef.current) videoRef.current.srcObject = stream;
      setStreamRef(stream);
      setCameraActive(true);
      setPreview(null);
    } catch (e) {
      alert("Camera access denied or not available");
    }
  };

  const switchCamera = () => {
    const newMode = facingMode === "environment" ? "user" : "environment";
    setFacingMode(newMode);
    startCamera(newMode);
  };

  const capturePhoto = () => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((blob) => {
      setPhoto(blob);
      setPreview(URL.createObjectURL(blob));
      const now = new Date();
      setCaptureTime(now.toLocaleString());
      setCaptureTimeISO(now.toISOString());
      stopStream();
    });
  };

  const retakePhoto = () => {
    setPhoto(null);
    setPreview(null);
    startCamera(facingMode);
  };

  // ── LOOKUP OWNER BY PLATE NUMBER ──────────────────────────────────────────
  const lookupOwner = async () => {
    if (!plateNo.trim()) {
      alert("Please enter a plate number first.");
      return;
    }
    setOwnerLoading(true);
    try {
      const data = await api.lookupOwnerByPlate(plateNo);
      setOwnerName(data.owner_name || "");
      setPhone(data.phone || "");
      setEmail(data.email || "");
      if (!data.owner_name && !data.phone && !data.email) {
        alert("No owner record found for this plate — fill details manually.");
      }
    } catch (e) {
      alert(`Owner lookup failed — ${e.message}. Fill manually.`);
    } finally {
      setOwnerLoading(false);
    }
  };

  // ── CHANGE 2: DETECT VIOLATION VIA OFFLINE PYTHON AI MODEL ───────────────
  // Sends the image + metadata directly to the officer's configured local AI endpoint.
  // Expected response: { violation_type, section_number, vehicle_no, fine_amount,
  //                      owner_name, phone, email }
  const detectViolation = async () => {
    if (!aiApiUrl.trim()) {
      alert("Please set your AI Model API URL in the config panel above.");
      return;
    }

    setLoading(true);
    const fd = new FormData();
    if (photo) fd.append("image", photo, "capture.jpg");
    fd.append("plate_no",   plateNo);
    fd.append("location",   location);
    fd.append("officer_id", officer?.id);

    try {
      // ── Direct call to the officer's local Python AI model ──
      const response = await fetch(aiApiUrl, {
        method: "POST",
        body: fd,
        // No Content-Type header — browser sets it with correct multipart boundary
      });

      if (!response.ok) {
        throw new Error(`AI model returned HTTP ${response.status}`);
      }

      const data = await response.json();

      setViolationData(data);

      // ── Auto-fill violation fields (officer can still edit manually) ──
      if (data.violation_type) setViolation(data.violation_type);
      if (data.section_number) setSectionNo(data.section_number);

      // ── Auto-fill plate number from AI OCR ──
      if (data.vehicle_no && data.vehicle_no.trim() !== "") {
        setPlateNo(data.vehicle_no.toUpperCase());
      }

      // ── Auto-fill fine amount ──
      if (data.fine_amount) {
        setViolationData(prev => ({ ...prev, fine_amount: data.fine_amount }));
        setFineAmount(String(data.fine_amount));
      }

      // ── Auto-fill owner details if returned ──
      if (data.owner_name) setOwnerName(data.owner_name);
      if (data.phone)      setPhone(data.phone);
      if (data.email)      setEmail(data.email);

      if (!data.violation_type || data.violation_type.trim() === "") {
        alert("✅ No violations detected in this image.");
      }

    } catch (e) {
      alert(`Detection failed — ${e.message}\n\nCheck that your Python AI model is running at:\n${aiApiUrl}`);
    } finally {
      setLoading(false);
    }
  };

  // ── SUBMIT CHALLAN ───────────────────────────────────────────────────────
  const submitChallan = async () => {
    if (!photo) {
      alert("❌ Please capture a photo of the violation before submitting the challan.");
      return;
    }
    if (!plateNo.trim()) {
      alert("❌ Please enter the vehicle plate number.");
      return;
    }
    if (!violation.trim()) {
      alert("❌ Please enter or AI-detect a violation type.");
      return;
    }
    if (!fineAmount || Number(fineAmount) <= 0) {
      alert("❌ Please enter a fine amount manually, or run AI Detect to auto-fill it.");
      return;
    }

    // location may be "lat, lng" (from GPS) or a free-text area name (manual edit)
    const [maybeLat, maybeLng] = location.split(",").map(s => s.trim());
    const isCoords = maybeLat && maybeLng && !isNaN(Number(maybeLat)) && !isNaN(Number(maybeLng));

    try {
      const fd = new FormData();
      fd.append("evidence_image",   photo, "evidence.jpg");
      fd.append("vehicle_number",   plateNo.trim().toUpperCase());
      fd.append("violation_type",   violation);
      fd.append("section_number",   sectionNo);
      fd.append("penalty_amount",   fineAmount);
      fd.append("violation_time",   captureTimeISO || new Date().toISOString());
      if (isCoords) {
        fd.append("latitude",  maybeLat);
        fd.append("longitude", maybeLng);
      } else {
        fd.append("address", location);
      }
      // owner fields are informational only — backend looks up the real
      // owner via vehicle_number, but we still send these in case the
      // officer corrected them manually during lookup.
      fd.append("vehicle_type", violationData?.vehicle_type || "");
      fd.append("owner_name", ownerName);
      fd.append("owner_phone", phone);
      fd.append("owner_email", email);

      const result = await apiFetchMultipart("/violations", fd);

      alert(`✅ Challan submitted — pending analyst review.\nChallan No: ${result.challan_number || "N/A"}`);
      resetForm();
    } catch (e) {
      alert(`Submit failed — ${e.message}`);
      console.error(e);
    }
  };

  const resetForm = () => {
    setPhoto(null);
    setPreview(null);
    setPlateNo("");
    setViolation("");
    setSectionNo("");
    setOwnerName("");
    setPhone("");
    setEmail("");
    setCaptureTime("");
    setCaptureTimeISO("");
    setFineAmount("");
    setViolationData(null);
    stopStream();
  };

  return (
    <div className="rto-wrapper">
      <div className="rto-container">

        {/* Top Banner */}
        <div className="rto-banner">
          <div className="banner-left">
            <span className="emblem">🇮🇳</span>
            <div>
              <h2>E-Challan — Indian Traffic Police</h2>
              <small>Officer: {officer?.name || "TP-5678"}</small>
            </div>
          </div>
          <div className="banner-right">
            {/* ── CHANGE 2: Toggle AI config panel ── */}
            <button
              className="btn-secondary"
              onClick={() => setShowAiConfig(v => !v)}
              title="Configure offline AI model endpoint"
            >
              🤖 AI Config
            </button>
            <button
              className="back-btn"
              onClick={async () => {
                try { await api.logout(); } finally { window.history.back(); }
              }}
            >
              Log Out
            </button>
          </div>
        </div>

        {/* ── CHANGE 2: AI Model Config Panel ── */}
        {showAiConfig && (
          <div className="rto-card ai-config-card">
            <div className="card-header">🤖 OFFLINE AI MODEL — API CONFIGURATION</div>
            <p className="ai-config-hint">
              Enter the URL of your locally running Python AI model. The app will POST
              the captured image directly to this endpoint when you click <strong>AI Detect</strong>.
            </p>
            <div className="field-group full-width">
              <label className="field-label">🔗 AI Model Endpoint URL</label>
              <div className="input-with-btn">
                <input
                  className="rto-input"
                  placeholder="e.g. https://drivelegal-backend-sdkv.onrender.com/detect"
                  value={aiApiUrl}
                  onChange={(e) => setAiApiUrl(e.target.value.trim())}
                />
                <button
                  className="btn-lookup"
                  onClick={async () => {
                    try {
                      const res = await fetch(aiApiUrl.replace(/\/detect.*$/, "/health"));
                      alert(res.ok ? "✅ Model is reachable!" : `⚠️ HTTP ${res.status}`);
                    } catch {
                      alert("❌ Could not reach the model. Check it's running and the URL is correct.");
                    }
                  }}
                >
                  🩺 Test
                </button>
              </div>
            </div>
            <p className="ai-config-hint" style={{ marginTop: 8 }}>
              <strong>Expected request:</strong> multipart/form-data with fields —{" "}
              <code>image</code>, <code>plate_no</code>, <code>location</code>, <code>officer_id</code>
              <br />
              <strong>Expected response JSON:</strong>{" "}
              <code>{`{ violation_type, section_number, vehicle_no, fine_amount, owner_name, phone, email }`}</code>
            </p>
          </div>
        )}

        {/* ── CAMERA SECTION ── */}
        <div className="rto-card">
          <div className="card-header">📷 CAPTURE EVIDENCE</div>

          <div className="camera-frame large">
            {preview ? (
              <img src={preview} alt="Captured" className="captured-img" />
            ) : (
              <video ref={videoRef} autoPlay playsInline className="video-feed" />
            )}
            {cameraActive && !preview && <span className="live-tag">● LIVE</span>}
            {preview && <span className="captured-tag">✔ CAPTURED</span>}
            {!cameraActive && !preview && (
              <div className="camera-placeholder">
                <span>📷</span>
                <p>Press "Start Camera" to begin</p>
              </div>
            )}
          </div>

          <input
            ref={uploadInputRef}
            type="file"
            accept="image/*"
            style={{ display: "none" }}
            onChange={handleImageUpload}
          />

          <div className="camera-actions">
            {!cameraActive && !preview && (
              <>
                <button className="btn-secondary" onClick={() => startCamera(facingMode)}>
                  📷 Start Camera
                </button>
                <button className="btn-secondary" onClick={() => uploadInputRef.current.click()}>
                  🖼️ Upload Image
                </button>
              </>
            )}
            {cameraActive && !preview && (
              <>
                <button className="btn-secondary" onClick={switchCamera}>
                  🔄 {facingMode === "environment" ? "Front" : "Back"} Cam
                </button>
                <button className="btn-primary" onClick={capturePhoto}>
                  📸 CLICK PHOTO
                </button>
                <button className="btn-secondary" onClick={() => uploadInputRef.current.click()}>
                  🖼️ Upload Image
                </button>
              </>
            )}
            {preview && (
              <>
                <button className="btn-secondary" onClick={retakePhoto}>🔄 Retake</button>
                <button className="btn-primary" onClick={detectViolation} disabled={loading}>
                  {loading ? "🔄 Analyzing..." : "🤖 AI DETECT"}
                </button>
              </>
            )}
          </div>
        </div>

        {/* ── DETAILS FORM ── */}
        <div className="rto-card">
          <div className="card-header">📋 VIOLATION & OWNER DETAILS</div>

          <div className="details-grid">

            {/* MANUAL: Plate Number */}
            <div className="field-group full-width">
              <label className="field-label">🚘 Plate Number <span className="manual-tag">MANUAL</span></label>
              <div className="input-with-btn">
                <input
                  className="rto-input"
                  placeholder="e.g. DL 35 AM 1234"
                  value={plateNo}
                  onChange={(e) => setPlateNo(e.target.value.toUpperCase())}
                />
                <button className="btn-lookup" onClick={lookupOwner} disabled={ownerLoading}>
                  {ownerLoading ? "⏳ ..." : "🔍 Lookup"}
                </button>
              </div>
            </div>

            {/* ── CHANGE 1: AI fields divider — now editable ── */}
            <div className="field-divider">
              <span>🤖 AI Filled — auto-filled after AI Detect, <strong>editable manually</strong></span>
            </div>

            {/* ── CHANGE 1: Violation — now editable ── */}
            <div className="field-group">
              <label className="field-label">
                ⚠️ Violation <span className="ai-tag">AI / MANUAL</span>
              </label>
              <input
                className="rto-input ai-filled"
                placeholder="e.g. Jumping Red Light — or fill manually"
                value={violation}
                onChange={(e) => setViolation(e.target.value)}
              />
            </div>

            {/* ── CHANGE 1: Section No — now editable ── */}
            <div className="field-group">
              <label className="field-label">
                📜 Section No. (MV Act) <span className="ai-tag">AI / MANUAL</span>
              </label>
              <input
                className="rto-input ai-filled"
                placeholder="e.g. Section 119 MV Act — or fill manually"
                value={sectionNo}
                onChange={(e) => setSectionNo(e.target.value)}
              />
            </div>

            {/* Location — auto-filled by GPS, read-only */}
            <div className="field-group">
              <label className="field-label">
                📍 Location <span className="ai-tag">GPS AUTO</span>
              </label>
              <input
                className="rto-input ai-filled"
                value={location}
                readOnly
                disabled
              />
            </div>

            {/* Date & Time — auto-filled at capture, read-only */}
            <div className="field-group">
              <label className="field-label">
                ⏰ Date &amp; Time <span className="ai-tag">AUTO</span>
              </label>
              <input
                className="rto-input ai-filled"
                value={captureTime || "Captured at submission time"}
                readOnly
                disabled
              />
            </div>

           

            {/* MANUAL/AI: Fine Amount */}
            <div className="field-group">
              <label className="field-label">
                💰 Fine Amount (₹) <span className="ai-tag">AI / MANUAL</span>
              </label>
              <input
                className="rto-input ai-filled"
                type="number"
                min="0"
                placeholder="e.g. 1000 — auto-fills after AI Detect"
                value={fineAmount}
                onChange={(e) => setFineAmount(e.target.value)}
              />
            </div>

          </div>

          {/* Fine display if AI detected */}
          {violationData?.fine_amount && (
            <div className="fine-banner">
              <span>💰 Fine Amount:</span>
              <strong>₹{violationData.fine_amount}</strong>
            </div>
          )}

          {/* Photo required warning */}
          {!photo && (
            <div className="photo-warning">
              ⚠️ Capture a photo above before submitting the challan.
            </div>
          )}

          <div className="action-row">
            <button
              className="btn-success"
              onClick={submitChallan}
              disabled={!photo}
              title={!photo ? "Capture a photo first" : "Submit challan"}
            >
              ✅ SUBMIT CHALLAN
            </button>
            <button className="btn-danger" onClick={resetForm}>❌ Reset</button>
          </div>
        </div>

        <canvas ref={canvasRef} style={{ display: "none" }} />
      </div>
    </div>
  );
}
