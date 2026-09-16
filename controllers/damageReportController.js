import { DamageReport } from "../models/damageReportModel.js";
import { FarmerProfile } from "../models/farmerProfileModel.js";
import { Land } from "../models/landModel.js";

export async function reportDamagePage(req, res) {
  if (!req.session.userId) return res.redirect("/login");
  const profile = await FarmerProfile.findOne({ where: { userId: req.session.userId }, raw: true });
  const lands = profile ? await Land.findAll({ where: { farmerId: profile.id }, raw: true }) : [];
  res.render("damage-report", { title: "Report Farm Damage", profile, lands });
}

export async function submitDamageReport(req, res) {
  if (!req.session.userId) return res.redirect("/login");
  const profile = await FarmerProfile.findOne({ where: { userId: req.session.userId }, raw: true });
  if (!profile || profile.registrationStatus !== "approved") { req.flash("error_msg", "Kailangan munang ma-approve ang farmer profile bago magsumite ng report."); return res.redirect("/farmer/profile"); }
  const land = await Land.findOne({ where: { id: req.body.landId, farmerId: profile.id } });
  if (!land || !req.body.confirmedPlant || !req.body.confirmedDamageType) { req.flash("error_msg", "Piliin ang iyong land at kumpletuhin ang crop at damage type."); return res.redirect("/farmer/report-damage"); }
  await DamageReport.create({ farmerId: profile.id, ...req.body, status: "pending" });
  req.flash("success_msg", "Naipadala na ang damage report para sa MAO review.");
  res.redirect("/farmer/reports");
}

export async function myReportsPage(req, res) {
  if (!req.session.userId) return res.redirect("/login");
  const profile = await FarmerProfile.findOne({ where: { userId: req.session.userId }, raw: true });
  const reports = profile ? await DamageReport.findAll({ where: { farmerId: profile.id }, order: [["createdAt", "DESC"]], raw: true }) : [];
  res.render("my-reports", { title: "My Damage Reports", reports });
}
