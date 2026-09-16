import { pool } from "../../config/db.js";
import { listReports } from "../models/reportModel.js";

export async function overview(req, res, next) {
  try {
    const [[summaryRows], reports] = await Promise.all([
      pool.query("SELECT SUM(status = 'pending') AS pending_reports, SUM(status = 'verified') AS verified_reports, COUNT(*) AS total_reports FROM damage_reports"),
      listReports({ status: req.query.status })
    ]);
    res.json({ summary: summaryRows[0], reports });
  } catch (error) { next(error); }
}
