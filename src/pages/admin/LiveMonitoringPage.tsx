import { useEffect, useState } from "react";
import { api } from "../../api/client";
import { CrowdBadge } from "../../components/CrowdBadge";
import type { CrowdLevel, LostPersonReport, PredictiveAlert, SOSAlert, Zone } from "../../api/types";

type IncidentRow =
  | { kind: "sos"; id: number; time: string; text: string; status: string }
  | { kind: "lost_person"; id: number; time: string; text: string; status: string };

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
      text: `SOS at (${s.lat.toFixed(4)}, ${s.lng.toFixed(4)})`,
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

  return (
    <div>
      <h1>Live Monitoring</h1>

      <section className="card">
        <h2>Zones &amp; Crowd Levels</h2>
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
      </section>

      <section className="card">
        <h2>Predictive Alerts</h2>
        {alerts.length === 0 ? (
          <p className="muted">No zones are trending toward higher crowd levels right now.</p>
        ) : (
          <ul>
            {alerts.map((a) => (
              <li key={a.zone_id}>
                <strong>{a.zone_name}</strong>: {a.current_level} → likely <strong>{a.forecast_level}</strong> in ~{a.forecast_minutes} min.{" "}
                <span className="muted">{a.note}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card">
        <h2>Incident Log</h2>
        <table>
          <thead>
            <tr>
              <th>Type</th>
              <th>Details</th>
              <th>Status</th>
              <th>Time</th>
            </tr>
          </thead>
          <tbody>
            {incidents.map((i) => (
              <tr key={`${i.kind}-${i.id}`}>
                <td>{i.kind === "sos" ? "SOS" : "Lost person"}</td>
                <td>{i.text}</td>
                <td>{i.status}</td>
                <td>{new Date(i.time).toLocaleString()}</td>
              </tr>
            ))}
            {incidents.length === 0 && (
              <tr>
                <td colSpan={4} className="muted">
                  No incidents reported.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}
