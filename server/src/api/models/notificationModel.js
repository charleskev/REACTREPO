import { pool } from "../../config/db.js";
export async function createNotification({ farmerId, createdBy, reportId, message, type }) { const [result] = await pool.query("INSERT INTO notifications (farmer_id, created_by, report_id, message, type) VALUES (?, ?, ?, ?, ?)", [farmerId, createdBy, reportId || null, message, type]); const [rows] = await pool.query("SELECT * FROM notifications WHERE id = ?", [result.insertId]); return rows[0]; }
export async function createNotifications({ farmerIds, createdBy, message, type }) {
  if (!farmerIds.length) return 0;
  const values = farmerIds.map(id => [id, createdBy, message, type]);
  const [result] = await pool.query("INSERT INTO notifications (farmer_id, created_by, message, type) VALUES ?", [values]);
  return result.affectedRows;
}
export async function listNotifications(farmerId) { const [rows] = await pool.query("SELECT * FROM notifications WHERE farmer_id = ? ORDER BY created_at DESC", [farmerId]); return rows; }
export async function markRead(id, farmerId) { await pool.query("UPDATE notifications SET read_at = NOW() WHERE id = ? AND farmer_id = ?", [id, farmerId]); const [rows] = await pool.query("SELECT * FROM notifications WHERE id = ? AND farmer_id = ?", [id, farmerId]); return rows[0] || null; }
