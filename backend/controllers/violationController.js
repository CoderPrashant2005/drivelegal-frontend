const pool = require("../config/db");

// PostgreSQL dashboard config
const PG_DASHBOARD_URL = "http://localhost:8000/api/v1/violations/trigger";
const PG_API_KEY = "DriveLegal_Project";

const UNCLAIMED_OWNER_EMAIL = "unclaimed@system.internal";

// ── Normalize a license plate for storage/comparison ────────────────────────
// Strips ALL whitespace (not just leading/trailing) and uppercases, so
// "GJ 01 AB 1234" and "GJ01AB1234" are treated as the SAME plate instead of
// creating duplicate vehicle rows. Use this everywhere a plate is read from
// a request and either inserted or compared against the DB.
function normalizePlate(raw) {
  if (!raw) return null;
  return raw.trim().toUpperCase().replace(/\s+/g, "");
}

async function getOrCreateUnclaimedOwner() {
  const [existing] = await pool.query(
    "SELECT user_id FROM users WHERE email = ?",
    [UNCLAIMED_OWNER_EMAIL]
  );
  if (existing.length) return existing[0].user_id;
  const [created] = await pool.query(
    `INSERT INTO users (full_name, email, password_hash) VALUES (?, ?, ?)`,
    ["Unclaimed Vehicle (System)", UNCLAIMED_OWNER_EMAIL, "UNUSABLE_NO_LOGIN"]
  );
  return created.insertId;
}

// ── Reverse-geocode lat/lng → city, state using OpenStreetMap Nominatim ─────
async function reverseGeocode(lat, lng) {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`;
    const res = await fetch(url, {
      headers: { "User-Agent": "DriveLegal-App/1.0" }
    });
    if (!res.ok) return { address: null, city: null, state: null };
    const data = await res.json();
    const a = data.address || {};
    return {
      address: data.display_name || null,
      city:    a.city || a.town || a.village || a.suburb || null,
      state:   a.state || null,
    };
  } catch {
    return { address: null, city: null, state: null };
  }
}

// ── Auto-claim unclaimed vehicles for a user based on their license_plate ───
// Three cases, in order:
//   1. A vehicle row already exists for this plate, owned by the system
//      "Unclaimed" placeholder -> reassign it to the real user (claim).
//   2. No vehicle row exists for this plate at all -> create one owned by
//      the real user, so any future challans on this plate attach to them
//      immediately instead of falling back to "unclaimed".
//   3. A vehicle row already exists for this plate owned by a DIFFERENT
//      real user -> do nothing (don't silently steal a vehicle that's
//      already claimed by someone else). Caller can inspect the return
//      value to surface this as a conflict if needed.
async function claimVehiclesForUser(userId, licensePlate, vehicleType, modelName) {
  if (!licensePlate) return { action: "skipped", reason: "no_plate" };
  const plate = normalizePlate(licensePlate);

  const [unclaimed] = await pool.query(
    "SELECT user_id FROM users WHERE email = ?",
    [UNCLAIMED_OWNER_EMAIL]
  );
  const unclaimedId = unclaimed.length ? unclaimed[0].user_id : null;

  // Case 1: try to claim an existing unclaimed row for this plate
  if (unclaimedId) {
    const [updateResult] = await pool.query(
      `UPDATE vehicles
         SET user_id = ?,
             vehicle_type = COALESCE(vehicle_type, ?),
             model_name   = COALESCE(model_name, ?)
       WHERE vehicle_number = ? AND user_id = ?`,
      [userId, vehicleType || null, modelName || null, plate, unclaimedId]
    );
    if (updateResult.affectedRows > 0) {
      return { action: "claimed", plate, vehicles_updated: updateResult.affectedRows };
    }
  }

  // Case 2 / 3: no unclaimed row matched — check whether the plate exists at all
  const [existing] = await pool.query(
    "SELECT vehicle_id, user_id FROM vehicles WHERE vehicle_number = ?",
    [plate]
  );

  if (!existing.length) {
    // Brand new plate — create it now, owned by the real user
    const [created] = await pool.query(
      "INSERT INTO vehicles (user_id, vehicle_number, vehicle_type, model_name) VALUES (?, ?, ?, ?)",
      [userId, plate, vehicleType || null, modelName || null]
    );
    return { action: "created", plate, vehicle_id: created.insertId };
  }

  if (existing[0].user_id === userId) {
    // Already owned by this user — still fill in type/model if missing,
    // in case they're updating their profile with info they skipped before
    if (vehicleType || modelName) {
      await pool.query(
        `UPDATE vehicles
           SET vehicle_type = COALESCE(vehicle_type, ?),
               model_name   = COALESCE(model_name, ?)
         WHERE vehicle_id = ?`,
        [vehicleType || null, modelName || null, existing[0].vehicle_id]
      );
    }
    return { action: "already_owned", plate };
  }

  // Plate is already registered to a different real user — leave it alone
  return { action: "conflict", plate, owned_by_user_id: existing[0].user_id };
}

async function syncToPostgresDashboard(violation) {
  try {
    await fetch(PG_DASHBOARD_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-API-KEY": PG_API_KEY },
      body: JSON.stringify({
        vehicle_id: violation.vehicle_number,
        type:       violation.violation_type,
        sec:        violation.section_number || "",
        loc:        violation.address || violation.city || "Unknown",
        lat:        parseFloat(violation.latitude) || 0,
        lon:        parseFloat(violation.longitude) || 0,
        amt:        parseFloat(violation.penalty_amount) || 0,
      }),
    });
  } catch (e) {
    console.error("[PG Sync Failed]", e.message);
  }
}

// ── RTO Officer: Submit violation ────────────────────────────────────────────
exports.submitViolation = async (req, res, next) => {
  try {
    const officer_id = req.user.id;
    const {
      vehicle_number, violation_type, section_number,
      penalty_amount, latitude, longitude, address, city, state,
      evidence_image, violation_time, vehicle_type,
    } = req.body;

    if (!vehicle_number || !violation_type || !penalty_amount)
      return res.status(400).json({ success: false, message: "vehicle_number, violation_type, penalty_amount required" });

    const lat = latitude  ? parseFloat(latitude)  : null;
    const lng = longitude ? parseFloat(longitude) : null;

    // Reverse-geocode if we have coords but no city/state
    let resolvedAddress = address || null;
    let resolvedCity    = city    || null;
    let resolvedState   = state   || null;

    if (lat && lng && (!resolvedCity || !resolvedState)) {
      const geo = await reverseGeocode(lat, lng);
      resolvedAddress = resolvedAddress || geo.address;
      resolvedCity    = resolvedCity    || geo.city;
      resolvedState   = resolvedState   || geo.state;
    }

    // 1. Insert location
    const [locResult] = await pool.query(
      `INSERT INTO locations (latitude, longitude, address, city, state) VALUES (?, ?, ?, ?, ?)`,
      [lat, lng, resolvedAddress, resolvedCity, resolvedState]
    );

    // 2. Find or create vehicle
    const plate = normalizePlate(vehicle_number);
    let [vehicles] = await pool.query(
      "SELECT vehicle_id FROM vehicles WHERE vehicle_number = ?",
      [plate]
    );

    let vehicleId;
    if (vehicles.length) {
      vehicleId = vehicles[0].vehicle_id;
      if (vehicle_type) {
        await pool.query(
          "UPDATE vehicles SET vehicle_type = COALESCE(vehicle_type, ?) WHERE vehicle_id = ?",
          [vehicle_type, vehicleId]
        );
      }
    } else {
      const unclaimedOwnerId = await getOrCreateUnclaimedOwner();
      const [created] = await pool.query(
        `INSERT INTO vehicles (user_id, vehicle_number, vehicle_type) VALUES (?, ?, ?)`,
        [unclaimedOwnerId, plate, vehicle_type || null]
      );
      vehicleId = created.insertId;
    }

    // 3. Challan number
    const challan_number = `CH-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    // 4. Insert violation
    const [result] = await pool.query(
      `INSERT INTO violations
         (vehicle_id, location_id, issued_by_admin, challan_number, section_number,
          violation_type, violation_time, evidence_image, penalty_amount, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING')`,
      [
        vehicleId, locResult.insertId, officer_id,
        challan_number, section_number || null, violation_type,
        violation_time ? new Date(violation_time) : new Date(),
        evidence_image || null, penalty_amount,
      ]
    );

    res.status(201).json({
      success: true,
      message: "Violation submitted — pending analyst review",
      violation_id: result.insertId,
      challan_number,
    });
  } catch (err) { next(err); }
};

// ── RTO Officer: My submitted violations ────────────────────────────────────
exports.getMyViolations = async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT v.violation_id, v.challan_number, v.violation_type, v.section_number,
              v.penalty_amount, v.status, v.violation_time, v.evidence_image,
              vh.vehicle_number, vh.vehicle_type,
              l.address, l.city, l.state, l.latitude, l.longitude
       FROM violations v
       JOIN vehicles vh ON v.vehicle_id = vh.vehicle_id
       LEFT JOIN locations l ON v.location_id = l.location_id
       WHERE v.issued_by_admin = ?
       ORDER BY v.violation_time DESC`,
      [req.user.id]
    );
    res.json({ success: true, violations: rows });
  } catch (err) { next(err); }
};

// ── Analyst: Get all pending violations ─────────────────────────────────────
exports.getPendingViolations = async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT v.violation_id, v.challan_number, v.violation_type, v.section_number,
              v.penalty_amount, v.status, v.violation_time, v.evidence_image,
              vh.vehicle_number, vh.vehicle_type, vh.registration_state,
              l.address, l.city, l.state, l.latitude, l.longitude,
              a.full_name    AS officer_name,
              u.full_name    AS owner_name,
              u.email        AS owner_email,
              u.phone_number AS owner_phone,
              u.state        AS owner_state,
              u.city         AS owner_city
       FROM violations v
       JOIN vehicles vh ON v.vehicle_id = vh.vehicle_id
       JOIN users u ON vh.user_id = u.user_id
       LEFT JOIN locations l ON v.location_id = l.location_id
       LEFT JOIN admins a ON v.issued_by_admin = a.admin_id
       WHERE v.status = 'PENDING'
       ORDER BY v.violation_time DESC`
    );

    // Both claimed and unclaimed challans come back in the same shape here,
    // but for unclaimed ones u.* is the internal placeholder row — strip
    // that out so the table never shows "Unclaimed Vehicle (System)" /
    // unclaimed@system.internal as if it were a real owner.
    const violations = rows.map((row) => {
      const isUnclaimed = row.owner_email === UNCLAIMED_OWNER_EMAIL;
      return {
        ...row,
        is_registered: isUnclaimed ? 0 : 1,
        owner_name:  isUnclaimed ? null : row.owner_name,
        owner_email: isUnclaimed ? null : row.owner_email,
        owner_phone: isUnclaimed ? null : row.owner_phone,
        owner_state: isUnclaimed ? null : row.owner_state,
        owner_city:  isUnclaimed ? null : row.owner_city,
      };
    });

    res.json({ success: true, violations });
  } catch (err) { next(err); }
};

// ── Analyst: Approve ─────────────────────────────────────────────────────────
exports.approveViolation = async (req, res, next) => {
  try {
    const { id } = req.params;
    const [rows] = await pool.query(
      `SELECT v.*, vh.vehicle_number, vh.vehicle_type, vh.registration_state,
              l.address, l.city, l.state, l.latitude, l.longitude
       FROM violations v
       JOIN vehicles vh ON v.vehicle_id = vh.vehicle_id
       LEFT JOIN locations l ON v.location_id = l.location_id
       WHERE v.violation_id = ? AND v.status = 'PENDING'`,
      [id]
    );
    if (!rows.length)
      return res.status(404).json({ success: false, message: "Violation not found or already processed" });
    await pool.query("UPDATE violations SET status = 'APPROVED' WHERE violation_id = ?", [id]);
    syncToPostgresDashboard(rows[0]);
    res.json({ success: true, message: "Approved — challan visible to user and synced to dashboard" });
  } catch (err) { next(err); }
};

// ── Analyst: Reject ──────────────────────────────────────────────────────────
exports.rejectViolation = async (req, res, next) => {
  try {
    const { id } = req.params;
    const [result] = await pool.query(
      "UPDATE violations SET status = 'REJECTED' WHERE violation_id = ? AND status = 'PENDING'",
      [id]
    );
    if (!result.affectedRows)
      return res.status(404).json({ success: false, message: "Violation not found or already processed" });
    res.json({ success: true, message: "Violation rejected" });
  } catch (err) { next(err); }
};

// ── User: My challans ────────────────────────────────────────────────────────
exports.getMyChallans = async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT v.violation_id, v.challan_number, v.violation_type, v.section_number,
              v.penalty_amount, v.status, v.violation_time, v.evidence_image,
              vh.vehicle_number, vh.vehicle_type, vh.registration_state,
              l.address, l.city, l.state, l.latitude, l.longitude
       FROM violations v
       JOIN vehicles vh ON v.vehicle_id = vh.vehicle_id
       LEFT JOIN locations l ON v.location_id = l.location_id
       WHERE vh.user_id = ? AND v.status = 'APPROVED'
       ORDER BY v.violation_time DESC`,
      [req.user.id]
    );
    res.json({ success: true, challans: rows });
  } catch (err) { next(err); }
};

// ── Vehicle lookup by plate ──────────────────────────────────────────────────
exports.vehicleLookup = async (req, res, next) => {
  try {
    const plate = normalizePlate(req.query.plate);
    if (!plate) return res.status(400).json({ success: false, message: "plate param required" });
    const [rows] = await pool.query(
      `SELECT u.full_name AS owner_name, u.phone_number AS phone, u.email,
              u.state AS owner_state, u.city AS owner_city,
              vh.vehicle_number, vh.vehicle_type, vh.registration_state
       FROM vehicles vh
       JOIN users u ON vh.user_id = u.user_id
       WHERE vh.vehicle_number = ?`,
      [plate]
    );
    if (!rows.length)
      return res.json({ success: true, found: false, owner_name: "", phone: "", email: "" });
    if (rows[0].email === UNCLAIMED_OWNER_EMAIL) {
      return res.json({
        success: true, found: true, unclaimed: true,
        owner_name: "", phone: "", email: "",
        owner_state: "", owner_city: "",
        vehicle_number: rows[0].vehicle_number,
        vehicle_type: rows[0].vehicle_type,
        registration_state: rows[0].registration_state,
      });
    }
    res.json({ success: true, found: true, unclaimed: false, ...rows[0] });
  } catch (err) { next(err); }
};

// ── Exported helper: call this from your auth/profile/vehicle controllers ────
// whenever a user sets or updates their license_plate field.
exports.claimVehiclesForUser = claimVehiclesForUser;