import { useEffect, useState } from "react";
import { api } from "../../api/client";
import { CrowdBadge } from "../../components/CrowdBadge";
import type { CrowdLevel, LostPersonReport, PredictiveAlert, SOSAlert, Zone } from "../../api/types";

type IncidentRow =
  | { kind: "sos"; id: number; time: string; text: string; status: string }
  | { kind: "lost_person"; id: number; time: string; text: string; status: string };

const ICONS: Record<IncidentRow["kind"], string> = {
  sos: "ph-fill ph-siren",
  lost_person: "ph-fill ph-user-focus",
};

export function LiveMonitoringPage() {
  const [zones, setZones] = useState<Zone[]>([]);
  const [alerts, setAlerts] = useState<PredictiveAlert[]>([]);
  const [incidents, setIncidents] = useState<IncidentRow[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadAll() {
    const [zonesRes, alertsRes, sosRes, lostRes] = await Promise.all([
      api.get<Zone[]>("/zones"),
      api.get<PredictiveAlert[]>("/ai/predictive-alerts"),
      api.get<SOSAlert[]>("/sos"),
      api.get<LostPersonReport[]>("/lost-person"),
    ]);
    setZones(zonesRes.data);
    setAlerts(alertsRes.data);

    const sosRows: IncidentRow[] = sosRes.data.map((s) => ({
      kind: "sos",
      id: s.id,
      time: s.created_at,
      text: `SOS at (${s.lat.toFixed(4)}, ${s.lng.toFixed(4)}) — ${s.status}`,
      status: s.status,
    }));
    const lostRows: IncidentRow[] = lostRes.data.map((l) => ({
      kind: "lost_person",
      id: l.id,
      time: l.created_at,
      text: `Lost person report: ${l.subject_name}`,
      status: l.status,
    }));
    setIncidents([...sosRows, ...lostRows].sort((a, b) => (a.time < b.time ? 1 : -1)));
    setLoading(false);
  }

  useEffect(() => {
    loadAll();
    const interval = setInterval(loadAll, 15000);
    return () => clearInterval(interval);
  }, []);

  async function updateCrowdLevel(zoneId: number, level: CrowdLevel) {
    await api.patch(`/zones/${zoneId}/crowd-level`, { crowd_level: level });
    loadAll();
  }

  if (loading) return <p>Loading live monitoring...</p>;

  const activeSos = incidents.filter((i) => i.kind === "sos" && i.status !== "resolved").length;
  const redZones = zones.filter((z) => z.crowd_level === "red").length;

  return (
    <div>
      <h1>Live monitoring</h1>
      <p className="muted" style={{ marginTop: -8, marginBottom: 20 }}>
        Data refreshes every 15 seconds.
      </p>

      <div className="stat-grid">
        <div className="stat-tile">
          <div className="stat-label">Zones tracked</div>
          <div className="stat-value">{zones.length}</div>
        </div>
        <div className="stat-tile">
          <div className="stat-label">Zones at red</div>
          <div className="stat-value" style={{ color: redZones > 0 ? "var(--red-deep)" : "var(--ink)" }}>
            {redZones} / {zones.length || 0}
          </div>
        </div>
        <div className="stat-tile">
          <div className="stat-label">Active SOS</div>
          <div className="stat-value" style={{ color: activeSos > 0 ? "var(--red-deep)" : "var(--ink)" }}>
            {activeSos}
          </div>
        </div>
        <div className="stat-tile">
          <div className="stat-label">Incidents logged</div>
          <div className="stat-value">{incidents.length}</div>
        </div>
      </div>

      <div className="map-placeholder" style={{ marginBottom: "1.25rem" }}>
        <span className="map-placeholder-note">
          <i className="ph ph-map-trifold" /> Map view — Mappls SDK integration point
        </span>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {zones.map((z) => (
            <span key={z.id} className="zone-pill">
              <span className={`dot dot-${z.crowd_level}`} />
              {z.name} · {z.crowd_level}
            </span>
          ))}
          {zones.length === 0 && <span className="muted">No zones yet — add one to see it here.</span>}
        </div>
      </div>

      {alerts.length > 0 && (
        <div className="ai-card">
          <div className="ai-card-label">
            <i className="ph-fill ph-sparkle" /> AI predictive alert
          </div>
          {alerts.map((a) => (
            <p key={a.zone_id}>
              <strong>{a.zone_name}</strong>: {a.current_level} → likely <strong>{a.forecast_level}</strong> in ~{a.forecast_minutes} min. {a.note}
            </p>
          ))}
          <div className="fine-print">Forecast model · prototype over recent report velocity. AI recommends, you decide.</div>
        </div>
      )}

      <div className="card">
        <h2>Zones &amp; crowd levels</h2>
        <table>
          <thead>
            <tr>
              <th>Zone</th>
              <th>Crowd level</th>
              <th>Set level</th>
            </tr>
          </thead>
          <tbody>
            {zones.map((z) => (
              <tr key={z.id}>
                <td>{z.name}</td>
                <td>
                  <CrowdBadge level={z.crowd_level} />
                </td>
                <td>
                  <select value={z.crowd_level} onChange={(e) => updateCrowdLevel(z.id, e.target.value as CrowdLevel)}>
                    <option value="green">green</option>
                    <option value="yellow">yellow</option>
                    <option value="red">red</option>
                  </select>
                </td>
              </tr>
            ))}
            {zones.length === 0 && (
              <tr>
                <td colSpan={3} className="muted">
                  No zones yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="card">
        <h2>Incident feed</h2>
        {incidents.map((i) => (
          <div key={`${i.kind}-${i.id}`} className={`incident-row ${i.status !== "resolved" && i.status !== "matched" ? "severe" : ""}`}>
            <i className={ICONS[i.kind]} style={{ color: i.kind === "sos" ? "var(--red)" : "var(--saffron-deep)" }} />
            <div style={{ flex: 1 }}>
              <div className="incident-title">{i.text}</div>
              <div className="incident-sub">{new Date(i.time).toLocaleString()}</div>
            </div>
          </div>
        ))}
        {incidents.length === 0 && <p className="muted">No incidents reported.</p>}
      </div>
    </div>
  );
}
