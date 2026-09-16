import { pool } from "../../config/db.js";

function cleanSceneObjects(value) {
  try {
    const objects = typeof value === "string" ? JSON.parse(value) : value;
    if (!Array.isArray(objects)) return [];
    return objects.slice(0, 10).map(item => ({ label: String(item?.class || item?.label || "unknown").slice(0, 80), confidence: Number(Number(item?.score || item?.confidence || 0).toFixed(3)) })).filter(item => item.label !== "unknown");
  } catch { return []; }
}

export async function createReport({ landId, farmerId, incidentBarangay, aiPlant, aiDamageType, aiConfidenceNotes, confirmedPlant, confirmedDamageType, farmerNotes, cameraSceneObjects, photos }) {
  const connection = await pool.getConnection();
  const sceneObjects = cleanSceneObjects(cameraSceneObjects);
  try {
    await connection.beginTransaction();
    const [result] = await connection.query("INSERT INTO damage_reports (land_id, farmer_id, incident_barangay, ai_detected_plant, ai_detected_damage_type, ai_confidence_notes, camera_scene_objects, confirmed_plant, confirmed_damage_type, farmer_notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", [landId, farmerId, incidentBarangay || null, aiPlant || null, aiDamageType || null, aiConfidenceNotes || null, sceneObjects.length ? JSON.stringify(sceneObjects) : null, confirmedPlant || null, confirmedDamageType || null, farmerNotes || null]);
    for (const photo of photos || []) {
      const [photoResult] = await connection.query("INSERT INTO report_photos (damage_report_id, file_url, latitude, longitude, captured_at) VALUES (?, ?, ?, ?, ?)", [result.insertId, photo.fileUrl, photo.latitude || null, photo.longitude || null, photo.capturedAt || null]);
      if (confirmedPlant && confirmedDamageType) await connection.query("INSERT INTO damage_training_samples (report_id, report_photo_id, crop_type, damage_type, scene_objects) VALUES (?, ?, ?, ?, ?)", [result.insertId, photoResult.insertId, confirmedPlant, confirmedDamageType, sceneObjects.length ? JSON.stringify(sceneObjects) : null]);
    }
    await connection.commit();
    const [rows] = await connection.query("SELECT * FROM damage_reports WHERE id = ?", [result.insertId]);
    return rows[0];
  } catch (error) { await connection.rollback(); throw error; } finally { connection.release(); }
}

export async function listReports({ farmerId, status, barangay, cropType, damageType, from, to } = {}) {
  const clauses = [], values = [], add = (sql, value) => { clauses.push(sql); values.push(value); };
  if (farmerId) add("dr.farmer_id = ?", farmerId); if (status) add("dr.status = ?", status); if (barangay) add("COALESCE(NULLIF(dr.incident_barangay, ''), l.barangay) = ?", barangay); if (cropType) add("JSON_CONTAINS(l.crop_types, JSON_QUOTE(?))", cropType); if (damageType) add("COALESCE(dr.confirmed_damage_type, dr.ai_detected_damage_type) = ?", damageType); if (from) add("dr.created_at >= ?", from); if (to) add("dr.created_at <= ?", to);
  const [reports] = await pool.query(`SELECT dr.*, l.name AS land_name, COALESCE(NULLIF(dr.incident_barangay, ''), l.barangay) AS barangay, l.latitude, l.longitude, l.crop_types, u.full_name AS farmer_name, u.contact_number FROM damage_reports dr JOIN lands l ON l.id = dr.land_id JOIN farmer_profiles fp ON fp.id = dr.farmer_id JOIN users u ON u.id = fp.user_id ${clauses.length ? `WHERE ${clauses.join(" AND ")}` : ""} ORDER BY dr.created_at DESC`, values);
  if (!reports.length) return [];
  const ids = reports.map(report => report.id);
  const [photos, samples] = await Promise.all([
    pool.query(`SELECT id, damage_report_id, file_url AS fileUrl, latitude, longitude, captured_at AS capturedAt FROM report_photos WHERE damage_report_id IN (${ids.map(() => "?").join(",")})`, ids).then(([rows]) => rows),
    pool.query(`SELECT id, report_id, report_photo_id, crop_type, damage_type, scene_objects, label_status FROM damage_training_samples WHERE report_id IN (${ids.map(() => "?").join(",")})`, ids).then(([rows]) => rows)
  ]);
  return reports.map(report => ({ ...report, crop_types: typeof report.crop_types === "string" ? JSON.parse(report.crop_types) : report.crop_types, camera_scene_objects: cleanSceneObjects(report.camera_scene_objects), photos: photos.filter(photo => String(photo.damage_report_id) === String(report.id)), trainingSamples: samples.filter(sample => String(sample.report_id) === String(report.id)).map(sample => ({ ...sample, scene_objects: cleanSceneObjects(sample.scene_objects) })) }));
}

export async function reviewReport(id, status, reviewerId, { confirmedPlant, confirmedDamageType, rejectionReason }) {
  const [result] = await pool.query("UPDATE damage_reports SET status = ?, reviewed_by = ?, reviewed_at = NOW(), confirmed_plant = COALESCE(?, confirmed_plant), confirmed_damage_type = COALESCE(?, confirmed_damage_type), rejection_reason = ? WHERE id = ?", [status, reviewerId, confirmedPlant || null, confirmedDamageType || null, rejectionReason || null, id]);
  if (!result.affectedRows) return null;
  await pool.query("UPDATE damage_training_samples SET label_status = ?, reviewed_by = ?, reviewed_at = NOW() WHERE report_id = ?", [status === "verified" ? "approved" : "rejected", reviewerId, id]);
  const [rows] = await pool.query("SELECT * FROM damage_reports WHERE id = ?", [id]);
  return rows[0];
}
