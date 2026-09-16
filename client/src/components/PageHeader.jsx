export default function PageHeader({ eyebrow, title, description, action }) {
  const maoText = value => ({ "System administration": "MAO Staff workspace", "Admin control center": "MAO Staff control center", "Administrator access required": "MAO Staff access required", "Administration": "MAO Staff" }[value] || value);
  return <div className="relative overflow-hidden rounded-3xl border border-emerald-100 bg-gradient-to-br from-white via-white to-emerald-50/80 p-5 shadow-[0_18px_40px_-30px_rgba(6,78,59,.45)] sm:flex sm:flex-row sm:items-end sm:justify-between sm:gap-4 sm:p-7">
    <div className="pointer-events-none absolute -right-12 -top-16 h-40 w-40 rounded-full border border-emerald-200/60"/><div className="pointer-events-none absolute -right-4 -top-7 h-24 w-24 rounded-full bg-lime-100/50"/>
    <div className="relative">
      {eyebrow && <p className="text-xs font-bold uppercase tracking-[0.14em] text-green-700">{maoText(eyebrow)}</p>}
      <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">{maoText(title)}</h1>
      {description && <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">{description.replaceAll("administrator", "authorized MAO Staff").replaceAll("Administrator", "MAO Staff")}</p>}
      <p className="mt-3 inline-flex rounded-full border border-emerald-100 bg-white px-3 py-1.5 text-xs font-medium text-emerald-800 shadow-sm">AgriSystem guide: keep your MAO service records complete and current.</p>
    </div>
    <div className="relative mt-4 shrink-0 sm:mt-0">{action}</div>
  </div>;
}
