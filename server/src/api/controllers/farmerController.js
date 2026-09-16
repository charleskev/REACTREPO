import { getFarmerByProfileId, getFarmerByUserId, listFarmers, updateRegistration } from "../models/farmerModel.js";
import { createLand, listLandsByFarmer } from "../models/landModel.js";
import { publishRealtimeUpdate } from "../services/realtimeService.js";

export async function myProfile(req, res, next) {
  try { const profile = await getFarmerByUserId(req.user.id); res.json({ profile, lands: profile ? await listLandsByFarmer(profile.id) : [] }); } catch (error) { next(error); }
}
export async function addLand(req, res, next) {
  try {
    const profile = await getFarmerByUserId(req.user.id);
    if (!profile) return res.status(404).json({ message: "Farmer profile was not found." });
    const land = await createLand({ ...req.body, farmerId: profile.id, cropTypes: Array.isArray(req.body.cropTypes) ? req.body.cropTypes : String(req.body.cropTypes || "").split(",").map(x => x.trim()).filter(Boolean), ownershipProofFile: req.file ? `/uploads/${req.file.filename}` : null });
    publishRealtimeUpdate("land.created");
    res.status(201).json({ land });
  } catch (error) { next(error); }
}
export async function registrations(req, res, next) { try { res.json({ farmers: await listFarmers(req.query.status) }); } catch (error) { next(error); } }
export async function farmerDirectoryDetail(req, res, next) {
  try {
    const farmer = await getFarmerByProfileId(req.params.id);
    if (!farmer) return res.status(404).json({ message: "Farmer account was not found." });
    res.json({ farmer, lands: await listLandsByFarmer(farmer.id) });
  } catch (error) { next(error); }
}
export async function reviewRegistration(req, res, next) {
  try {
    const { status, notes } = req.body;
    if (!['approved', 'rejected'].includes(status)) return res.status(422).json({ message: "Status must be approved or rejected." });
    const farmer = await updateRegistration(req.params.id, status, req.user.id, notes);
    if (!farmer) return res.status(404).json({ message: "Registration was not found." });
    publishRealtimeUpdate("registration.reviewed");
    res.json({ farmer });
  } catch (error) { next(error); }
}
