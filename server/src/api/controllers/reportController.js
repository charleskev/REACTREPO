import { getFarmerByUserId } from "../models/farmerModel.js";
import { listLandsByFarmer } from "../models/landModel.js";
import { createReport, listReports, reviewReport } from "../models/reportModel.js";
import { publishRealtimeUpdate } from "../services/realtimeService.js";

export async function myReports(req, res, next) {
  try { const profile = await getFarmerByUserId(req.user.id); res.json({ reports: profile ? await listReports({ farmerId: profile.id }) : [] }); } catch (error) { next(error); }
}
export async function submitReport(req, res, next) {
  try {
    const profile = await getFarmerByUserId(req.user.id);
    if (!profile || profile.registration_status !== "approved") return res.status(403).json({ message: "Only approved farmers can submit a damage report." });
    const lands = await listLandsByFarmer(profile.id);
    if (!lands.some(land => String(land.id) === String(req.body.landId))) return res.status(422).json({ message: "Choose one of your registered lands." });
    const capturedAt = new Date().toISOString().slice(0, 19).replace("T", " ");
    const photos = (req.files || []).map(file => ({ fileUrl: `/uploads/${file.filename}`, latitude: req.body.latitude, longitude: req.body.longitude, capturedAt }));
    if (!photos.length) return res.status(422).json({ message: "At least one farm photo is required." });
    const report = await createReport({ ...req.body, farmerId: profile.id, aiPlant: req.body.aiPlant, aiDamageType: req.body.aiDamageType, aiConfidenceNotes: req.body.aiConfidenceNotes, confirmedPlant: req.body.confirmedPlant, confirmedDamageType: req.body.confirmedDamageType, photos });
    publishRealtimeUpdate("report.created");
    res.status(201).json({ report });
  } catch (error) { next(error); }
}
export async function reports(req, res, next) { try { res.json({ reports: await listReports(req.query) }); } catch (error) { next(error); } }
export async function review(req, res, next) {
  try {
    const { status, confirmedPlant, confirmedDamageType, rejectionReason } = req.body;
    if (!['verified', 'rejected'].includes(status)) return res.status(422).json({ message: "Status must be verified or rejected." });
    const report = await reviewReport(req.params.id, status, req.user.id, { confirmedPlant, confirmedDamageType, rejectionReason });
    if (!report) return res.status(404).json({ message: "Report was not found." });
    publishRealtimeUpdate("report.reviewed");
    res.json({ report });
  } catch (error) { next(error); }
}
