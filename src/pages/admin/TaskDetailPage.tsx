import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../../api/client";
import { TasksMap, type TaskPoint } from "../../components/TasksMap";
import { STATUS_COLORS, STATUS_LABELS } from "../../utils/taskStatus";
import type { IssueReport, RouteResult, Task, TaskSuggestion, VolunteerOut, Zone } from "../../api/types";

const UPLOADS_BASE = `${api.defaults.baseURL}/uploads`;
const REFRESH_INTERVAL_MS = 10000;

export function TaskDetailPage() {
  const { taskId } = useParams<{ taskId: string }>();
  const navigate = useNavigate();
  const [task, setTask] = useState<Task | null>(null);
  const [zones, setZones] = useState<Zone[]>([]);
  const [volunteers, setVolunteers] = useState<VolunteerOut[]>([]);
  const [route, setRoute] = useState<RouteResult | null>(null);
  const [sourceReport, setSourceReport] = useState<IssueReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [busy, setBusy] = useState(false);
  const [suggestions, setSuggestions] = useState<TaskSuggestion[] | null>(null);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [assigningId, setAssigningId] = useState<number | null>(null);

  const load = useCallback(async () => {
    if (!taskId) return;
    try {
      const [taskRes, zoneRes, volRes, reportRes] = await Promise.all([
        api.get<Task>(`/tasks/${taskId}`),
        api.get<Zone[]>("/zones"),
        api.get<VolunteerOut[]>("/volunteers", { params: { status: "approved" } }),
        api.get<IssueReport[]>("/reports/issues", { params: { task_id: taskId } }),
      ]);
      setTask(taskRes.data);
      setZones(zoneRes.data);
      setVolunteers(volRes.data);
      setSourceReport(reportRes.data[0] ?? null);

      if (taskRes.data.assignee_id && taskRes.data.lat != null && taskRes.data.lng != null) {
        try {
          const routeRes = await api.get<RouteResult>(`/tasks/${taskId}/route`);
          setRoute(routeRes.data);
        } catch {
          setRoute(null);
        }
      } else {
        setRoute(null);
      }
    } catch (err: any) {
      if (err.response?.status === 404) setNotFound(true);
    } finally {
      setLoading(false);
    }
  }, [taskId]);

  useEffect(() => {
    load();
    const interval = setInterval(load, REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [load]);

  async function reviewTask(action: "approve" | "reject") {
    if (!task) return;
    let note: string | undefined;
    let rating: number | undefined;
    if (action === "approve") {
      const entered = window.prompt("Rate this volunteer for this task (1-5, optional):");
      if (entered === null) return;
      if (entered.trim()) {
        const parsed = Number(entered);
        if (!Number.isNaN(parsed)) rating = Math.max(1, Math.min(5, parsed));
      }
    } else {
      const entered = window.prompt("What needs to be fixed before this task can be approved?");
      if (entered === null) return;
      note = entered || undefined;
    }
    setBusy(true);
    try {
      await api.patch(`/tasks/${task.id}/review`, { action, note, rating });
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function showSuggestions() {
    if (!task) return;
    setLoadingSuggestions(true);
    try {
      const { data } = await api.get<TaskSuggestion[]>(`/tasks/${task.id}/suggestions`);
      setSuggestions(data);
    } finally {
      setLoadingSuggestions(false);
    }
  }

  async function assign(userId: number) {
    if (!task) return;
    setAssigningId(userId);
    try {
      await api.patch(`/tasks/${task.id}/assign`, { assignee_id: userId });
      setSuggestions(null);
      await load();
    } catch (err: any) {
      window.alert(err.response?.data?.detail ?? "Couldn't assign this task. Please try again.");
    } finally {
      setAssigningId(null);
    }
  }

  if (loading) return <p className="muted">Loading task…</p>;
  if (notFound || !task) {
    return (
      <div>
        <p className="muted">Task not found.</p>
        <button className="secondary" onClick={() => navigate("/admin/tasks")}>
          Back to tasks
        </button>
      </div>
    );
  }

  const volunteer = task.assignee_id != null ? volunteers.find((v) => v.user_id === task.assignee_id) : undefined;
  const zone = zones.find((z) => z.id === task.zone_id);

  const taskPoints: TaskPoint[] = task.lat != null && task.lng != null ? [{ id: task.id, lat: task.lat, lng: task.lng, label: task.description }] : [];
  const volunteerPoints: TaskPoint[] =
    volunteer?.current_lat != null && volunteer.current_lng != null
      ? [{ id: volunteer.user_id, lat: volunteer.current_lat, lng: volunteer.current_lng, label: volunteer.name }]
      : [];

  return (
    <div>
      <button className="secondary" style={{ marginBottom: 16 }} onClick={() => navigate("/admin/tasks")}>
        ← Back to tasks
      </button>

      <h1>{task.description}</h1>
      <p className="muted" style={{ marginTop: -8, marginBottom: 20 }}>
        {zone?.name ?? "No zone"} · {task.priority} priority · {task.points} pts ·{" "}
        <span style={{ color: STATUS_COLORS[task.status], fontWeight: 600 }}>{STATUS_LABELS[task.status]}</span>
      </p>

      <div className="card" style={{ marginBottom: "1.25rem" }}>
        <h2>Location &amp; live tracking</h2>
        {taskPoints.length === 0 ? (
          <p className="muted">No location was set for this task.</p>
        ) : (
          <>
            <TasksMap
              taskPoints={taskPoints}
              volunteerPoints={volunteerPoints}
              routeCoordinates={route?.coordinates}
              initialCenter={{ lat: task.lat!, lng: task.lng! }}
              pickMode={false}
              pendingCenter={null}
              onMapClick={() => {}}
            />
            <div className="muted small" style={{ marginTop: 10 }}>
              <span style={{ color: "#D9762B", fontWeight: 700 }}>● T</span> task location &nbsp;·&nbsp;
              <span style={{ color: "#3E7CB1", fontWeight: 700 }}>● V</span> volunteer's live location
              {volunteerPoints.length === 0 && volunteer && " (not reported yet)"}
              {route && (
                <>
                  {" "}
                  · <span style={{ color: "var(--ink)", fontWeight: 600 }}>{route.distance_km.toFixed(1)} km</span> ·{" "}
                  {Math.round(route.duration_min)} min to reach the task
                </>
              )}
            </div>
          </>
        )}
      </div>

      <div className="card" style={{ marginBottom: "1.25rem" }}>
        <h2>Assigned volunteer</h2>
        {volunteer ? (
          <div style={{ fontSize: 13.5, lineHeight: 1.8 }}>
            <div>
              <strong>Name:</strong> {volunteer.name}
            </div>
            <div>
              <strong>Phone:</strong> {volunteer.phone}
            </div>
            <div>
              <strong>Rating:</strong> {volunteer.rating != null ? `${volunteer.rating.toFixed(1)} ★` : "—"}
            </div>
            <div>
              <strong>Last location update:</strong>{" "}
              {volunteer.location_updated_at ? new Date(volunteer.location_updated_at).toLocaleString() : "Not reported yet"}
            </div>
          </div>
        ) : (
          <>
            <p className="muted">Not yet assigned.</p>
            <button style={{ marginTop: 8 }} disabled={loadingSuggestions} onClick={showSuggestions}>
              {loadingSuggestions && <span className="button-spinner" />}
              Get recommendations
            </button>
          </>
        )}

        {suggestions !== null && !volunteer && (
          <div className="ai-card" style={{ marginTop: 16 }}>
            <div className="ai-card-label">
              <i className="ph-fill ph-sparkle" /> Best-fit volunteers for this task
            </div>
            {suggestions.map((s) => (
              <div
                key={s.user_id}
                style={{ display: "flex", alignItems: "center", gap: 11, background: "rgba(246,241,231,0.10)", borderRadius: 12, padding: 11 }}
              >
                <div
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: "50%",
                    background: "rgba(233,180,92,0.22)",
                    color: "var(--brass)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 12,
                    fontWeight: 700,
                    flexShrink: 0,
                  }}
                >
                  {s.name.slice(0, 2).toUpperCase()}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 500 }}>{s.name}</div>
                  <div style={{ fontSize: 11.5, color: "rgba(246,241,231,0.62)" }}>{s.reasons.join(" · ")}</div>
                </div>
                <div style={{ fontSize: 12, fontWeight: 700, color: "var(--brass)" }}>{s.score.toFixed(1)}</div>
                <button
                  style={{ background: "var(--brass)", color: "var(--ink)" }}
                  disabled={assigningId === s.user_id}
                  onClick={() => assign(s.user_id)}
                >
                  {assigningId === s.user_id && <span className="button-spinner" />}
                  Assign
                </button>
              </div>
            ))}
            {suggestions.length === 0 && <p style={{ color: "rgba(246,241,231,0.7)" }}>No approved, on-duty volunteers available right now.</p>}
            <div className="fine-print">Ranked on skill, zone, proximity, and availability. The final call stays with you.</div>
            <button
              className="secondary"
              style={{ alignSelf: "flex-start", background: "rgba(246,241,231,0.14)", color: "#fffdf8", border: "none" }}
              onClick={() => setSuggestions(null)}
            >
              Close
            </button>
          </div>
        )}
      </div>

      <div className="card">
        <h2>Details</h2>
        <div style={{ fontSize: 13.5, lineHeight: 1.8 }}>
          <div>
            <strong>Created:</strong> {new Date(task.created_at).toLocaleString()}
          </div>
          {task.acknowledged_at && (
            <div>
              <strong>Accepted:</strong> {new Date(task.acknowledged_at).toLocaleString()}
            </div>
          )}
          {task.submitted_at && (
            <div>
              <strong>Photos submitted:</strong> {new Date(task.submitted_at).toLocaleString()}
            </div>
          )}
          {task.completed_at && (
            <div>
              <strong>Completed:</strong> {new Date(task.completed_at).toLocaleString()}
            </div>
          )}
          {task.review_note && (
            <div>
              <strong>Latest note:</strong> {task.review_note}
            </div>
          )}
        </div>
      </div>

      {sourceReport && (
        <div className="card" style={{ marginBottom: "1.25rem" }}>
          <h2>Reported by pilgrim</h2>
          <p className="muted small" style={{ marginTop: -6 }}>
            Submitted {new Date(sourceReport.created_at).toLocaleString()}
          </p>
          {sourceReport.description && <p style={{ fontSize: 13.5 }}>{sourceReport.description}</p>}
          <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
            {sourceReport.photo_doc_ids.map((docId) => (
              <a key={docId} href={`${UPLOADS_BASE}/${docId}`} target="_blank" rel="noreferrer">
                <img
                  src={`${UPLOADS_BASE}/${docId}`}
                  alt="Reported issue"
                  style={{ width: 120, height: 120, objectFit: "cover", borderRadius: 10, border: "1px solid var(--border)" }}
                />
              </a>
            ))}
          </div>
        </div>
      )}

      {task.status === "review" && (
        <div className="card">
          <h2>Completion photos</h2>
          <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 16 }}>
            {task.completion_photo_doc_ids.map((docId) => (
              <a key={docId} href={`${UPLOADS_BASE}/${docId}`} target="_blank" rel="noreferrer">
                <img
                  src={`${UPLOADS_BASE}/${docId}`}
                  alt="Completion"
                  style={{ width: 140, height: 140, objectFit: "cover", borderRadius: 10, border: "1px solid var(--border)" }}
                />
              </a>
            ))}
          </div>
          <div className="row-actions">
            <button style={{ background: "var(--teal)" }} disabled={busy} onClick={() => reviewTask("approve")}>
              {busy && <span className="button-spinner" />}
              Approve &amp; rate
            </button>
            <button className="secondary" disabled={busy} onClick={() => reviewTask("reject")}>
              {busy && <span className="button-spinner" />}
              Reject
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
