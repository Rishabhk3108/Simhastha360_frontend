import { useEffect, useRef, useState, type FormEvent } from "react";
import { api } from "../../api/client";
import { useAuth } from "../../auth/AuthContext";
import { CrowdBadge } from "../../components/CrowdBadge";
import { CctvPanel } from "../../components/CctvPanel";
import { ZonesMap, type ZonesMapHandle } from "../../components/ZonesMap";
import type { CrowdLevel, LostPersonReport, PredictiveAlert, SOSAlert, Zone } from "../../api/types";

type IncidentRow =
  | { kind: "sos"; id: number; time: string; text: string; status: string }
  | { kind: "lost_person"; id: number; time: string; text: string; status: string };

const ICONS: Record<IncidentRow["kind"], string> = {
  sos: "ph-fill ph-siren",
  lost_person: "ph-fill ph-user-focus",
};

const UJJAIN_CENTER = { lat: 23.1765, lng: 75.7885 };
const DEFAULT_RADIUS_M = 300;

interface ZoneDraft {
  editingId: number | null;
  name: string;
  center: { lat: number; lng: number } | null;
  radiusM: number;
  crowdLevel: CrowdLevel;
}

const EMPTY_DRAFT: ZoneDraft = { editingId: null, name: "", center: null, radiusM: DEFAULT_RADIUS_M, crowdLevel: "green" };

export function LiveMonitoringPage() {
  const { role } = useAuth();
  const canEdit = role === "admin";
  const [zones, setZones] = useState<Zone[]>([]);
  const [alerts, setAlerts] = useState<PredictiveAlert[]>([]);
  const [incidents, setIncidents] = useState<IncidentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState<ZoneDraft | null>(null);
  const [savingZone, setSavingZone] = useState(false);
  const mapRef = useRef<ZonesMapHandle>(null);
  const mapCardRef = useRef<HTMLDivElement>(null);

  function viewZone(zone: Zone) {
    mapRef.current?.focusOn(zone.center_lat, zone.center_lng);
    mapCardRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

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

  async function deleteZone(zoneId: number) {
    if (!window.confirm("Remove this zone? Pilgrims will stop seeing it on the map.")) return;
    await api.delete(`/zones/${zoneId}`);
    loadAll();
  }

  function startAddZone() {
    setDraft({ ...EMPTY_DRAFT });
  }

  function startEditZone(zone: Zone) {
    setDraft({
      editingId: zone.id,
      name: zone.name,
      center: { lat: zone.center_lat, lng: zone.center_lng },
      radiusM: zone.radius_m,
      crowdLevel: zone.crowd_level,
    });
  }

  function cancelDraft() {
    setDraft(null);
  }

  async function saveDraft(e: FormEvent) {
    e.preventDefault();
    if (!draft || !draft.center) return;
    const payload = {
      name: draft.name,
      center_lat: draft.center.lat,
      center_lng: draft.center.lng,
      radius_m: draft.radiusM,
      crowd_level: draft.crowdLevel,
    };
    setSavingZone(true);
    try {
      if (draft.editingId) {
        await api.patch(`/zones/${draft.editingId}`, payload);
      } else {
        await api.post("/zones", payload);
      }
      setDraft(null);
      await loadAll();
    } finally {
      setSavingZone(false);
    }
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

      <CctvPanel />

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

      <div className="card" style={{ marginBottom: "1.25rem" }} ref={mapCardRef}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <h2 style={{ margin: 0 }}>Zone map</h2>
          {canEdit && !draft && (
            <button type="button" onClick={startAddZone}>
              + Mark a zone
            </button>
          )}
        </div>

        <ZonesMap
          ref={mapRef}
          zones={zones}
          initialCenter={UJJAIN_CENTER}
          pickMode={draft !== null}
          pendingCenter={draft?.center ?? null}
          pendingRadiusM={draft?.radiusM ?? DEFAULT_RADIUS_M}
          pendingCrowdLevel={draft?.crowdLevel ?? "green"}
          onMapClick={(lat, lng) => setDraft((d) => (d ? { ...d, center: { lat, lng } } : d))}
        />

        {canEdit && draft && (
          <form className="inline-form" onSubmit={saveDraft} style={{ marginTop: 16, flexWrap: "wrap" }}>
            <input
              placeholder="Zone name (e.g. Ram Ghat)"
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              required
              style={{ flex: 1, minWidth: 180 }}
            />
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
              Radius: {draft.radiusM} m
              <input
                type="range"
                min={100}
                max={2000}
                step={50}
                value={draft.radiusM}
                onChange={(e) => setDraft({ ...draft, radiusM: parseInt(e.target.value, 10) })}
                style={{ width: 160 }}
              />
            </label>
            <select value={draft.crowdLevel} onChange={(e) => setDraft({ ...draft, crowdLevel: e.target.value as CrowdLevel })}>
              <option value="green">green</option>
              <option value="yellow">yellow</option>
              <option value="red">red</option>
            </select>
            <button type="submit" disabled={!draft.center || savingZone}>
              {savingZone && <span className="button-spinner" />}
              {draft.editingId ? "Save changes" : "Save zone"}
            </button>
            <button type="button" className="secondary" onClick={cancelDraft}>
              Cancel
            </button>
            {!draft.center && <span className="muted" style={{ width: "100%" }}>Click the map above to place the zone center.</span>}
          </form>
        )}
      </div>

      <div className="card">
        <h2>Zones &amp; crowd levels</h2>
        <table>
          <thead>
            <tr>
              <th>Zone</th>
              <th>Radius</th>
              <th>Crowd level</th>
              {canEdit && <th>Set level</th>}
              <th>View</th>
              {canEdit && <th></th>}
            </tr>
          </thead>
          <tbody>
            {zones.map((z) => (
              <tr key={z.id}>
                <td>{z.name}</td>
                <td>{z.radius_m} m</td>
                <td>
                  <CrowdBadge level={z.crowd_level} />
                </td>
                {canEdit && (
                  <td>
                    <select value={z.crowd_level} onChange={(e) => updateCrowdLevel(z.id, e.target.value as CrowdLevel)}>
                      <option value="green">green</option>
                      <option value="yellow">yellow</option>
                      <option value="red">red</option>
                    </select>
                  </td>
                )}
                <td>
                  <button type="button" className="secondary" onClick={() => viewZone(z)}>
                    View
                  </button>
                </td>
                {canEdit && (
                  <td style={{ display: "flex", gap: 8 }}>
                    <button type="button" className="secondary" onClick={() => startEditZone(z)}>
                      Edit
                    </button>
                    <button type="button" className="secondary" onClick={() => deleteZone(z.id)}>
                      Delete
                    </button>
                  </td>
                )}
              </tr>
            ))}
            {zones.length === 0 && (
              <tr>
                <td colSpan={canEdit ? 6 : 4} className="muted">
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
