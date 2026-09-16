import { useEffect, useState } from "react";
import { api } from "../services/api.js";
import GoogleSignInButton from "../components/GoogleSignInButton.jsx";

const bongabongBarangays = ["Anilao", "Aplaya", "Bagong Bayan I", "Bagong Bayan II", "Batangan", "Bukal", "Camantigue", "Carmundo", "Cawayan", "Dayhagan", "Formon", "Hagan", "Hagupit", "Ipil", "Kaligtasan", "Labasan", "Labonan", "Libertad", "Lisap", "Luna", "Malitbog", "Mapang", "Masaguisi", "Mina de Oro", "Morente", "Ogbot", "Orconuma", "Poblacion", "Pulosahi", "Sagana", "San Isidro", "San Jose", "San Juan", "Sta. Cruz", "Sigange", "Tawas"];

export function LoginPage({ onLogin, onNavigate }) {
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [submitting, setSubmitting] = useState(false);
  useEffect(() => { const message = sessionStorage.getItem("agrisystem-registration-notice"); if (message) { setNotice(message); sessionStorage.removeItem("agrisystem-registration-notice"); } }, []);
  async function submit(event) {
    event.preventDefault(); setError(""); setSubmitting(true);
    try { onLogin(await api("/auth/login", { method: "POST", body: JSON.stringify(Object.fromEntries(new FormData(event.currentTarget))) })); }
    catch (err) { setError(err.message); } finally { setSubmitting(false); }
  }
  return <AuthLayout onNavigate={onNavigate} page="Sign in" title="Welcome back" subtitle="Access your farm records, crop-damage reports, and updates from the Municipal Agriculture Office.">
    <form onSubmit={submit} className="space-y-4">
      <Input name="loginId" label="Registered Gmail or mobile number" placeholder="name@gmail.com or 09XX XXX XXXX" autoComplete="username" required />
      <p className="-mt-2 text-xs leading-5 text-slate-500">Use the Gmail address or mobile number saved during registration.</p>
      <Input name="password" label="Password" type="password" autoComplete="current-password" required />
      <div className="-mt-2 text-right"><button type="button" onClick={() => onNavigate("#forgot-password")} className="text-xs font-bold text-emerald-700 transition hover:text-emerald-900">Forgot password?</button></div>
      {notice && <p className="rounded-xl border border-emerald-100 bg-emerald-50 p-3 text-sm leading-6 text-emerald-800">{notice}</p>}
      {error && <Error text={error} />}
      <button disabled={submitting} className="button">{submitting ? "Signing in..." : "Sign in securely"}</button>
      <div className="flex items-center gap-3 pt-1"><span className="h-px flex-1 bg-slate-200"/><span className="text-xs text-slate-400">or</span><span className="h-px flex-1 bg-slate-200"/></div>
      <GoogleSignInButton onLogin={onLogin} onError={setError}/>
    </form>
    <AuthLinks onNavigate={onNavigate} prompt="New to AgriSystem?" action="Create a farmer account" destination="#register" />
  </AuthLayout>;
}

export function ForgotPasswordPage({ onNavigate }) {
  const [loginId, setLoginId] = useState(""); const [error, setError] = useState(""); const [notice, setNotice] = useState(""); const [sent, setSent] = useState(false); const [submitting, setSubmitting] = useState(false);
  async function requestCode(event) { event.preventDefault(); setError(""); setNotice(""); setSubmitting(true); try { const result = await api("/auth/forgot-password/request", { method: "POST", body: JSON.stringify({ loginId }) }); setNotice(result.message); setSent(true); } catch (err) { setError(err.message); } finally { setSubmitting(false); } }
  async function resetPassword(event) { event.preventDefault(); setError(""); setNotice(""); setSubmitting(true); try { const result = await api("/auth/forgot-password/confirm", { method: "POST", body: JSON.stringify({ loginId, ...Object.fromEntries(new FormData(event.currentTarget)) }) }); setNotice(result.message); } catch (err) { setError(err.message); } finally { setSubmitting(false); } }
  return <AuthLayout onNavigate={onNavigate} page="Password recovery" title="Reset your password" subtitle="Use the Gmail address or mobile number you saved during registration to recover your AgriSystem account.">
    {!sent ? <form onSubmit={requestCode} className="space-y-4"><Input name="loginId" label="Registered Gmail or mobile number" placeholder="name@gmail.com or 09XX XXX XXXX" autoComplete="username" value={loginId} onChange={event => setLoginId(event.target.value)} required/><p className="rounded-xl border border-sky-100 bg-sky-50 px-3 py-2.5 text-xs leading-5 text-sky-800">The same 6-digit code is sent to your registered Gmail and mobile number when email and SMS delivery are configured. It expires after 10 minutes.</p>{error && <Error text={error}/>}<button disabled={submitting} className="button">{submitting ? "Sending code..." : "Send verification code"}</button></form> : <form onSubmit={resetPassword} className="space-y-4"><p className="rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2.5 text-xs leading-5 text-emerald-800">{notice || "Enter the code sent to your registered Gmail or mobile number."}</p><Input name="code" label="6-digit verification code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength="6" placeholder="000000" required/><Input name="password" label="New password" type="password" minLength="8" autoComplete="new-password" placeholder="At least 8 characters" required/>{error && <Error text={error}/>}<button disabled={submitting} className="button">{submitting ? "Resetting password..." : "Save new password"}</button><button type="button" onClick={() => { setSent(false); setNotice(""); setError(""); }} className="w-full text-sm font-bold text-emerald-700 hover:text-emerald-900">Use a different Gmail or mobile number</button></form>}
    {!sent && notice && <p className="mt-4 rounded-xl border border-emerald-100 bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</p>}
    <AuthLinks onNavigate={onNavigate} prompt="Remembered your password?" action="Back to sign in" destination="#login" />
  </AuthLayout>;
}

export function RegisterPage({ onNavigate }) {
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  async function submit(event) {
    event.preventDefault(); setError(""); setSubmitting(true);
    try { const result = await api("/auth/register", { method: "POST", body: new FormData(event.currentTarget) }); sessionStorage.setItem("agrisystem-registration-notice", result.message || "Account created successfully. Please sign in to continue."); onNavigate("#login"); }
    catch (err) { setError(err.message); } finally { setSubmitting(false); }
  }
  return <AuthLayout onNavigate={onNavigate} page="Farmer registration" title="Create your farmer account" subtitle="Submit your contact, first land record, and registration photos for MAO review.">
    <form onSubmit={submit} className="space-y-4">
      <section><div className="flex items-center gap-2"><span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-700 text-xs font-bold text-white">1</span><h2 className="text-sm font-extrabold text-slate-900">Farmer details</h2></div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2"><Input name="fullName" label="Full name" placeholder="Your complete name" autoComplete="name" required /></div>
        <Input name="contactNumber" label="Contact number" placeholder="09XX XXX XXXX" inputMode="tel" autoComplete="tel" required />
        <BarangaySelect name="barangay" label="Home barangay" autoComplete="address-level3" />
        <div className="sm:col-span-2"><Input name="email" label="Gmail or email address" placeholder="name@gmail.com" type="email" autoComplete="email" required /></div>
        <div className="sm:col-span-2"><Input name="address" label="Home address" placeholder="House number, street, barangay" autoComplete="street-address" required /></div>
        <div className="sm:col-span-2"><Input name="password" label="Password" type="password" minLength="8" placeholder="At least 8 characters" autoComplete="new-password" required /></div>
      </div></section>
      <section className="border-t border-slate-200 pt-4"><div className="flex items-center gap-2"><span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-700 text-xs font-bold text-white">2</span><h2 className="text-sm font-extrabold text-slate-900">First land record</h2></div><p className="mt-1 text-xs leading-5 text-slate-500">These details help MAO Staff review your application and validate future reports.</p><div className="mt-3 grid gap-3 sm:grid-cols-2"><Input name="landName" label="Land / farm name" placeholder="Example: Santos Rice Field" required/><BarangaySelect name="landBarangay" label="Land barangay" required/><div className="sm:col-span-2"><Input name="landAddress" label="Land address or sitio" placeholder="Optional address description" /></div><Input name="sizeHectares" label="Land size (hectares)" type="number" min="0.01" step="0.01" placeholder="Example: 1.25" required/><Input name="cropTypes" label="Main crops" placeholder="Rice, corn, vegetables" required/><p className="rounded-xl border border-sky-100 bg-sky-50 p-3 text-xs leading-5 text-sky-800 sm:col-span-2"><b>GPS location:</b> You do not need latitude and longitude during registration. After your account is approved, open <b>My Profile & Land</b> and use <b>Use my GPS location</b> while standing at your farm to save a more accurate pin.</p></div></section>
      <section className="border-t border-slate-200 pt-4"><div className="flex items-center gap-2"><span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-700 text-xs font-bold text-white">3</span><h2 className="text-sm font-extrabold text-slate-900">Registration photos</h2></div><div className="mt-3 grid gap-3 sm:grid-cols-2"><FileInput name="profilePhoto" label="Profile photo" hint="Clear face photo, JPG or PNG" required/><FileInput name="ownershipProof" label="Land title / ownership proof" hint="Clear photo of title, tax declaration, or proof" required/></div></section>
      <p className="rounded-xl border border-sky-100 bg-sky-50 px-3 py-2.5 text-xs leading-5 text-sky-800">Use an active 09XXXXXXXXX mobile number and your own Gmail address. Either one can be used to sign in; they are also used for password recovery. Your account and land documents remain pending until reviewed by MAO Staff.</p>
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3"><p className="text-xs leading-5 text-slate-600">You may use Google to fill your verified name and Gmail address faster. You still need to complete the required land details and photos.</p><div className="mt-3"><GoogleSignInButton purpose="profile" onError={setError} onProfile={profile => { const name = document.querySelector("input[name='fullName']"); const email = document.querySelector("input[name='email']"); if (name) name.value = profile.fullName; if (email) email.value = profile.email; }} /></div></div>
      {error && <Error text={error} />}
      <button disabled={submitting} className="button">{submitting ? "Creating account..." : "Create farmer account"}</button>
    </form>
    <AuthLinks onNavigate={onNavigate} prompt="Already registered?" action="Sign in" destination="#login" />
  </AuthLayout>;
}

function AuthLayout({ page, title, subtitle, children, onNavigate }) {
  const checklist = ["Secure account access", "Organized farm records", "Report status updates"];
  return <main className="min-h-screen bg-slate-100 px-4 py-4 text-slate-800 sm:p-6">
    <div className="mx-auto flex w-full max-w-5xl items-center justify-between pb-4">
      <button onClick={() => onNavigate("#home")} className="text-left leading-tight"><span className="block text-lg font-extrabold tracking-tight text-emerald-950">AgriSystem <span className="text-emerald-600">MAO</span></span><span className="mt-0.5 block text-[10px] font-bold uppercase tracking-[.14em] text-slate-500">Municipal Agriculture Office</span></button>
      <button onClick={() => onNavigate("#home")} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-600 transition hover:border-emerald-300 hover:text-emerald-800">Back to home</button>
    </div>
    <section className="mx-auto grid w-full max-w-5xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-300/40 lg:grid-cols-[.8fr_1.2fr]">
      <aside className="relative hidden overflow-hidden bg-emerald-950 p-7 text-white lg:block">
        <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-lime-300/10 blur-2xl" /><div className="absolute -bottom-24 -left-20 h-64 w-64 rounded-full bg-teal-300/10 blur-2xl" />
        <div className="relative"><p className="text-xs font-bold uppercase tracking-[.18em] text-lime-300">MAO digital services</p><h2 className="mt-4 text-3xl font-extrabold leading-tight">Farm support made easier to follow.</h2><p className="mt-4 max-w-md text-sm leading-6 text-emerald-100">A dedicated portal for farmers and authorized MAO Staff to keep farm information, reports, and service updates connected.</p>
          <div className="mt-7 space-y-3 border-t border-white/15 pt-5">{checklist.map((item, index) => <div key={item} className="flex items-center gap-3"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-lime-300 text-xs font-extrabold text-emerald-950">{index + 1}</span><span className="text-sm font-semibold text-emerald-50">{item}</span></div>)}</div>
          <p className="mt-7 border-t border-white/15 pt-4 text-xs leading-5 text-emerald-100/85">Your details are used for farm records, report validation, and service communication from the Municipal Agriculture Office.</p>
        </div>
      </aside>
      <div className="p-5 sm:p-7"><p className="text-xs font-bold uppercase tracking-[.16em] text-emerald-700">{page}</p><h1 className="mt-2 text-2xl font-extrabold tracking-tight text-slate-950 sm:text-3xl">{title}</h1><p className="mt-2 max-w-xl text-sm leading-6 text-slate-600">{subtitle}</p><div className="mt-4 h-px bg-slate-200" /><div className="mt-5">{children}</div></div>
    </section>
    <p className="mx-auto max-w-5xl py-4 text-center text-xs text-slate-500">Need help with your record or report? Please contact your Municipal Agriculture Office.</p>
  </main>;
}

function AuthLinks({ onNavigate, prompt, action, destination }) {
  return <div className="mt-5 border-t border-slate-200 pt-4 text-center text-sm text-slate-600"><p>{prompt} <button type="button" onClick={() => onNavigate(destination)} className="font-bold text-emerald-700 transition hover:text-emerald-900">{action}</button></p></div>;
}

export function Input({ label, ...props }) {
  return <label className="block text-sm font-semibold text-slate-700">{label}<input {...props} className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100" /></label>;
}

function BarangaySelect({ label, ...props }) {
  return <label className="block text-sm font-semibold text-slate-700">{label}<select {...props} className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-slate-900 outline-none transition focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100"><option value="">Select a Bongabong barangay</option>{bongabongBarangays.map(barangay => <option key={barangay} value={barangay}>{barangay}</option>)}</select></label>;
}

function FileInput({ label, hint, ...props }) {
  return <label className="block text-sm font-semibold text-slate-700">{label}<input {...props} type="file" accept="image/jpeg,image/png,image/webp" className="mt-1.5 block w-full text-xs"/><span className="mt-1 block text-xs font-normal leading-5 text-slate-500">{hint}</span></label>;
}

export function Error({ text }) {
  return <p role="alert" className="rounded-xl border border-red-100 bg-red-50 p-3 text-sm leading-5 text-red-700">{text}</p>;
}
