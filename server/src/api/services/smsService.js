function toPhilippineMobile(contactNumber) {
  const digits = String(contactNumber || "").replace(/\D/g, "");
  if (/^09\d{9}$/.test(digits)) return `63${digits.slice(1)}`;
  if (/^639\d{9}$/.test(digits)) return digits;
  return null;
}

export function isSmsConfigured() { return Boolean(process.env.SEMAPHORE_API_KEY); }

export async function sendPasswordResetCode(contactNumber, code) {
  const recipient = toPhilippineMobile(contactNumber);
  if (!recipient) throw new Error("Use a valid Philippine mobile number (09XXXXXXXXX) for password recovery.");
  if (!isSmsConfigured()) throw new Error("SMS password recovery is not configured. Add SEMAPHORE_API_KEY on the server.");
  const body = new URLSearchParams({
    apikey: process.env.SEMAPHORE_API_KEY,
    number: recipient,
    code,
    message: "AgriSystem MAO password reset code: {otp}. It expires in 10 minutes. Do not share this code.",
  });
  if (process.env.SEMAPHORE_SENDER_NAME) body.set("sendername", process.env.SEMAPHORE_SENDER_NAME);
  const response = await fetch("https://api.semaphore.co/api/v4/otp", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body });
  if (!response.ok) throw new Error("SMS code could not be sent. Check the SMS gateway configuration and credits.");
  return response.json().catch(() => []);
}

export async function sendFarmerNotificationSms(farmers, message) {
  if (!isSmsConfigured()) return { status: "not_configured", recipients: 0 };
  const recipients = [...new Set(farmers.map(farmer => toPhilippineMobile(farmer.contact_number)).filter(Boolean))];
  if (!recipients.length) return { status: "no_valid_numbers", recipients: 0 };
  const body = new URLSearchParams({
    apikey: process.env.SEMAPHORE_API_KEY,
    number: recipients.join(","),
    message: `AgriSystem MAO: ${String(message).trim()}`.slice(0, 459),
  });
  if (process.env.SEMAPHORE_SENDER_NAME) body.set("sendername", process.env.SEMAPHORE_SENDER_NAME);
  const response = await fetch("https://api.semaphore.co/api/v4/messages", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body });
  if (!response.ok) throw new Error("SMS gateway did not accept the notification.");
  return { status: "queued", recipients: recipients.length };
}
