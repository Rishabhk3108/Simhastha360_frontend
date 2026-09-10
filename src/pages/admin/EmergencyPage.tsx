import { useEffect, useState } from "react";
import { api } from "../../api/client";
import { TasksMap, type TaskPoint } from "../../components/TasksMap";
import type { FieldTeamMember, RouteResult, SOSAlert, SOSStatus, VolunteerOut } from "../../api/types";

const POLL_INTERVAL_MS = 7000;

const STATUS_LABELS: Record<SOSStatus, string> = {
  pending: "Awaiting a responder",
  assigned: "Assigned — awaiting acknowledgment",
  responding: "Responder en route",
  resolved: "Resolved",
};

const STATUS_COLORS: Record<SOSStatus, string> = {
  pending: "var(--red-deep)",
  assigned: "var(--saffron-deep)",
  responding: "var(--teal)",
  resolved: "var(--green)",
};

interface Responder {
  id: number;
  name: string;
  kind: "volunteer" | "field_team";
}

export function EmergencyPage() {
  const [alerts, setAlerts] = useState<SOSAlert[]>([]);
  const [responders, setResponders] = useState<Responder[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [reassignChoice, setReassignChoice] = useState<Record<number, string>>({});
  const [routes, setRoutes] = useState<Record<number, RouteResult | null>>({});

  async function load() {
    const [sosRes, volRes, fieldRes] = await Promise.all([
      api.get<SOSAlert[]>("/sos"),
      api.get<VolunteerOut[]>("/volunteers", { params: { status: "approved", on_duty: true } }),
      api.get<FieldTeamMember[]>("/field-team"),
    ]);
    setAlerts(sosRes.data);
    setResponders([
      ...volRes.data.filter((v) => v.accepts_emergencies).map((v) => ({ id: v.user_id, name: v.name, kind: "volunteer" as const })),
      ...fieldRes.data.map((f) => ({ id: f.id, name: f.name, kind: "field_team" as const })),
    ]);
    setLoading(false);

    const active = sosRes.data.filter((a) => a.status !== "resolved" && a.assigned_responder_id);
    const routeEntries = await Promise.all(
      active.map(async (a) => {
        try {
          const { data } = await api.get<RouteResult>(`/sos/${a.id}/route`);
          return [a.id, data] as const;
        } catch {
          return [a.id, null] as const;
        }
      }),
    );
    setRoutes(Object.fromEntries(routeEntries));
  }

  useEffect(() => {
    load();
    const interval = setInterval(load, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  function responderName(id: number | null): string {
    if (id == null) return "Unassigned";
    return responders.find((r) => r.id === id)?.name ?? `#${id}`;
  }

  async function resolve(id: number) {
    setBusyId(id);
    try {
      await api.patch(`/sos/${id}/resolve`);
      await load();
    } finally {
      setBusyId(null);
    }
  }

  async function reassign(id: number) {
    const choice = reassignChoice[id];
    if (!choice) return;
    setBusyId(id);
    try {
      await api.patch(`/sos/${id}/reassign`, { responder_id: parseInt(choice, 10) });
      await load();
    } finally {
      setBusyId(null);
    }
  }

  const active = alerts.filter((a) => a.status !== "resolved");
  const resolved = alerts.filter((a) => a.status === "resolved").slice(0, 10);

  return (
    <div>
      <h1>Emergency (SOS)</h1>
      <p className="muted" style={{ marginTop: -8, marginBottom: 20 }}>
        Refreshes every {POLL_INTERVAL_MS / 1000}s. Nothing here should ever be missed.
      </p>

      {loading && <p className="muted">Loading…</p>}

      {!loading && active.length === 0 && (
        <div className="card">
          <p className="muted">No active emergencies right now.</p>
        </div>
      )}

      {active.map((a) => {
        const route = routes[a.id];
        const taskPoints: TaskPoint[] = [{ id: a.id, lat: a.lat, lng: a.lng, label: "SOS" }];
        const volunteerPoints: TaskPoint[] = route
          ? [{ id: `responder-${a.id}`, lat: route.coordinates[0].lat, lng: route.coordinates[0].lng, label: responderName(a.assigned_responder_id) }]
          : [];

        return (
          <div key={a.id} className="card" style={{ marginBottom: 16, borderLeft: `5px solid ${STATUS_COLORS[a.status]}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 10 }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 15, color: STATUS_COLORS[a.status] }}>{STATUS_LABELS[a.status]}</div>
                <div className="muted small" style={{ marginTop: 2 }}>
                  Reported {new Date(a.created_at).toLocaleString()} · Responder: {responderName(a.assigned_responder_id)}
                  {a.escalated && " · ⚠ reassigned after no response"}
                </div>
              </div>
              <div className="row-actions">
                <select
                  value={reassignChoice[a.id] ?? ""}
                  onChange={(e) => setReassignChoice((r) => ({ ...r, [a.id]: e.target.value }))}
                >
                  <option value="">Reassign to…</option>
                  {responders.map((r) => (
                    <option key={`${r.kind}-${r.id}`} value={r.id}>
                      {r.name} ({r.kind === "field_team" ? "field team" : "volunteer"})
                    </option>
                  ))}
                </select>
                <button className="secondary" disabled={busyId === a.id || !reassignChoice[a.id]} onClick={() => reassign(a.id)}>
                  {busyId === a.id && <span className="button-spinner" />}
                  Reassign
                </button>
                <button style={{ background: "var(--teal)" }} disabled={busyId === a.id} onClick={() => resolve(a.id)}>
                  {busyId === a.id && <span className="button-spinner" />}
                  Resolve
                </button>
              </div>
            </div>

            <TasksMap
              taskPoints={taskPoints}
              volunteerPoints={volunteerPoints}
              routeCoordinates={route?.coordinates}
              initialCenter={{ lat: a.lat, lng: a.lng }}
              pickMode={false}
              pendingCenter={null}
              onMapClick={() => {}}
            />
            <div className="muted small" style={{ marginTop: 10 }}>
              <span style={{ color: "#D9762B", fontWeight: 700 }}>● pin</span> pilgrim's location &nbsp;·&nbsp;
              <span style={{ color: "#3E7CB1", fontWeight: 700 }}>● pin</span> responder's live location
              {route && (
                <>
                  {" "}
                  · {route.distance_km.toFixed(1)} km · ~{Math.round(route.duration_min)} min away
                </>
              )}
            </div>
          </div>
        );
      })}

      {resolved.length > 0 && (
        <div className="card">
          <h2>Recently resolved</h2>
          <table>
            <thead>
              <tr>
                <th>Reported</th>
                <th>Responder</th>
                <th>Resolved</th>
              </tr>
            </thead>
            <tbody>
              {resolved.map((a) => (
                <tr key={a.id}>
                  <td>{new Date(a.created_at).toLocaleString()}</td>
                  <td>{responderName(a.assigned_responder_id)}</td>
                  <td>{a.resolved_at ? new Date(a.resolved_at).toLocaleString() : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
