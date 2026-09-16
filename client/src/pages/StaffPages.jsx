import { Fragment, useCallback, useEffect, useState } from "react";
import AppShell from "../components/AppShell.jsx";
import PageHeader from "../components/PageHeader.jsx";
import ReportMap from "../components/ReportMap.jsx";
import StatCard from "../components/StatCard.jsx";
import StatusBadge from "../components/StatusBadge.jsx";
import { api } from "../services/api.js";
import useRealtimeRefresh from "../hooks/useRealtimeRefresh.js";

const bongabongBarangays = ["Anilao", "Aplaya", "Bagong Bayan I", "Bagong Bayan II", "Batangan", "Bukal", "Camantigue", "Carmundo", "Cawayan", "Dayhagan", "Formon", "Hagan", "Hagupit", "Ipil", "Kaligtasan", "Labasan", "Labonan", "Libertad", "Lisap", "Luna", "Malitbog", "Mapang", "Masaguisi", "Mina de Oro", "Morente", "Ogbot", "Orconuma", "Poblacion", "Pulosahi", "Sagana", "San Isidro", "San Jose", "San Juan", "Sta. Cruz", "Sigange", "Tawas"];

export function StaffDashboard({ token, onLogout }) {
  const [data, setData] = useState({ summary: {}, reports: [] });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const load = useCallback(async (background = false) => {
    if (!background) setLoading(true); setError("");
    try { setData(await api("/dashboard", { token })); }
    catch (err) { setError(err.message); }
    finally { if (!background) setLoading(false); }
  }, [token]);
  useEffect(() => { load(); }, [load]);
  useRealtimeRefresh(token, load);

  return <AppShell role="staff" onLogout={onLogout}>
    <PageHeader eyebrow="MAO operations" title="Damage reports dashboard" description="Monitor incoming incidents, prioritize field validation, and coordinate assistance." action={<a href="#review" className="button !w-auto">Review reports</a>}/>
    {error && <Notice tone="red">{error} <button onClick={load} className="ml-2 font-bold underline">Try again</button></Notice>}
    <div className="mt-6 grid gap-3 sm:grid-cols-3"><StatCard label="All reports" value={data.summary.total_reports || 0}/><StatCard label="Pending review" value={data.summary.pending_reports || 0} tone="amber"/><StatCard label="Verified" value={data.summary.verified_reports || 0} tone="blue"/></div>
    <section className="mt-6 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm"><div className="flex flex-wrap items-center justify-between gap-2"><div><h2 className="font-bold text-slate-900">Incident map</h2><p className="mt-1 text-xs text-slate-500">Green markers are verified; amber markers need review.</p></div><span className="text-xs font-medium text-slate-400">{data.reports.length} incidents shown</span></div><div className="mt-4">{loading ? <LoadingBlock/> : <ReportMap reports={data.reports}/>}</div></section>
    <ReportsTable reports={data.reports} loading={loading}/>
  </AppShell>;
}

function LegacyReviewReportsPage({ token, onLogout }) {
  const [reports, setReports] = useState([]); const [error, setError] = useState(""); const [loading, setLoading] = useState(true); const [updating, setUpdating] = useState("");
  const load = useCallback(async () => { setLoading(true); setError(""); try { const data = await api("/reports", { token }); setReports(data.reports); } catch (err) { setError(err.message); } finally { setLoading(false); } }, [token]);
  useEffect(() => { load(); }, [load]);
  async function review(id, status) { setUpdating(id); setError(""); try { await api(`/reports/${id}/review`, { token, method: "PATCH", body: JSON.stringify({ status }) }); await load(); } catch (err) { setError(err.message); } finally { setUpdating(""); } }
  return <AppShell role="staff" onLogout={onLogout}><PageHeader eyebrow="MAO operations" title="Review damage reports" description="Verify reports after checking the submitted details and incident location."/>{error && <Notice tone="red">{error}</Notice>}<div className="mt-6 space-y-3">{loading ? <LoadingBlock/> : reports.map(report => <article key={report.id} className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm"><div className="flex flex-wrap justify-between gap-3"><div><h2 className="font-bold text-slate-900">{report.farmer_name} <span className="font-normal text-slate-300">/</span> {report.land_name || "Farm land"}</h2><p className="mt-1 text-sm text-slate-500">{report.barangay || "Location not provided"} · {report.confirmed_plant || report.ai_detected_plant || "Crop pending"} · {report.confirmed_damage_type || report.ai_detected_damage_type || "Damage type pending"}</p><p className="mt-2 text-xs text-slate-400">Submitted {new Date(report.created_at).toLocaleString()} · {report.photos?.length || 0} photo(s)</p></div><StatusBadge value={report.status}/></div>{report.status === "pending" && <div className="mt-4 flex gap-2"><button disabled={updating === report.id} className="button !w-auto" onClick={() => review(report.id, "verified")}>{updating === report.id ? "Saving…" : "Verify"}</button><button disabled={updating === report.id} className="rounded-lg border border-red-200 px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:opacity-60" onClick={() => review(report.id, "rejected")}>Reject</button></div>}</article>)}{!loading && !reports.length && <Empty text="No damage reports are waiting for review."/>}</div></AppShell>;
}

export function ReviewReportsPage({ token, onLogout }) {
  const [reports, setReports] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState("");
  const [expanded, setExpanded] = useState(null);
  const [status, setStatus] = useState("pending");
  const [barangay, setBarangay] = useState("");
  const [query, setQuery] = useState("");
  const load = useCallback(async () => {
    setLoading(true); setError("");
    try { setReports((await api("/reports", { token })).reports); }
    catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }, [token]);
  useEffect(() => { load(); api("/admin/review-indicators/reports/mark-seen", { token, method: "POST" }).then(() => window.dispatchEvent(new Event("agrisystem-review-items-seen"))).catch(() => {}); }, [load, token]);
  useRealtimeRefresh(token, load);
  async function review(id, nextStatus) {
    setUpdating(id); setError("");
    try { await api(`/reports/${id}/review`, { token, method: "PATCH", body: JSON.stringify({ status: nextStatus }) }); await load(); }
    catch (err) { setError(err.message); }
    finally { setUpdating(""); }
  }
  const barangays = bongabongBarangays;
  const filtered = reports.filter(report => (status === "all" || report.status === status) && (!barangay || report.barangay === barangay) && `${report.farmer_name} ${report.contact_number || ""} ${report.land_name || ""} ${report.confirmed_plant || report.ai_detected_plant || ""} ${report.confirmed_damage_type || report.ai_detected_damage_type || ""}`.toLowerCase().includes(query.toLowerCase()));
  const pending = reports.filter(report => report.status === "pending").length;
  return <AppShell role="staff" onLogout={onLogout}>
    <PageHeader eyebrow="MAO operations" title="Farmer damage reports" description="Review clear, live report records from farmers. Open full details and evidence before taking MAO action." action={<button onClick={load} className="button !w-auto">Refresh reports</button>}/>
    {error && <Notice tone="red">{error}</Notice>}
    <section className="mt-6 overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm">
      <div className="flex flex-col gap-4 border-b p-5"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-extrabold text-slate-900">Farmer reports</p><p className="mt-1 text-sm text-slate-500">{loading ? "Loading live report data..." : `${filtered.length} of ${reports.length} report(s) · ${pending} awaiting MAO review`}</p></div><span className="inline-flex w-fit items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-800"><span className="h-2 w-2 rounded-full bg-emerald-500"/> Realtime</span></div><div className="grid gap-3 lg:grid-cols-3"><input value={query} onChange={event => setQuery(event.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm" placeholder="Search farmer, crop, or contact"/><select value={status} onChange={event => setStatus(event.target.value)} className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm"><option value="pending">Pending review</option><option value="verified">Verified</option><option value="rejected">Rejected</option><option value="all">All report statuses</option></select><select value={barangay} onChange={event => setBarangay(event.target.value)} className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm"><option value="">All Bongabong barangays</option>{barangays.map(item => <option key={item} value={item}>{item}</option>)}</select></div></div>
      <div className="overflow-x-auto"><table className="w-full min-w-[1100px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-3">Farmer / contact</th><th className="px-5 py-3">Crop and damage</th><th className="px-5 py-3">Barangay</th><th className="px-5 py-3">Evidence</th><th className="px-5 py-3">Submitted</th><th className="px-5 py-3">Status</th><th className="px-5 py-3 text-right">MAO action</th></tr></thead><tbody>{filtered.map(report => <Fragment key={report.id}><tr className={`border-t border-slate-100 ${expanded === report.id ? "bg-emerald-50/40" : ""}`}><td className="px-5 py-4"><p className="font-bold text-slate-800">{report.farmer_name}</p><p className="mt-1 text-xs text-slate-400">{report.contact_number || "No contact"} · #{report.id}</p></td><td className="px-5 py-4"><p className="font-bold text-slate-800">{report.confirmed_plant || report.ai_detected_plant || "Crop pending"}</p><p className="mt-1 text-xs text-slate-500">{report.confirmed_damage_type || report.ai_detected_damage_type || "Damage pending"}</p></td><td className="px-5 py-4"><span className="rounded-full bg-sky-50 px-2.5 py-1 text-xs font-bold text-sky-800">{report.barangay || "Not provided"}</span><p className="mt-1 text-xs text-slate-400">{report.land_name || "Farm land"}</p></td><td className="px-5 py-4"><p className="font-semibold text-slate-700">{report.photos?.length || 0} photo(s)</p><p className="mt-1 text-xs text-slate-400">{Number.isFinite(Number(report.latitude)) && Number.isFinite(Number(report.longitude)) ? "GPS saved" : "No GPS pin"}</p></td><td className="px-5 py-4 text-xs text-slate-500">{new Date(report.created_at).toLocaleString()}</td><td className="px-5 py-4"><StatusBadge value={report.status}/></td><td className="px-5 py-4 text-right"><div className="flex justify-end gap-2"><button type="button" onClick={() => setExpanded(expanded === report.id ? null : report.id)} className="rounded-lg border border-emerald-200 px-3 py-2 text-xs font-bold text-emerald-700 hover:bg-emerald-50">{expanded === report.id ? "Hide" : "View"}</button>{report.status === "pending" && <><button disabled={updating === report.id} className="rounded-lg bg-emerald-700 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-800 disabled:opacity-60" onClick={() => review(report.id, "verified")}>Verify</button><button disabled={updating === report.id} className="rounded-lg border border-red-200 px-3 py-2 text-xs font-bold text-red-700 hover:bg-red-50 disabled:opacity-60" onClick={() => review(report.id, "rejected")}>Reject</button></>}</div></td></tr>{expanded === report.id && <tr className="border-t border-emerald-100"><td colSpan="7" className="p-0"><ReportDetails report={report}/></td></tr>}</Fragment>)} </tbody></table></div>
      {!loading && !filtered.length && <Empty text="No reports match the selected filters."/>}
    </section>
  </AppShell>;
}

function LegacyReviewReportsPageCleanCards({ token, onLogout }) {
  const [reports, setReports] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState("");
  const [expanded, setExpanded] = useState(null);
  const [status, setStatus] = useState("pending");
  const [barangay, setBarangay] = useState("");
  const [query, setQuery] = useState("");
  const load = useCallback(async () => {
    setLoading(true); setError("");
    try { setReports((await api("/reports", { token })).reports); }
    catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }, [token]);
  useEffect(() => { load(); api("/admin/review-indicators/reports/mark-seen", { token, method: "POST" }).then(() => window.dispatchEvent(new Event("agrisystem-review-items-seen"))).catch(() => {}); }, [load, token]);
  useRealtimeRefresh(token, load);
  async function review(id, nextStatus) {
    setUpdating(id); setError("");
    try { await api(`/reports/${id}/review`, { token, method: "PATCH", body: JSON.stringify({ status: nextStatus }) }); await load(); }
    catch (err) { setError(err.message); }
    finally { setUpdating(""); }
  }
  const barangays = bongabongBarangays;
  const filtered = reports.filter(report => (status === "all" || report.status === status) && (!barangay || report.barangay === barangay) && `${report.farmer_name} ${report.land_name || ""} ${report.confirmed_plant || report.ai_detected_plant || ""} ${report.confirmed_damage_type || report.ai_detected_damage_type || ""}`.toLowerCase().includes(query.toLowerCase()));
  const pending = reports.filter(report => report.status === "pending").length;
  return <AppShell role="staff" onLogout={onLogout}>
    <PageHeader eyebrow="MAO operations" title="Review farmer damage reports" description="Use the report details, evidence photos, crop analysis, and incident location to make a complete MAO review." action={<button onClick={load} className="button !w-auto">Refresh reports</button>}/>
    {error && <Notice tone="red">{error}</Notice>}
    <section className="mt-6 rounded-3xl border border-slate-100 bg-white p-5 shadow-sm"><div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"><div><p className="text-xs font-extrabold uppercase tracking-[.14em] text-emerald-700">Live review queue</p><h2 className="mt-1 text-lg font-extrabold text-slate-900">{pending} report(s) awaiting MAO action</h2><p className="mt-1 text-sm text-slate-500">Open each report before verifying or rejecting it.</p></div><div className="grid gap-3 sm:grid-cols-3"><input value={query} onChange={event => setQuery(event.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm" placeholder="Search farmer or crop"/><select value={status} onChange={event => setStatus(event.target.value)} className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm"><option value="pending">Pending review</option><option value="verified">Verified</option><option value="rejected">Rejected</option><option value="all">All statuses</option></select><select value={barangay} onChange={event => setBarangay(event.target.value)} className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm"><option value="">All barangays</option>{barangays.map(item => <option key={item} value={item}>{item}</option>)}</select></div></div></section>
    <div className="mt-5 space-y-4">{loading ? <LoadingBlock/> : filtered.map(report => <article key={report.id} className={`overflow-hidden rounded-3xl border bg-white shadow-sm ${report.status === "pending" ? "border-amber-200" : "border-slate-100"}`}><div className="p-5 sm:p-6"><div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><StatusBadge value={report.status}/><span className="text-xs font-semibold text-slate-400">Report #{report.id}</span></div><h2 className="mt-3 text-lg font-extrabold text-slate-900">{report.confirmed_plant || report.ai_detected_plant || "Crop identification pending"}</h2><p className="mt-1 text-sm font-semibold text-slate-600">{report.confirmed_damage_type || report.ai_detected_damage_type || "Damage assessment pending"}</p><p className="mt-3 text-sm text-slate-500"><b className="text-slate-700">{report.farmer_name}</b> · {report.land_name || "Farm land"} · {report.barangay || "Barangay not provided"}</p><p className="mt-1 text-xs text-slate-400">Submitted {new Date(report.created_at).toLocaleString()} · {report.photos?.length || 0} evidence photo(s)</p></div><div className="grid grid-cols-2 gap-2 text-xs sm:flex sm:flex-wrap"><ReviewStat label="Farm photos" value={report.photos?.length || 0}/><ReviewStat label="GPS pin" value={Number.isFinite(Number(report.latitude)) && Number.isFinite(Number(report.longitude)) ? "Saved" : "None"}/><ReviewStat label="AI labels" value={report.camera_scene_objects?.length || 0}/></div></div><div className="mt-5 flex flex-wrap gap-2 border-t border-slate-100 pt-4"><button type="button" onClick={() => setExpanded(expanded === report.id ? null : report.id)} className="rounded-lg border border-emerald-200 px-4 py-2 text-sm font-bold text-emerald-700 hover:bg-emerald-50">{expanded === report.id ? "Hide full details" : "View full report"}</button>{report.status === "pending" && <><button disabled={updating === report.id} className="button !w-auto" onClick={() => review(report.id, "verified")}>{updating === report.id ? "Saving..." : "Verify report"}</button><button disabled={updating === report.id} className="rounded-lg border border-red-200 px-4 py-2 text-sm font-bold text-red-700 hover:bg-red-50 disabled:opacity-60" onClick={() => review(report.id, "rejected")}>Reject report</button></>}</div></div>{expanded === report.id && <ReportDetails report={report}/>}</article>)}{!loading && !filtered.length && <Empty text="No reports match the selected filters."/>}</div>
  </AppShell>;
}
function ReviewStat({ label, value }) { return <div className="rounded-xl bg-slate-50 px-3 py-2 text-center"><p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{label}</p><p className="mt-1 font-extrabold text-slate-800">{value}</p></div>; }

function LegacyReviewReportsPageV2({ token, onLogout }) {
  const [reports, setReports] = useState([]); const [error, setError] = useState(""); const [loading, setLoading] = useState(true); const [updating, setUpdating] = useState(""); const [expanded, setExpanded] = useState(null);
  const load = useCallback(async () => { setLoading(true); setError(""); try { setReports((await api("/reports", { token })).reports); } catch (err) { setError(err.message); } finally { setLoading(false); } }, [token]);
  useEffect(() => { load(); api("/admin/review-indicators/reports/mark-seen", { token, method: "POST" }).then(() => window.dispatchEvent(new Event("agrisystem-review-items-seen"))).catch(() => {}); }, [load, token]);
  useRealtimeRefresh(token, load);
  async function review(id, status) { setUpdating(id); setError(""); try { await api(`/reports/${id}/review`, { token, method: "PATCH", body: JSON.stringify({ status }) }); await load(); } catch (err) { setError(err.message); } finally { setUpdating(""); } }
  return <AppShell role="staff" onLogout={onLogout}><PageHeader eyebrow="MAO operations" title="Review damage reports" description="Open every report to inspect farmer, land, location, AI labels, notes, and all submitted photos before taking action."/>{error && <Notice tone="red">{error}</Notice>}<div className="mt-6 space-y-3">{loading ? <LoadingBlock/> : reports.map(report => <article key={report.id} className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm"><div className="p-5"><div className="flex flex-wrap justify-between gap-3"><div><h2 className="font-bold text-slate-900">{report.farmer_name} <span className="font-normal text-slate-300">/</span> {report.land_name || "Farm land"}</h2><p className="mt-1 text-sm text-slate-500">{report.barangay || "Location not provided"} · {report.confirmed_plant || report.ai_detected_plant || "Crop pending"} · {report.confirmed_damage_type || report.ai_detected_damage_type || "Damage type pending"}</p><p className="mt-2 text-xs text-slate-400">Submitted {new Date(report.created_at).toLocaleString()} · {report.photos?.length || 0} photo(s)</p></div><StatusBadge value={report.status}/></div><div className="mt-4 flex flex-wrap gap-2"><button type="button" onClick={() => setExpanded(expanded === report.id ? null : report.id)} className="rounded-lg border border-emerald-200 px-4 py-2 text-sm font-bold text-emerald-700 transition hover:bg-emerald-50">{expanded === report.id ? "Hide full details" : "View full report"}</button>{report.status === "pending" && <><button disabled={updating === report.id} className="button !w-auto" onClick={() => review(report.id, "verified")}>{updating === report.id ? "Saving..." : "Verify"}</button><button disabled={updating === report.id} className="rounded-lg border border-red-200 px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:opacity-60" onClick={() => review(report.id, "rejected")}>Reject</button></>}</div></div>{expanded === report.id && <ReportDetails report={report}/>}</article>)}{!loading && !reports.length && <Empty text="No damage reports have been submitted yet."/>}</div></AppShell>;
}

function ReportDetails({ report }) {
  const plant = report.confirmed_plant || report.ai_detected_plant || "Not identified";
  const damage = report.confirmed_damage_type || report.ai_detected_damage_type || "Not identified";
  const validLocation = Number.isFinite(Number(report.latitude)) && Number.isFinite(Number(report.longitude));
  const mapUrl = validLocation ? `https://www.openstreetmap.org/?mlat=${report.latitude}&mlon=${report.longitude}#map=17/${report.latitude}/${report.longitude}` : null;
  return <div className="border-t border-slate-100 bg-slate-50/70 p-5"><div className="grid gap-4 lg:grid-cols-3"><section className="rounded-xl border border-slate-200 bg-white p-4"><p className="text-xs font-bold uppercase tracking-wide text-emerald-700">Farmer and land</p><dl className="mt-3 space-y-3 text-sm"><div><dt className="text-xs text-slate-400">Farmer</dt><dd className="font-semibold text-slate-800">{report.farmer_name}</dd></div><div><dt className="text-xs text-slate-400">Contact number</dt><dd className="text-slate-700">{report.contact_number || "Not available"}</dd></div><div><dt className="text-xs text-slate-400">Land / barangay</dt><dd className="text-slate-700">{report.land_name || "Farm land"} · {report.barangay || "Not available"}</dd></div><div><dt className="text-xs text-slate-400">Registered crop types</dt><dd className="text-slate-700">{report.crop_types?.join(", ") || "Not available"}</dd></div></dl></section><section className="rounded-xl border border-slate-200 bg-white p-4"><p className="text-xs font-bold uppercase tracking-wide text-emerald-700">Incident assessment</p><dl className="mt-3 space-y-3 text-sm"><div><dt className="text-xs text-slate-400">Crop / plant</dt><dd className="font-semibold text-slate-800">{plant}</dd></div><div><dt className="text-xs text-slate-400">Damage type</dt><dd className="text-slate-700">{damage}</dd></div><div><dt className="text-xs text-slate-400">Farmer notes</dt><dd className="whitespace-pre-wrap text-slate-700">{report.farmer_notes || "No additional notes."}</dd></div>{report.ai_confidence_notes && <div><dt className="text-xs text-slate-400">Camera / AI advisory</dt><dd className="text-xs leading-5 text-slate-600">{report.ai_confidence_notes}</dd></div>}</dl></section><section className="rounded-xl border border-slate-200 bg-white p-4"><p className="text-xs font-bold uppercase tracking-wide text-emerald-700">Location and scan labels</p><p className="mt-3 text-sm text-slate-700">{validLocation ? `${report.latitude}, ${report.longitude}` : "No incident coordinates"}</p>{mapUrl && <a href={mapUrl} target="_blank" rel="noreferrer" className="mt-2 inline-flex text-sm font-bold text-sky-700 hover:text-sky-900">Open incident pin on map →</a>}{report.camera_scene_objects?.length > 0 && <div className="mt-4"><p className="text-xs text-slate-400">Saved camera labels</p><div className="mt-2 flex flex-wrap gap-2">{report.camera_scene_objects.map((item, index) => <span key={`${item.label}-${index}`} className="rounded-full bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-800">{item.label}{item.confidence ? ` ${Math.round(item.confidence * 100)}%` : ""}</span>)}</div></div>}</section></div><section className="mt-5"><div className="flex items-center justify-between"><p className="text-xs font-bold uppercase tracking-wide text-emerald-700">Submitted farm photos</p><p className="text-xs text-slate-400">Select any image to view full size</p></div>{report.photos?.length ? <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">{report.photos.map(photo => <a key={photo.id} href={photo.fileUrl} target="_blank" rel="noreferrer" className="group overflow-hidden rounded-xl border border-slate-200 bg-white"><img src={photo.fileUrl} alt={`Report evidence for ${plant}`} className="aspect-square w-full object-cover transition duration-200 group-hover:scale-105"/><span className="block px-2 py-1.5 text-[10px] text-slate-500">Open full image</span></a>)}</div> : <p className="mt-3 rounded-xl border border-dashed border-slate-200 bg-white p-4 text-sm text-slate-500">No uploaded report photos found.</p>}</section></div>;
}

export function AdminDashboard({ token, onLogout }) {
  const [farmers, setFarmers] = useState([]);
  const [barangay, setBarangay] = useState("");
  const [selected, setSelected] = useState(null);
  const [error, setError] = useState("");
  const [updating, setUpdating] = useState("");
  const [loadingDetail, setLoadingDetail] = useState(false);
  const load = useCallback(async () => {
    try { setError(""); setFarmers((await api("/admin/registrations?status=pending", { token })).farmers); }
    catch (err) { setError(err.message); }
  }, [token]);
  useEffect(() => { load(); api("/admin/review-indicators/registrations/mark-seen", { token, method: "POST" }).then(() => window.dispatchEvent(new Event("agrisystem-review-items-seen"))).catch(() => {}); }, [load, token]);
  useRealtimeRefresh(token, load);
  async function viewApplication(id) {
    setLoadingDetail(true); setError("");
    try { setSelected(await api(`/admin/registrations/${id}`, { token })); }
    catch (err) { setError(err.message); }
    finally { setLoadingDetail(false); }
  }
  async function decide(id, status) {
    setUpdating(id); setError("");
    try {
      await api(`/admin/registrations/${id}`, { token, method: "PATCH", body: JSON.stringify({ status }) });
      if (selected?.farmer?.id === id) setSelected(null);
      await load();
    } catch (err) { setError(err.message); }
    finally { setUpdating(""); }
  }
  const detail = selected?.farmer;
  const filteredFarmers = farmers.filter(farmer => !barangay || farmer.barangay === barangay);
  return <AppShell role="staff" onLogout={onLogout}>
    <PageHeader eyebrow="Administration" title="Farmer registrations" description="Review identity, contact, farm location, crop records, and land-title proof before accepting a farmer account."/>
    {error && <Notice tone="red">{error}</Notice>}
    <section className="mt-6 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-bold text-slate-900">Pending farmer applications</p><p className="mt-1 text-sm text-slate-500">{filteredFarmers.length} of {farmers.length} application(s) shown</p></div><select value={barangay} onChange={event => setBarangay(event.target.value)} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm sm:w-72"><option value="">All Bongabong barangays</option>{bongabongBarangays.map(item => <option key={item} value={item}>{item}</option>)}</select></div></section>
    <section className="mt-6 grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(22rem,.92fr)]">
      <div className="space-y-3">
        {filteredFarmers.map(farmer => <article key={farmer.id} className={`rounded-2xl border bg-white p-5 shadow-sm transition ${detail?.id === farmer.id ? "border-emerald-300 ring-2 ring-emerald-100" : "border-slate-100"}`}>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-extrabold text-slate-900">{farmer.full_name}</p><p className="mt-1 text-sm text-slate-500">{farmer.contact_number || "No contact"} · {farmer.barangay || "No barangay"} · {farmer.land_count} land record(s)</p></div><div className="flex flex-wrap gap-2"><button className="rounded-lg border border-emerald-200 px-4 py-2 text-sm font-bold text-emerald-700 hover:bg-emerald-50" onClick={() => viewApplication(farmer.id)}>{detail?.id === farmer.id ? "Viewing" : "View application"}</button><button disabled={updating === farmer.id} className="button !w-auto" onClick={() => decide(farmer.id, "approved")}>{updating === farmer.id ? "Saving..." : "Approve"}</button><button disabled={updating === farmer.id} className="rounded-lg border border-red-200 px-4 py-2 text-sm font-bold text-red-700 hover:bg-red-50 disabled:opacity-50" onClick={() => decide(farmer.id, "rejected")}>Reject</button></div></div>
        </article>)}
        {!filteredFarmers.length && <Empty text={barangay ? `No pending farmer registrations in ${barangay}.` : "No pending farmer registrations."}/>}
      </div>
      <aside className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm xl:sticky xl:top-5 xl:self-start">{loadingDetail ? <LoadingBlock/> : !detail ? <div className="py-12 text-center"><p className="font-bold text-slate-800">Review before accepting</p><p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-500">Choose “View application” to check the applicant’s profile photo, contact details, land information, and documentary proof.</p></div> : <RegistrationDetail farmer={detail} lands={selected.lands || []}/>}</aside>
    </section>
  </AppShell>;
}

function RegistrationDetail({ farmer, lands }) {
  return <div><div className="flex items-start gap-4">{farmer.profile_photo_file ? <a href={farmer.profile_photo_file} target="_blank" rel="noreferrer"><img src={farmer.profile_photo_file} alt={`${farmer.full_name} profile`} className="h-16 w-16 rounded-2xl border border-slate-200 object-cover"/></a> : <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100 text-xl font-extrabold text-emerald-800">{farmer.full_name?.slice(0, 1) || "F"}</span>}<div className="min-w-0"><p className="text-xs font-bold uppercase tracking-wide text-emerald-700">Pending application</p><h2 className="mt-1 truncate text-xl font-extrabold text-slate-900">{farmer.full_name}</h2><p className="mt-1 text-sm text-slate-500">{farmer.contact_number || "No mobile number"}</p>{farmer.profile_photo_file && <a href={farmer.profile_photo_file} target="_blank" rel="noreferrer" className="mt-1 inline-flex text-xs font-bold text-emerald-700">View profile photo →</a>}</div></div><div className="mt-5 grid gap-3 text-sm"><ApplicationField label="Email" value={farmer.email || "Not provided"}/><ApplicationField label="Home address" value={farmer.address || "Not provided"}/><ApplicationField label="Barangay" value={farmer.barangay || "Not provided"}/></div><div className="mt-5 border-t border-slate-100 pt-5"><div className="flex items-center justify-between"><p className="text-xs font-bold uppercase tracking-wide text-emerald-700">Declared land ({lands.length})</p><StatusBadge value={farmer.registration_status}/></div><div className="mt-3 space-y-3">{lands.map(land => <LandProofCard key={land.id} land={land}/>)}{!lands.length && <p className="rounded-xl border border-dashed border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">No land declaration found. Confirm this with the farmer before approval.</p>}</div></div></div>;
}
function ApplicationField({ label, value }) { return <div className="rounded-xl bg-slate-50 p-3"><p className="text-xs font-semibold text-slate-400">{label}</p><p className="mt-1 break-words text-slate-700">{value}</p></div>; }
function LandProofCard({ land }) { const mapped = Number.isFinite(Number(land.latitude)) && Number.isFinite(Number(land.longitude)); const mapUrl = mapped ? `https://www.openstreetmap.org/?mlat=${land.latitude}&mlon=${land.longitude}#map=16/${land.latitude}/${land.longitude}` : null; return <article className="rounded-2xl border border-slate-200 p-4 text-sm"><p className="font-extrabold text-slate-900">{land.name || "Farm land"}</p><p className="mt-1 text-slate-600">{land.size_hectares || "—"} hectares · {(land.crop_types || []).join(", ") || "Crop not specified"}</p><p className="mt-2 text-xs text-slate-500">{land.barangay || "Location not set"}{mapped ? ` · ${land.latitude}, ${land.longitude}` : " · No coordinates"}</p><div className="mt-3 flex flex-wrap gap-3">{mapUrl && <a href={mapUrl} target="_blank" rel="noreferrer" className="text-xs font-bold text-sky-700">Open map →</a>}{land.ownership_proof_file ? <a href={land.ownership_proof_file} target="_blank" rel="noreferrer" className="text-xs font-bold text-emerald-700">View land title / proof →</a> : <span className="text-xs font-semibold text-red-600">No title proof uploaded</span>}</div></article>; }

function LegacyAdminDashboard({ token, onLogout }) {
  const [farmers, setFarmers] = useState([]); const [error, setError] = useState(""); const [updating, setUpdating] = useState("");
  const load = useCallback(async () => { try { setError(""); const data = await api("/admin/registrations?status=pending", { token }); setFarmers(data.farmers); } catch (err) { setError(err.message); } }, [token]);
  useEffect(() => { load(); }, [load]);
  useRealtimeRefresh(token, load);
  async function decide(id, status) { setUpdating(id); try { await api(`/admin/registrations/${id}`, { token, method: "PATCH", body: JSON.stringify({ status }) }); await load(); } catch (err) { setError(err.message); } finally { setUpdating(""); } }
  return <AppShell role="staff" onLogout={onLogout}><PageHeader eyebrow="Administration" title="Farmer registrations" description="Approve farmers once their identity and farm details have been checked."/>{error && <Notice tone="red">{error}</Notice>}<div className="mt-6 space-y-3">{farmers.map(farmer => <article key={farmer.id} className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm"><b>{farmer.full_name}</b><p className="mt-1 text-sm text-slate-500">{farmer.contact_number} · {farmer.barangay || "No barangay"} · {farmer.land_count} land record(s)</p><div className="mt-4 flex gap-2"><button disabled={updating === farmer.id} className="button !w-auto" onClick={() => decide(farmer.id, "approved")}>Approve</button><button disabled={updating === farmer.id} className="rounded-lg border border-red-200 px-4 py-2 text-sm font-semibold text-red-700" onClick={() => decide(farmer.id, "rejected")}>Reject</button></div></article>)}{!farmers.length && <Empty text="No pending farmer registrations."/>}</div></AppShell>;
}

function ReportsTable({ reports, loading }) { return <section className="mt-6 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><h2 className="font-bold text-slate-900">Latest incoming reports</h2><a href="#review" className="text-sm font-semibold text-emerald-700">Open review queue</a></div>{loading ? <div className="mt-4"><LoadingBlock/></div> : <div className="mt-3 overflow-x-auto"><table className="w-full text-left text-sm"><thead className="border-b text-slate-500"><tr><th className="pb-3">Farmer</th><th className="pb-3">Crop / damage</th><th className="pb-3">Status</th></tr></thead><tbody>{reports.slice(0, 6).map(report => <tr key={report.id} className="border-b last:border-0"><td className="py-3 font-medium">{report.farmer_name}<br/><span className="text-xs font-normal text-slate-400">{report.barangay || "Unknown location"}</span></td><td className="py-3">{report.confirmed_plant || report.ai_detected_plant || "Not specified"}<br/><span className="text-xs text-slate-400">{report.confirmed_damage_type || report.ai_detected_damage_type || "Pending assessment"}</span></td><td className="py-3"><StatusBadge value={report.status}/></td></tr>)}</tbody></table>{!reports.length && <p className="py-4 text-sm text-slate-500">No reports submitted yet.</p>}</div>}</section>; }
function Notice({ children, tone }) { return <p className={`mt-5 rounded-xl p-3 text-sm ${tone === "red" ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-800"}`}>{children}</p>; }
function LoadingBlock() { return <div className="animate-pulse rounded-xl bg-slate-100 p-10 text-center text-sm text-slate-400">Loading dashboard data…</div>; }
function Empty({ text }) { return <p className="rounded-2xl border border-dashed border-slate-200 bg-white p-6 text-center text-sm text-slate-500">{text}</p>; }
