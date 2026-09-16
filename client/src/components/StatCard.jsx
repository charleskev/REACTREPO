export default function StatCard({ label, value, tone = "green" }) {
  const tones = { green: "border-emerald-100 bg-emerald-50 text-emerald-900", amber: "border-amber-100 bg-amber-50 text-amber-900", red: "border-red-100 bg-red-50 text-red-900", blue: "border-sky-100 bg-sky-50 text-sky-900" };
  return <div className={`rounded-2xl border p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${tones[tone]}`}><p className="text-sm font-medium opacity-80">{label}</p><p className="mt-1 text-3xl font-extrabold tracking-tight">{value}</p></div>;
}
