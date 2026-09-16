import { CircleMarker, MapContainer, Popup, TileLayer } from "react-leaflet";
import "leaflet/dist/leaflet.css";

export default function ReportMap({ reports = [] }) {
  const validReports = reports.filter(report => Number.isFinite(Number(report.latitude)) && Number.isFinite(Number(report.longitude)));
  const center = validReports.length ? [Number(validReports[0].latitude), Number(validReports[0].longitude)] : [12.8797, 121.774];
  return <div className="h-72 overflow-hidden rounded-xl border border-green-900/10 sm:h-96"><MapContainer center={center} zoom={validReports.length ? 12 : 5} scrollWheelZoom className="h-full w-full"><TileLayer attribution="© OpenStreetMap contributors" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />{validReports.map(report => <CircleMarker key={report.id} center={[Number(report.latitude), Number(report.longitude)]} radius={9} pathOptions={{ color: report.status === "verified" ? "#15803d" : "#d97706", fillOpacity: 0.85 }}><Popup><b>{report.farmer_name}</b><br />{report.confirmed_plant || report.ai_detected_plant || "Crop pending"}<br />{report.confirmed_damage_type || report.ai_detected_damage_type || "Damage pending"}</Popup></CircleMarker>)}</MapContainer></div>;
}
