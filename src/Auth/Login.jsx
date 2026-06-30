// Login.jsx — Login, Register (User/Admin), Forgot Password
// Features: Real auth with localStorage, password eye toggle, no demo creds, back button
import React, { useState, useRef, useEffect } from "react";
import logo from "../a.png";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { useAuth } from "./AuthContext";

const EyeIcon = ({ open }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    {open ? (
      <>
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
        <circle cx="12" cy="12" r="3" />
      </>
    ) : (
      <>
        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
        <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
        <line x1="1" y1="1" x2="23" y2="23" />
      </>
    )}
  </svg>
);

const INDIAN_STATES = [
  "Andhra Pradesh","Arunachal Pradesh","Assam","Bihar","Chhattisgarh","Goa","Gujarat",
  "Haryana","Himachal Pradesh","Jharkhand","Karnataka","Kerala","Madhya Pradesh",
  "Maharashtra","Manipur","Meghalaya","Mizoram","Nagaland","Odisha","Punjab",
  "Rajasthan","Sikkim","Tamil Nadu","Telangana","Tripura","Uttar Pradesh","Uttarakhand",
  "West Bengal","Delhi","Jammu & Kashmir","Ladakh","Puducherry","Chandigarh"
];

// RTO cities by state
const RTO_CITIES_BY_STATE = {
  "Uttar Pradesh": [
    "Agra","Aligarh","Allahabad (Prayagraj)","Ambedkar Nagar","Amethi","Amroha",
    "Auraiya","Ayodhya","Azamgarh","Baghpat","Bahraich","Ballia","Balrampur",
    "Banda","Barabanki","Bareilly","Basti","Bhadohi","Bijnor","Budaun","Bulandshahr",
    "Chandauli","Chitrakoot","Deoria","Etah","Etawah","Faizabad","Farrukhabad",
    "Fatehpur","Firozabad","Gautam Buddha Nagar (Noida)","Ghaziabad","Ghazipur",
    "Gonda","Gorakhpur","Hamirpur","Hapur","Hardoi","Hathras","Jalaun","Jaunpur",
    "Jhansi","Kannauj","Kanpur Dehat","Kanpur Nagar","Kasganj","Kaushambi",
    "Kushinagar","Lakhimpur Kheri","Lalitpur","Lucknow","Maharajganj","Mahoba",
    "Mainpuri","Mathura","Mau","Meerut","Mirzapur","Moradabad","Muzaffarnagar",
    "Pilibhit","Pratapgarh","Raebareli","Rampur","Saharanpur","Sambhal","Sant Kabir Nagar",
    "Shahjahanpur","Shamli","Shravasti","Siddharthnagar","Sitapur","Sonbhadra",
    "Sultanpur","Unnao","Varanasi"
  ],
  "Maharashtra": [
    "Mumbai","Pune","Nagpur","Nashik","Aurangabad","Solapur","Amravati","Kolhapur",
    "Thane","Nanded","Satara","Raigad","Osmanabad","Latur","Jalgaon","Akola",
    "Buldhana","Yavatmal","Washim","Wardha","Chandrapur","Gadchiroli","Gondia",
    "Bhandara","Nandurbar","Dhule","Palghar","Ratnagiri","Sindhudurg","Hingoli"
  ],
  "Karnataka": [
    "Bengaluru","Mysuru","Hubli-Dharwad","Mangaluru","Belagavi","Kalaburagi","Ballari",
    "Vijayapura","Shivamogga","Tumakuru","Davanagere","Bidar","Hassan","Udupi",
    "Kodagu","Chikkamagaluru","Chitradurga","Raichur","Yadgir","Koppal","Gadag",
    "Bagalkot","Haveri","Dharwad","Ramanagara","Chikkaballapur","Mandya","Bengaluru Rural"
  ],
  "Tamil Nadu": [
    "Chennai","Coimbatore","Madurai","Tiruchirappalli","Salem","Tirunelveli","Vellore",
    "Erode","Thoothukudi","Dindigul","Thanjavur","Ranipet","Sivaganga","Virudhunagar",
    "Nagapattinam","Tiruppur","Kancheepuram","Krishnagiri","Dharmapuri","Namakkal",
    "Ariyalur","Perambalur","Cuddalore","Villupuram","Kallakurichi","Tiruvannamalai",
    "Nilgiris","Pudukkottai","Ramanathapuram","Tenkasi","Tirupattur","Chengalpattu"
  ],
  "Rajasthan": [
    "Jaipur","Jodhpur","Udaipur","Kota","Ajmer","Bikaner","Alwar","Sikar","Bhilwara",
    "Bharatpur","Barmer","Pali","Chittorgarh","Nagaur","Jhunjhunu","Tonk","Sawai Madhopur",
    "Sri Ganganagar","Hanumangarh","Dungarpur","Churu","Dausa","Dholpur","Baran",
    "Banswara","Bundi","Jaisalmer","Jalore","Karauli","Pratapgarh","Rajsamand","Sirohi","Washim"
  ],
  "Madhya Pradesh": [
    "Bhopal","Indore","Gwalior","Jabalpur","Ujjain","Sagar","Dewas","Satna","Ratlam",
    "Rewa","Murwara (Katni)","Singrauli","Burhanpur","Khandwa","Bhind","Chhindwara",
    "Guna","Shivpuri","Vidisha","Chhatarpur","Damoh","Mandsaur","Khargone",
    "Neemuch","Pithampur","Narmadapuram","Itarsi","Sehore","Seoni","Sidhi","Shajapur"
  ],
  "Gujarat": [
    "Ahmedabad","Surat","Vadodara","Rajkot","Bhavnagar","Jamnagar","Junagadh","Gandhinagar",
    "Anand","Mehsana","Bharuch","Morbi","Nadiad","Surendranagar","Valsad","Navsari",
    "Patan","Amreli","Banaskantha","Dahod","Kheda","Kutch","Porbandar","Sabarkantha",
    "Tapi","Narmada","Botad","Dang","Devbhoomi Dwarka","Gir Somnath"
  ],
  "West Bengal": [
    "Kolkata","Howrah","Durgapur","Asansol","Siliguri","Bardhaman","Malda","Baharampur",
    "Habra","Kharagpur","Shantipur","Darjeeling","Jalpaiguri","Murshidabad","Nadia",
    "North 24 Parganas","South 24 Parganas","Hooghly","Bankura","Birbhum","Purulia",
    "West Midnapore","East Midnapore","Cooch Behar","Alipurduar","Kalimpong"
  ],
  "Delhi": [
    "Central Delhi","East Delhi","New Delhi","North Delhi","North East Delhi",
    "North West Delhi","Shahdara","South Delhi","South East Delhi",
    "South West Delhi","West Delhi","Dwarka","Rohini"
  ],
  "Punjab": [
    "Amritsar","Ludhiana","Jalandhar","Patiala","Bathinda","Pathankot","Hoshiarpur",
    "Moga","Firozpur","Muktsar","Sangrur","Barnala","Fatehgarh Sahib","Fazilka",
    "Gurdaspur","Kapurthala","Mansa","Mohali (SAS Nagar)","Rupnagar","Tarn Taran"
  ],
  "Haryana": [
    "Gurugram","Faridabad","Panipat","Ambala","Yamunanagar","Rohtak","Hisar","Karnal",
    "Sonipat","Panchkula","Bhiwani","Sirsa","Bahadurgarh","Jind","Thanesar (Kurukshetra)",
    "Kaithal","Rewari","Jhajjar","Fatehabad","Palwal","Nuh","Mahendragarh","Charkhi Dadri"
  ],
  "Bihar": [
    "Patna","Gaya","Bhagalpur","Muzaffarpur","Purnia","Darbhanga","Arrah (Bhojpur)",
    "Begusarai","Katihar","Munger","Chhapra","Danapur","Bettiah","Saharsa","Sasaram",
    "Hajipur","Dehri","Siwan","Motihari","Nawada","Bagaha","Buxar","Kishanganj",
    "Sitamarhi","Jamalpur","Jehanabad","Aurangabad","Araria","Supaul","Gopalganj"
  ],
  "Andhra Pradesh": [
    "Visakhapatnam","Vijayawada","Guntur","Nellore","Kurnool","Rajahmundry","Kakinada",
    "Tirupati","Kadapa","Anantapur","Vizianagaram","Eluru","Ongole","Nandyal",
    "Machilipatnam","Adoni","Tenali","Chittoor","Hindupur","Proddatur"
  ],
  "Telangana": [
    "Hyderabad","Warangal","Nizamabad","Karimnagar","Khammam","Ramagundam",
    "Mahbubnagar","Nalgonda","Adilabad","Suryapet","Miryalaguda","Jangaon",
    "Siddipet","Mancherial","Jagtial","Nirmal","Sangareddy","Vikarabad","Wanaparthy"
  ],
  "Kerala": [
    "Thiruvananthapuram","Kochi","Kozhikode","Kollam","Thrissur","Alappuzha","Palakkad",
    "Malappuram","Kottayam","Kannur","Kasaragod","Idukki","Pathanamthitta","Wayanad"
  ],
  "Odisha": [
    "Bhubaneswar","Cuttack","Berhampur","Rourkela","Sambalpur","Puri","Balasore",
    "Bhadrak","Baripada","Jharsuguda","Koraput","Barbil","Jeypore","Kendrapara",
    "Phulbani","Angul","Dhenkanal","Keonjhar","Rayagada","Sundargarh"
  ],
  "Jharkhand": [
    "Ranchi","Jamshedpur","Dhanbad","Bokaro","Deoghar","Phusro","Hazaribagh",
    "Giridih","Ramgarh","Medininagar","Chirkunda","Chaibasa","Dumka","Gumla","Lohardaga"
  ],
  "Chhattisgarh": [
    "Raipur","Bhilai","Bilaspur","Korba","Durg","Rajnandgaon","Jagdalpur",
    "Raigarh","Ambikapur","Mahasamund","Dhamtari","Chirmiri","Champa"
  ],
  "Assam": [
    "Guwahati","Silchar","Dibrugarh","Jorhat","Nagaon","Tinsukia","Tezpur",
    "Bongaigaon","Dhubri","Diphu","North Lakhimpur","Karimganj","Sivasagar"
  ],
  "Himachal Pradesh": [
    "Shimla","Mandi","Solan","Dharamsala","Palampur","Baddi","Nahan","Kullu",
    "Hamirpur","Chamba","Una","Bilaspur","Keylong"
  ],
  "Uttarakhand": [
    "Dehradun","Haridwar","Roorkee","Haldwani","Rudrapur","Kashipur","Rishikesh",
    "Pithoragarh","Ramnagar","Manglaur","Mussoorie","Almora","Champawat","Bageshwar"
  ],
  "Goa": ["Panaji","Margao","Vasco da Gama","Mapusa","Ponda","Bicholim","Curchorem"],
  "Jammu & Kashmir": [
    "Jammu","Srinagar","Anantnag","Baramulla","Kathua","Sopore","Punch",
    "Udhampur","Rajouri","Doda","Kupwara","Pulwama","Budgam","Bandipora","Ganderbal"
  ],
  "Chandigarh": ["Chandigarh"],
  "Puducherry": ["Puducherry","Karaikal","Mahe","Yanam"],
  "Ladakh": ["Leh","Kargil"],
  "Sikkim": ["Gangtok","Namchi","Mangan","Gyalshing"],
  "Tripura": ["Agartala","Udaipur","Dharmanagar","Kailasahar","Belonia","Sabroom"],
  "Meghalaya": ["Shillong","Tura","Nongstoin","Williamnagar","Baghmara"],
  "Manipur": ["Imphal","Thoubal","Bishnupur","Churachandpur","Senapati"],
  "Nagaland": ["Kohima","Dimapur","Mokokchung","Wokha","Tuensang","Mon"],
  "Mizoram": ["Aizawl","Lunglei","Champhai","Serchhip","Kolasib"],
  "Arunachal Pradesh": ["Itanagar","Naharlagun","Pasighat","Tawang","Ziro","Along"],
};

// Password strength checker
function checkPasswordStrength(password) {
  const rules = {
    length:    { test: p => p.length >= 8,                label: "At least 8 characters" },
    uppercase: { test: p => /[A-Z]/.test(p),              label: "One uppercase letter (A-Z)" },
    lowercase: { test: p => /[a-z]/.test(p),              label: "One lowercase letter (a-z)" },
    digit:     { test: p => /\d/.test(p),                 label: "One number (0-9)" },
    special:   { test: p => /[!@#$%^&*(),.?":{}|<>_\-]/.test(p), label: "One special character (!@#$...)" },
  };
  const results = Object.entries(rules).map(([key, { test, label }]) => ({
    key, label, passed: test(password),
  }));
  const passed = results.filter(r => r.passed).length;
  let strength = "weak";
  if (passed === 5) strength = "strong";
  else if (passed >= 3) strength = "medium";
  return { results, passed, strength };
}

const DESIGNATIONS = ["RTO Officer","Analyst","RTO Chief"];

export default function Login() {
  const [tab, setTab] = useState("login");
  const [showPass, setShowPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [form, setForm] = useState({
    email: "", password: "",
    name: "", licenseplate: "", phone: "", vehicles: "1", state: "", city: "", photo: null,
    vehicleType: "", modelName: "",
    designation: "", adminPhoto: null,
    confirmPassword: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);
  const [registerDone, setRegisterDone] = useState(false);
 
  // City dropdown state
  const [cityOptions, setCityOptions] = useState([]);
  const [cityLoading, setCityLoading] = useState(false);
  const [cityError, setCityError] = useState("");
  // Password strength
  const [passStrength, setPassStrength] = useState(null);
  // Photo preview state
  const [photoPreview, setPhotoPreview] = useState(null);
  const [adminPhotoPreview, setAdminPhotoPreview] = useState(null);

  const { login, register, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const fromPath = location.state?.from || null;

  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem("smartroad-theme") || "light";
    return saved === "dark";
  });

  useEffect(() => {
    const saved = localStorage.getItem("smartroad-theme") || "light";
    document.documentElement.setAttribute("data-theme", saved);
    setIsDark(saved === "dark");
    const onThemeChange = () => {
      const current = localStorage.getItem("smartroad-theme") || "light";
      document.documentElement.setAttribute("data-theme", current);
      setIsDark(current === "dark");
    };
    window.addEventListener("smartroad-theme-change", onThemeChange);
    window.addEventListener("storage", onThemeChange);
    return () => {
      window.removeEventListener("smartroad-theme-change", onThemeChange);
      window.removeEventListener("storage", onThemeChange);
    };
  }, []);

  const photoRef = useRef();
  const adminPhotoRef = useRef();

  const roleRedirects = {
    user: "/services",
    rto_officer: "/admin/rto-officer",
    analyst: "/admin/analyst",
    rto_chief: "/admin/rto-chief",
  };

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  // ── State → RTO Cities dropdown (with try/catch) ──
  const handleStateChange = (selectedState) => {
    set("state", selectedState);
    set("city", "");
    setCityError("");
    setCityOptions([]);
    if (!selectedState) return;

    setCityLoading(true);
    try {
      const cities = RTO_CITIES_BY_STATE[selectedState];
      if (!cities || cities.length === 0) {
        throw new Error(`No RTO cities found for "${selectedState}"`);
      }
      setCityOptions([...cities].sort());
    } catch (err) {
      setCityError(err.message || "Could not load cities for selected state.");
      setCityOptions([]);
    } finally {
      setCityLoading(false);
    }
  };

  // ── Password strength on change ──
  const handlePasswordChange = (val) => {
    set("password", val);
    if (val.length > 0) {
      setPassStrength(checkPasswordStrength(val));
    } else {
      setPassStrength(null);
    }
  };

  const handlePhotoChange = (e, type) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      if (type === "user") { set("photo", file); setPhotoPreview(ev.target.result); }
      else { set("adminPhoto", file); setAdminPhotoPreview(ev.target.result); }
    };
    reader.readAsDataURL(file);
  };

// ── LOGIN ──
const handleLogin = async () => {
  setError("");
  if (!form.email || !form.password) {
    setError("Please fill in all fields.");
    return;
  }
  setLoading(true);
  try {
    const session = await login(form.email.trim().toLowerCase(), form.password);

    // Block admin roles from citizen portal
    if (["rto_officer", "analyst", "rto_chief"].includes(session.role)) {
      logout(); // undo the session we just wrote — wrong portal for this role
      setError("This is the Citizen portal. Please use the Admin login page instead.");
      setLoading(false);
      return;
    }

    navigate(fromPath || roleRedirects[session.role] || "/");

  } catch (e) {
    setError(e.message || "Invalid email or password.");
  }
  setLoading(false);
};

// ── REGISTER CITIZEN ──
const handleRegisterUser = async () => {
  setError("");
  // ✅ Fixed: was "FormData" (capital F) — must be "form"
  const { name, email, password, confirmPassword, phone, state, city, licenseplate, vehicles, vehicleType, modelName } = form;

  if (!name || !email || !password || !confirmPassword || !phone || !state || !city || !licenseplate) {
    setError("Please fill in all required fields.");
    return;
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    setError("Enter a valid email address.");
    return;
  }
  if (password !== confirmPassword) {
    setError("Passwords do not match.");
    return;
  }
  if (!/^\d{10}$/.test(phone)) {
    setError("Enter a valid 10-digit phone number.");
    return;
  }

  const strength = checkPasswordStrength(password);
  if (strength.strength === "weak") {
    setError("Password is too weak. It must have at least 8 characters, one uppercase, one lowercase, one number, and one special character.");
    return;
  }

  setLoading(true);
  try {
    await register({
      name,
      email: email.trim().toLowerCase(),
      password,
      phone,
      state,
      city,
      licenseplate,
      vehicles,
      vehicleType,
      modelName,
    });
    setRegisterDone(true);

  } catch (e) {
    setError(e.message || "Registration failed.");
  }
  setLoading(false);
};

// ── FORGOT PASSWORD ──
const handleForgot = async () => {
  setError("");
  if (!form.email) { setError("Please enter your email."); return; }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
    setError("Enter a valid email.");
    return;
  }
  setLoading(true);
  try {
    const res = await fetch("https://drivelegal-backend-sdkv.onrender.com/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: form.email.trim().toLowerCase() }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Failed to send reset link.");
    setForgotSent(true);
  } catch (e) {
    setError(e.message || "Something went wrong. Please try again.");
  }
  setLoading(false);
};

// ── SWITCH TAB ──
// Only 2 tabs now: "login" and "register"
const switchTab = (t) => {
  setTab(t);
  setError("");
  setRegisterDone(false);
  setForgotSent(false);
  setShowPass(false);
  setShowConfirmPass(false);
  setCityOptions([]);
  setCityError("");
  setPassStrength(null);
};

const S = getS(isDark);

const strengthColor = passStrength
  ? passStrength.strength === "strong" ? "#16a34a"
  : passStrength.strength === "medium" ? "#d97706"
  : "#dc2626"
  : "#ccc";
  return (
    <div style={S.page}>
      {/* LEFT PANEL */}
      <div style={S.leftPanel}>
        <div style={S.leftContent}>
          <div style={S.brand}><img src={logo} alt="Drive Legal" width={'200'} height={'200'} /></div>
          <h1 style={S.leftTitle}>India's Smart<br />Traffic Portal</h1>
          <p style={S.leftSub}>Manage challans, access traffic laws, and streamline RTO operations.</p>
          <div style={S.leftFeatures}>
            {["Role-based secure access", "Real-time challan updates", "AI-powered traffic assistant", "24/7 availability"].map((f, i) => (
              <div key={i} style={S.leftFeature}>✓ {f}</div>
            ))}
          </div>
          <div style={S.infoCallout}>
            <div style={S.infoCalloutIcon}>🔐</div>
            <div>
              <div style={S.infoCalloutTitle}>Secure Access</div>
              <div style={S.infoCalloutText}>Register with your real credentials. Officers & analysts are verified by RTO Chief.</div>
            </div>
          </div>
        </div>
        <div style={S.leftStats}>
          <div style={S.leftStat}><span style={S.leftStatNum}>50K+</span><span style={S.leftStatLabel}>Users</span></div>
          <div style={S.leftStat}><span style={S.leftStatNum}>12K+</span><span style={S.leftStatLabel}>Challans</span></div>
          <div style={S.leftStat}><span style={S.leftStatNum}>99%</span><span style={S.leftStatLabel}>Uptime</span></div>
        </div>
      </div>

      {/* RIGHT PANEL */}
      <div style={S.rightPanel}>
        <div style={S.formCard}>
          {/* BACK BUTTON */}
          <button onClick={() => navigate("/")} style={S.backBtn}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            Back
          </button>

          {/* TABS */}
          <div style={S.tabs}>
            <button onClick={() => switchTab("login")} style={{ ...S.tab, ...(tab === "login" ? S.tabActive : {}) }}>Login</button>
            <button onClick={() => switchTab("register")} style={{ ...S.tab, ...(tab === "register" ? S.tabActive : {}) }}>Register</button>
            <button onClick={() => switchTab("forgot")} style={{ ...S.tab, ...(tab === "forgot" ? S.tabActive : {}) }}>Forgot Password</button>
          </div>

          {error && <div style={S.errorBox}>⚠️ {error}</div>}

          {/* ── LOGIN ── */}
          {tab === "login" && (
            <div>
              <h2 style={S.formTitle}>Welcome Back</h2>
              <p style={S.formSub}>Sign in with your registered email & password</p>
              <Field S={S} label="Email Address">
                <input style={S.input} type="email" placeholder="you@email.com" value={form.email}
                  autoComplete="off"
                  onChange={e => set("email", e.target.value)} />
              </Field>
              <Field S={S} label="Password">
                <PasswordInput S={S} placeholder="Enter your password"
                  value={form.password}
                  onChange={e => set("password", e.target.value)}
                  show={showPass}
                  onToggle={() => setShowPass(v => !v)}
                  onKeyDown={e => e.key === "Enter" && handleLogin()}
                  autoComplete="new-password"
                />
              </Field>
              <div style={S.forgotRow}>
                <button onClick={() => switchTab("forgot")} style={S.forgotLink}>Forgot password?</button>
              </div>
              <button onClick={handleLogin} style={S.submitBtn} disabled={loading}>
                {loading ? "Signing in…" : "Sign In →"}
              </button>
              <p style={S.switchText}>No account? <button onClick={() => switchTab("register")} style={S.switchLink}>Register here</button></p>
            </div>
          )}

          {/* ── REGISTER (Citizen only) ── */}
          {tab === "register" && !registerDone && (
            <div>
              <h2 style={S.formTitle}>Create Account</h2>
              <p style={S.formSub}>Register as a citizen to manage your challans</p>
              <div style={S.twoCol}>
                <Field S={S} label="Full Name *"><input style={S.input} placeholder="Your full name" autoComplete="off" value={form.name} onChange={e => set("name", e.target.value)} /></Field>
                <Field S={S} label="Email Address *"><input style={S.input} type="email" placeholder="you@email.com" autoComplete="off" value={form.email} onChange={e => set("email", e.target.value)} /></Field>
              </div>
              <div style={S.twoCol}>
                <Field S={S} label="Phone Number *">
                  <input style={S.input} type="tel" placeholder="10-digit number" autoComplete="off" maxLength={10} value={form.phone} onChange={e => set("phone", e.target.value.replace(/\D/g, ""))} />
                </Field>
                <Field S={S} label="License Plate No. *"><input style={S.input} placeholder="e.g. DL01AB1234" autoComplete="off" value={form.licenseplate} onChange={e => set("licenseplate", e.target.value.toUpperCase())} /></Field>
              </div>
              <div style={S.twoCol}>
                <Field S={S} label="No. of Vehicles *">
                  <select style={S.input} value={form.vehicles} onChange={e => set("vehicles", e.target.value)}>
                    {[1,2,3,4,5,"5+"].map(v => <option key={v} value={v}>{v}</option>)}
                  </select>
                </Field>
                <Field S={S} label="State *">
                  <select style={S.input} value={form.state} onChange={e => handleStateChange(e.target.value)}>
                    <option value="">Select state</option>
                    {INDIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </Field>
              </div>
              <div style={S.twoCol}>
                <Field S={S} label="Vehicle Type">
                  <select style={S.input} value={form.vehicleType} onChange={e => set("vehicleType", e.target.value)}>
                    <option value="">Select type</option>
                    <option value="Bike">Bike</option>
                    <option value="Car">Car</option>
                    <option value="Scooter">Scooter</option>
                    <option value="Truck">Truck</option>
                    <option value="Bus">Bus</option>
                    <option value="Other">Other</option>
                  </select>
                </Field>
                <Field S={S} label="Vehicle Model">
                  <input style={S.input} placeholder="e.g. Activa, Creta" autoComplete="off" value={form.modelName} onChange={e => set("modelName", e.target.value)} />
                </Field>
              </div>

              {/* City dropdown — driven by selected state */}
              <Field S={S} label="City / RTO *">
                {cityLoading ? (
                  <div style={{ ...S.input, color: isDark ? "#94a3b8" : "#7a5a48" }}>Loading cities…</div>
                ) : cityError ? (
                  <div>
                    <input style={S.input} placeholder="Type your city" value={form.city} onChange={e => set("city", e.target.value)} />
                    <p style={{ fontSize: "11px", color: "#dc2626", marginTop: "4px" }}>⚠ {cityError}. Type manually.</p>
                  </div>
                ) : cityOptions.length > 0 ? (
                  <select style={S.input} value={form.city} onChange={e => set("city", e.target.value)}>
                    <option value="">Select RTO city</option>
                    {cityOptions.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                ) : (
                  <input style={S.input} placeholder={form.state ? "No cities found — type manually" : "Select a state first"} value={form.city} onChange={e => set("city", e.target.value)} disabled={!form.state && cityOptions.length === 0} />
                )}
              </Field>

              {/* Password with strength meter */}
              <div style={S.twoCol}>
                <Field S={S} label="Password *">
                  <PasswordInput S={S} placeholder="Min 8 chars + A-Z+0-9+!@#" value={form.password} onChange={e => handlePasswordChange(e.target.value)} show={showPass} onToggle={() => setShowPass(v => !v)} />
                  {passStrength && (
                    <div style={{ marginTop: "6px" }}>
                      <div style={{ display: "flex", gap: "3px", marginBottom: "4px" }}>
                        {[0,1,2,3,4].map(i => (
                          <div key={i} style={{ flex: 1, height: "4px", borderRadius: "2px", background: i < passStrength.passed ? strengthColor : isDark ? "#1e3a5f" : "#ddd", transition: "background 0.2s" }} />
                        ))}
                      </div>
                      <p style={{ fontSize: "11px", color: strengthColor, margin: 0, fontWeight: 600, textTransform: "capitalize" }}>
                        {passStrength.strength === "strong" ? "✓ Strong password" : passStrength.strength === "medium" ? "⚠ Medium — add more variety" : "✗ Weak — see requirements below"}
                      </p>
                      {passStrength.strength !== "strong" && (
                        <ul style={{ margin: "6px 0 0 0", padding: "0 0 0 14px", fontSize: "11px", color: isDark ? "#94a3b8" : "#7a5a48" }}>
                          {passStrength.results.filter(r => !r.passed).map(r => (
                            <li key={r.key} style={{ marginBottom: "2px" }}>✗ {r.label}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </Field>
                <Field S={S} label="Confirm Password *">
                  <PasswordInput S={S} placeholder="Repeat password" value={form.confirmPassword} onChange={e => set("confirmPassword", e.target.value)} show={showConfirmPass} onToggle={() => setShowConfirmPass(v => !v)} />
                  {form.confirmPassword && (
                    <p style={{ fontSize: "11px", marginTop: "5px", color: form.password === form.confirmPassword ? "#16a34a" : "#dc2626" }}>
                      {form.password === form.confirmPassword ? "✓ Passwords match" : "✗ Passwords do not match"}
                    </p>
                  )}
                </Field>
              </div>

              <Field S={S} label="Profile Photo (Optional)">
                <div style={S.photoUploadRow}>
                  <div style={S.photoThumb} onClick={() => photoRef.current.click()}>
                    {photoPreview ? <img src={photoPreview} alt="preview" style={S.photoImg} /> : <span style={S.photoPlaceholder}>📷<br /><small>Click to upload</small></span>}
                  </div>
                  <input ref={photoRef} type="file" accept="image/*" style={{ display: "none" }} onChange={e => handlePhotoChange(e, "user")} />
                  <div style={{ flex: 1 }}>
                    <button style={S.uploadBtn} onClick={() => photoRef.current.click()}>Choose Photo</button>
                    {photoPreview && <button style={S.removeBtn} onClick={() => { setPhotoPreview(null); set("photo", null); }}>Remove</button>}
                    <p style={S.photoHint}>JPG, PNG up to 5MB</p>
                  </div>
                </div>
              </Field>
              <div style={S.infoBox}>ℹ️ New registrations are citizens by default. Officer/Analyst roles are assigned by RTO Chief.</div>
              <button onClick={handleRegisterUser} style={S.submitBtn} disabled={loading}>
                {loading ? "Creating…" : "Create Account →"}
              </button>
              <p style={S.switchText}>Already registered? <button onClick={() => switchTab("login")} style={S.switchLink}>Login here</button></p>
            </div>
          )}

          {/* ── REGISTER SUCCESS ── */}
          {tab === "register" && registerDone && (
            <div style={S.successBox}>
              <div style={{ fontSize: "52px", marginBottom: "12px" }}>✅</div>
              <h3 style={S.successTitle}>Account Created!</h3>
              <p style={S.successDesc}>Your citizen account is ready. Login with your credentials now.</p>
              <button onClick={() => switchTab("login")} style={S.submitBtn}>Go to Login →</button>
            </div>
          )}

          {/* ── FORGOT PASSWORD ── */}
          {tab === "forgot" && !forgotSent && (
            <div>
              <h2 style={S.formTitle}>Reset Password</h2>
              <p style={S.formSub}>Enter your registered email to receive a reset link</p>
              <Field S={S} label="Email Address">
                <input style={S.input} type="email" placeholder="your@email.com" value={form.email} onChange={e => set("email", e.target.value)} />
              </Field>
              <button onClick={handleForgot} style={S.submitBtn} disabled={loading}>
                {loading ? "Sending…" : "Send Reset Link →"}
              </button>
              <p style={S.switchText}><button onClick={() => switchTab("login")} style={S.switchLink}>← Back to Login</button></p>
            </div>
          )}

          {tab === "forgot" && forgotSent && (
            <div style={S.successBox}>
              <div style={{ fontSize: "52px", marginBottom: "12px" }}>📧</div>
              <h3 style={S.successTitle}>Reset Link Sent!</h3>
              <p style={S.successDesc}>Check your email inbox for the password reset link.</p>
              <button onClick={() => switchTab("login")} style={S.submitBtn}>Back to Login →</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Sub-components ── */
function Field({ label, children, S }) {
  return (
    <div style={{ marginBottom: "14px" }}>
      <label style={S.label}>{label}</label>
      {children}
    </div>
  );
}

function PasswordInput({ value, onChange, placeholder, show, onToggle, onKeyDown, autoComplete, S }) {
  return (
    <div style={S.passWrap}>
      <input
        style={{ ...S.input, paddingRight: "44px" }}
        type={show ? "text" : "password"}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        onKeyDown={onKeyDown}
        autoComplete={autoComplete || "new-password"}
      />
      <button type="button" onClick={onToggle} style={S.eyeBtn} title={show ? "Hide password" : "Show password"}>
        <EyeIcon open={show} />
      </button>
    </div>
  );
}

/* ── Styles ── */
function getS(d) {
  return {
    page:             { display: "flex", minHeight: "100vh", fontFamily: "'Segoe UI', sans-serif", background: d ? "#0a1929" : "#F5F0E8", transition: "background 0.3s" },
    leftPanel:        { flex: "0 0 420px", background: d ? "linear-gradient(160deg, #0d2137 0%, #020d18 100%)" : "linear-gradient(160deg, #2C1A10 0%, #1a0e08 100%)", padding: "40px 48px", display: "flex", flexDirection: "column", justifyContent: "space-between", color: d ? "#fff" : "#ffffff" },
    backLink:         { color: d ? "#93c5fd" : "#F5F0E8", textDecoration: "none", fontSize: "14px", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: "4px" },
    leftContent:      { flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" },
    brand:            { fontSize: "22px", fontWeight: 800, marginBottom: "28px" },
    leftTitle:        { fontSize: "40px", fontWeight: 900, lineHeight: 1.15, marginBottom: "16px", letterSpacing: "-1.5px", color: d ? "#fff" : "#ffffff" },
    leftSub:          { fontSize: "15px", color: d ? "#bfdbfe" : "rgba(255,255,255,0.80)", lineHeight: 1.7, marginBottom: "20px" },
    leftFeatures:     { display: "flex", flexDirection: "column", gap: "8px", marginBottom: "24px" },
    leftFeature:      { color: d ? "#bfdbfe" : "rgba(255,255,255,0.85)", fontSize: "14px" },
    infoCallout:      { background: d ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.15)", borderRadius: "12px", padding: "14px 16px", border: d ? "1px solid rgba(255,255,255,0.15)" : "1px solid rgba(255,255,255,0.30)", display: "flex", gap: "12px", alignItems: "flex-start" },
    infoCalloutIcon:  { fontSize: "24px", lineHeight: 1 },
    infoCalloutTitle: { fontWeight: 700, fontSize: "14px", marginBottom: "4px", color: d ? "#fff" : "#ffffff" },
    infoCalloutText:  { fontSize: "13px", color: d ? "#bfdbfe" : "rgba(255,255,255,0.80)", lineHeight: 1.5 },
    leftStats:        { display: "flex", gap: "36px", paddingTop: "24px", borderTop: d ? "1px solid rgba(255,255,255,0.15)" : "1px solid rgba(255,255,255,0.30)" },
    leftStat:         { display: "flex", flexDirection: "column" },
    leftStatNum:      { fontSize: "26px", fontWeight: 900, color: d ? "#fff" : "#ffffff" },
    leftStatLabel:    { fontSize: "12px", color: d ? "#93c5fd" : "#F5F0E8" },
    rightPanel:       { flex: 1, background: d ? "#0f1f2e" : "#F5F0E8", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "40px 48px", overflowY: "auto", transition: "background 0.3s" },
    formCard:         { background: d ? "#112233" : "#EDE8DF", borderRadius: "24px", padding: "40px", boxShadow: d ? "0 8px 40px rgba(0,0,0,0.4)" : "0 8px 40px rgba(44,26,16,0.18)", width: "100%", maxWidth: "560px", transition: "background 0.3s", border: d ? "none" : "1px solid rgba(44,26,16,0.20)" },
    tabs:             { display: "flex", gap: "4px", background: d ? "#0a1929" : "rgba(44,26,16,0.12)", borderRadius: "10px", padding: "4px", marginBottom: "24px" },
    tab:              { flex: 1, padding: "8px 4px", border: "none", borderRadius: "8px", fontSize: "13px", fontWeight: 600, cursor: "pointer", background: "transparent", color: d ? "#94a3b8" : "#7a5a48", whiteSpace: "nowrap" },
    tabActive:        { background: d ? "#1e3a5f" : "#F5F0E8", color: d ? "#93c5fd" : "#2C1A10", boxShadow: d ? "0 2px 8px rgba(0,0,0,0.3)" : "0 2px 8px rgba(44,26,16,0.20)" },
    typeToggle:       { display: "flex", gap: "8px", marginBottom: "20px" },
    typeBtn:          { flex: 1, padding: "10px", border: d ? "2px solid #1e3a5f" : "2px solid rgba(44,26,16,0.25)", borderRadius: "10px", fontSize: "14px", fontWeight: 600, cursor: "pointer", background: d ? "#0f1f2e" : "rgba(44,26,16,0.06)", color: d ? "#94a3b8" : "#7a5a48" },
    typeBtnActive:    { borderColor: "#2C1A10", background: d ? "#0d2137" : "rgba(44,26,16,0.12)", color: d ? "#93c5fd" : "#2C1A10" },
    formTitle:        { fontSize: "22px", fontWeight: 800, color: d ? "#f1f5f9" : "#100806", marginBottom: "4px" },
    formSub:          { fontSize: "13px", color: d ? "#94a3b8" : "#7a5a48", marginBottom: "20px" },
    twoCol:           { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" },
    label:            { display: "block", fontSize: "12px", fontWeight: 700, color: d ? "#94a3b8" : "#2C1A10", marginBottom: "5px", textTransform: "uppercase", letterSpacing: "0.4px" },
    input:            { width: "100%", padding: "11px 13px", border: d ? "1.5px solid #1e3a5f" : "1.5px solid rgba(44,26,16,0.30)", borderRadius: "9px", fontSize: "14px", color: d ? "#e2e8f0" : "#1a0e08", background: d ? "#0a1929" : "rgba(255,255,255,0.50)", outline: "none", boxSizing: "border-box", fontFamily: "inherit" },
    passWrap:         { position: "relative" },
    eyeBtn:           { position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: d ? "#94a3b8" : "#7a5a48", padding: "2px", display: "flex", alignItems: "center" },
    forgotRow:        { textAlign: "right", marginBottom: "14px", marginTop: "-6px" },
    forgotLink:       { background: "none", border: "none", color: d ? "#93c5fd" : "#2C1A10", fontSize: "13px", fontWeight: 600, cursor: "pointer" },
    submitBtn:        { width: "100%", background: d ? "#1d4ed8" : "#2C1A10", color: "#fff", border: "none", padding: "13px", borderRadius: "10px", fontSize: "15px", fontWeight: 700, cursor: "pointer", marginBottom: "14px", marginTop: "4px" },
    errorBox:         { background: d ? "#2d0a0a" : "rgba(220,38,38,0.10)", border: d ? "1px solid #7f1d1d" : "1px solid rgba(220,38,38,0.35)", color: d ? "#fca5a5" : "#dc2626", padding: "10px 14px", borderRadius: "9px", fontSize: "13px", marginBottom: "14px" },
    infoBox:          { background: d ? "#0d2137" : "rgba(44,26,16,0.08)", border: d ? "1px solid #1e3a5f" : "1px solid rgba(44,26,16,0.25)", color: d ? "#93c5fd" : "#2C1A10", padding: "10px 14px", borderRadius: "9px", fontSize: "12px", marginBottom: "14px" },
    successBox:       { textAlign: "center", padding: "24px 0" },
    successTitle:     { fontSize: "22px", fontWeight: 800, color: d ? "#f1f5f9" : "#100806", marginBottom: "8px" },
    successDesc:      { fontSize: "14px", color: d ? "#94a3b8" : "#7a5a48", marginBottom: "24px", lineHeight: 1.6 },
    switchText:       { fontSize: "13px", color: d ? "#94a3b8" : "#7a5a48", textAlign: "center", margin: 0 },
    switchLink:       { background: "none", border: "none", color: d ? "#93c5fd" : "#2C1A10", fontWeight: 600, cursor: "pointer", fontSize: "13px" },
    backBtn:          { display: "inline-flex", alignItems: "center", gap: "5px", padding: "6px 12px", background: d ? "#0f1f2e" : "rgba(44,26,16,0.10)", border: d ? "1.5px solid #1e3a5f" : "1.5px solid rgba(44,26,16,0.30)", borderRadius: "8px", color: d ? "#94a3b8" : "#2C1A10", fontSize: "13px", fontWeight: 600, cursor: "pointer", marginBottom: "20px" },
    photoUploadRow:   { display: "flex", gap: "14px", alignItems: "flex-start" },
    photoThumb:       { width: "70px", height: "70px", borderRadius: "10px", border: d ? "2px dashed #1e3a5f" : "2px dashed rgba(44,26,16,0.32)", background: d ? "#0a1929" : "rgba(44,26,16,0.06)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", overflow: "hidden", flexShrink: 0 },
    photoThumbRequired:{ borderColor: "#f87171" },
    photoImg:         { width: "100%", height: "100%", objectFit: "cover" },
    photoPlaceholder: { textAlign: "center", color: d ? "#4a6080" : "#7a5a48", fontSize: "11px", lineHeight: 1.4 },
    uploadBtn:        { background: d ? "#0d2137" : "rgba(44,26,16,0.10)", border: d ? "1.5px solid #1e3a5f" : "1.5px solid rgba(44,26,16,0.30)", color: d ? "#93c5fd" : "#2C1A10", padding: "7px 14px", borderRadius: "7px", fontSize: "13px", fontWeight: 600, cursor: "pointer", marginRight: "8px" },
    removeBtn:        { background: d ? "#2d0a0a" : "rgba(220,38,38,0.10)", border: d ? "1.5px solid #7f1d1d" : "1.5px solid rgba(220,38,38,0.30)", color: d ? "#fca5a5" : "#dc2626", padding: "7px 14px", borderRadius: "7px", fontSize: "13px", fontWeight: 600, cursor: "pointer" },
    photoHint:        { fontSize: "11px", color: d ? "#4a6080" : "#7a5a48", marginTop: "6px" },
  };
}
