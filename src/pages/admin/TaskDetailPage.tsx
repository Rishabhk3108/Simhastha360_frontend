import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../../api/client";
import { TasksMap, type TaskPoint } from "../../components/TasksMap";
import { STATUS_COLORS, STATUS_LABELS } from "../../utils/taskStatus";
import type { Task, VolunteerOut, Zone } from "../../api/types";

const UPLOADS_BASE = `${api.defaults.baseURL}/uploads`;
const REFRESH_INTERVAL_MS = 10000;

export function TaskDetailPage() {
  const { taskId } = useParams<{ taskId: string }>();
  const navigate = useNavigate();
  const [task, setTask] = useState<Task | null>(null);
  const [zones, setZones] = useState<Zone[]>([]);
  const [volunteers, setVolunteers] = useState<VolunteerOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!taskId) return;
    try {
      const [taskRes, zoneRes, volRes] = await Promise.all([
        api.get<Task>(`/tasks/${taskId}`),
        api.get<Zone[]>("/zones"),
        api.get<VolunteerOut[]>("/volunteers", { params: { status: "approved" } }),
      ]);
      setTask(taskRes.data);
      setZones(zoneRes.data);
      setVolunteers(volRes.data);
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
              initialCenter={{ lat: task.lat!, lng: task.lng! }}
              pickMode={false}
              pendingCenter={null}
              onMapClick={() => {}}
            />
            <div className="muted small" style={{ marginTop: 10 }}>
              <span style={{ color: "#D9762B", fontWeight: 700 }}>● T</span> task location &nbsp;·&nbsp;
              <span style={{ color: "#3E7CB1", fontWeight: 700 }}>● V</span> volunteer's live location
              {volunteerPoints.length === 0 && volunteer && " (not reported yet)"}
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
          <p className="muted">Not yet assigned.</p>
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
