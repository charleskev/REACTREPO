import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { pool } from "../../config/db.js";
import { createFarmerProfile } from "../models/farmerModel.js";
import { createLand } from "../models/landModel.js";
import { createUser, findUserByContact, findUserByEmail, updateUserPassword } from "../models/userModel.js";
import { addPasswordResetAttempt, consumePasswordReset, createPasswordReset, latestUsablePasswordReset, recentPasswordReset } from "../models/passwordResetModel.js";
import { isEmailConfigured, sendPasswordResetEmail } from "../services/emailService.js";
import { isSmsConfigured, sendPasswordResetCode } from "../services/smsService.js";
import { randomInt } from "crypto";
import { googleClientId, isGoogleSignInConfigured, verifyGoogleIdToken } from "../services/googleIdentityService.js";
import { publishRealtimeUpdate } from "../services/realtimeService.js";

function tokenFor(user) { return jwt.sign({ sub: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: "8h" }); }
const normalizeContact = value => String(value || "").replace(/\D/g, "");
const normalizeEmail = value => String(value || "").trim().toLowerCase();
const isEmail = value => /^\S+@\S+\.\S+$/.test(normalizeEmail(value));
// Registration only needs a provisional land pin. Farmers can set a precise
// farm coordinate later from My Profile & Land using their device GPS.
const bongabongCenter = { latitude: 12.7517, longitude: 121.4869 };

export async function register(req, res, next) {
  let client;
  try {
    const { fullName, email, password, address, barangay, landName, landAddress, landBarangay, sizeHectares, cropTypes } = req.body;
    const contactNumber = normalizeContact(req.body.contactNumber);
    if (!fullName || !contactNumber || !email || !password || !address || !landName || !sizeHectares || !cropTypes) return res.status(422).json({ message: "Complete your account, Gmail address, and first land details before registering." });
    if (!/^09\d{9}$/.test(contactNumber)) return res.status(422).json({ message: "Enter an active Philippine mobile number in the format 09XXXXXXXXX. This number can be used for sign-in and SMS password recovery." });
    if (!isEmail(email)) return res.status(422).json({ message: "Enter a valid Gmail or email address." });
    if (!Number.isFinite(Number(sizeHectares))) return res.status(422).json({ message: "Enter a valid land size." });
    if (!req.files?.profilePhoto?.[0] || !req.files?.ownershipProof?.[0]) return res.status(422).json({ message: "A profile photo and a photo of the land title or ownership proof are required." });
    if (await findUserByContact(contactNumber)) return res.status(409).json({ message: "That contact number is already registered." });
    if (await findUserByEmail(email)) return res.status(409).json({ message: "That email address is already registered." });
    client = await pool.getConnection();
    await client.beginTransaction();
    const user = await createUser({ fullName, contactNumber, email: normalizeEmail(email), passwordHash: await bcrypt.hash(password, 12) }, client);
    const profile = await createFarmerProfile({ userId: user.id, address, barangay, profilePhoto: `/uploads/${req.files.profilePhoto[0].filename}` }, client);
    const land = await createLand({ farmerId: profile.id, name: landName, address: landAddress || address, barangay: landBarangay || barangay, latitude: bongabongCenter.latitude, longitude: bongabongCenter.longitude, sizeHectares, cropTypes: String(cropTypes).split(",").map(item => item.trim()).filter(Boolean), ownershipProofFile: `/uploads/${req.files.ownershipProof[0].filename}` }, client);
    await client.commit();
    publishRealtimeUpdate("registration.created");
    res.status(201).json({ message: "Farmer account created successfully. Please sign in using your Gmail address or mobile number. Your application will remain pending until MAO Staff review it.", user: { id: user.id, full_name: user.full_name, contact_number: user.contact_number, email: user.email, role: user.role }, profile, land });
  } catch (error) {
    if (client) await client.rollback().catch(() => {});
    next(error);
  } finally { client?.release(); }
}

export async function login(req, res, next) {
  try {
    const { password } = req.body;
    const loginId = String(req.body.loginId || req.body.contactNumber || "");
    const user = isEmail(loginId) ? await findUserByEmail(loginId) : await findUserByContact(normalizeContact(loginId));
    // Compatibility for the one initial-admin setup session that received the
    // terminal Enter key as part of its hidden password. This lets that admin
    // sign in once with the intended password and keeps normal logins unchanged.
    const suppliedPassword = String(password || "");
    const matchesNormalPassword = user && await bcrypt.compare(suppliedPassword, user.password_hash);
    const legacyPasswordVariants = [`${suppliedPassword}\n`, `${suppliedPassword}\r`, `${suppliedPassword}\r\n`];
    const matchesLegacyInitialAdminPassword = user && !matchesNormalPassword && user.role === "admin" && (await Promise.all(legacyPasswordVariants.map(value => bcrypt.compare(value, user.password_hash)))).some(Boolean);
    const matchesPassword = matchesNormalPassword || matchesLegacyInitialAdminPassword;
    if (!user || !matchesPassword) return res.status(401).json({ message: "Invalid email/mobile number or password." });
    if (matchesLegacyInitialAdminPassword) await pool.query("UPDATE users SET password_hash = ? WHERE id = ?", [await bcrypt.hash(suppliedPassword, 12), user.id]);
    if (!user.is_active) return res.status(403).json({ message: "This account has been disabled." });
    res.json({ token: tokenFor(user), user: { id: user.id, fullName: user.full_name, role: user.role, contactNumber: user.contact_number } });
  } catch (error) { next(error); }
}

export async function requestPasswordReset(req, res, next) {
  try {
    if (!isEmailConfigured() && !isSmsConfigured()) return res.status(503).json({ message: "Password recovery is temporarily unavailable. Configure Gmail or SMS delivery on the server, or contact the Municipal Agriculture Office for account assistance." });
    const loginId = String(req.body.loginId || req.body.email || req.body.contactNumber || "").trim();
    if (!loginId) return res.status(422).json({ message: "Enter the Gmail address or mobile number registered to your account." });
    const user = isEmail(loginId) ? await findUserByEmail(normalizeEmail(loginId)) : await findUserByContact(normalizeContact(loginId));
    if (!user || !user.is_active) return res.json({ message: "If that account is registered, a verification code has been sent." });
    const latest = await recentPasswordReset(user.id);
    if (latest && Date.now() - new Date(latest.created_at).getTime() < 60_000) return res.status(429).json({ message: "Please wait one minute before requesting another code." });
    const code = String(randomInt(100000, 1_000_000));
    const deliveries = [];
    if (isEmailConfigured() && user.email) deliveries.push(sendPasswordResetEmail(user.email, code));
    if (isSmsConfigured() && user.contact_number) deliveries.push(sendPasswordResetCode(user.contact_number, code));
    const results = await Promise.allSettled(deliveries);
    if (!results.some(result => result.status === "fulfilled")) return res.status(503).json({ message: "The verification code could not be delivered. Please try again later or contact the Municipal Agriculture Office." });
    await createPasswordReset({ userId: user.id, codeHash: await bcrypt.hash(code, 12) });
    res.json({ message: "If that account is registered, a verification code has been sent." });
  } catch (error) { next(error); }
}

export async function confirmPasswordReset(req, res, next) {
  try {
    const loginId = String(req.body.loginId || req.body.email || req.body.contactNumber || "").trim();
    const { code, password } = req.body;
    if (!loginId || !code || !password || String(password).length < 8) return res.status(422).json({ message: "Enter your registered Gmail or mobile number, the 6-digit code, and a new password of at least 8 characters." });
    const user = isEmail(loginId) ? await findUserByEmail(normalizeEmail(loginId)) : await findUserByContact(normalizeContact(loginId));
    const reset = user && await latestUsablePasswordReset(user.id);
    if (!user || !reset || !await bcrypt.compare(String(code), reset.code_hash)) { if (reset) await addPasswordResetAttempt(reset.id); return res.status(422).json({ message: "The reset code is invalid, expired, or has already been used." }); }
    await updateUserPassword(user.id, await bcrypt.hash(String(password), 12));
    await consumePasswordReset(reset.id);
    res.json({ message: "Password reset complete. You can now sign in." });
  } catch (error) { next(error); }
}

export function googleSignInConfig(_req, res) { res.json({ enabled: isGoogleSignInConfigured(), clientId: googleClientId() || null }); }

export async function googleLogin(req, res, next) {
  try {
    const identity = await verifyGoogleIdToken(req.body.credential);
    const user = await findUserByEmail(identity.email);
    if (!user) return res.status(404).json({ message: "No AgriSystem account is registered with this Google email. Create a farmer account first." });
    if (!user.is_active) return res.status(403).json({ message: "This account has been disabled." });
    res.json({ token: tokenFor(user), user: { id: user.id, fullName: user.full_name, role: user.role, contactNumber: user.contact_number } });
  } catch (error) { next(error); }
}

export async function googleProfile(req, res, next) {
  try { res.json({ profile: await verifyGoogleIdToken(req.body.credential) }); } catch (error) { next(error); }
}

export async function currentUser(req, res) { res.json({ user: req.user }); }
