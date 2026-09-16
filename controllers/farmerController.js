import { FarmerProfile } from "../models/farmerProfileModel.js";
import { Land } from "../models/landModel.js";

async function profileFor(userId) { return FarmerProfile.findOne({ where: { userId }, raw: true }); }

export async function farmerProfilePage(req, res) {
  if (!req.session.userId) return res.redirect("/login");
  const profile = await profileFor(req.session.userId);
  const lands = profile ? await Land.findAll({ where: { farmerId: profile.id }, raw: true }) : [];
  res.render("farmer-profile", { title: "My Profile & Land", profile, lands });
}

export async function saveFarmerProfile(req, res) {
  if (!req.session.userId) return res.redirect("/login");
  const address = String(req.body.address || "").trim();
  const barangay = String(req.body.barangay || "").trim();
  if (!address) { req.flash("error_msg", "Kailangan ang home address."); return res.redirect("/farmer/profile"); }
  await FarmerProfile.upsert({ userId: req.session.userId, address, barangay });
  req.flash("success_msg", "Na-save ang farmer profile.");
  res.redirect("/farmer/profile");
}

export async function addLand(req, res) {
  if (!req.session.userId) return res.redirect("/login");
  const profile = await profileFor(req.session.userId);
  if (!profile) return res.redirect("/farmer/profile");
  const { name, address, barangay, latitude, longitude, sizeHectares, cropTypes } = req.body;
  if (!barangay || !latitude || !longitude || !sizeHectares || !cropTypes) { req.flash("error_msg", "Kumpletuhin ang required land details."); return res.redirect("/farmer/profile"); }
  await Land.create({ farmerId: profile.id, name, address, barangay, latitude, longitude, sizeHectares, cropTypes });
  req.flash("success_msg", "Na-save ang land record.");
  res.redirect("/farmer/profile");
}
