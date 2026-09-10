import { useEffect, useRef, useState, type FormEvent, type MouseEvent } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../../api/client";
import { TasksMap, type TaskPoint, type TasksMapHandle } from "../../components/TasksMap";
import { STATUS_COLORS, STATUS_LABELS } from "../../utils/taskStatus";
import type { Task, TaskPriority, TaskStatus, TaskSuggestion, VolunteerOut, Zone } from "../../api/types";

const PRIORITIES: TaskPriority[] = ["low", "medium", "high"];
const PRIORITY_COLOR: Record<TaskPriority, string> = { low: "var(--green)", medium: "var(--yellow)", high: "var(--red)" };
const UJJAIN_CENTER = { lat: 23.1765, lng: 75.7885 };
const ACTIVE_STATUSES = new Set(["assigned", "acknowledged"]);

const STATUS_FILTERS: { label: string; value: TaskStatus | "all" }[] = [
  { label: "All", value: "all" },
  { label: "Unassigned", value: "unassigned" },
  { label: "Assigned", value: "assigned" },
  { label: "In progress", value: "acknowledged" },
  { label: "In review", value: "review" },
  { label: "Completed", value: "complete" },
];

export function TasksPage() {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [volunteers, setVolunteers] = useState<VolunteerOut[]>([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<TaskPriority>("medium");
  const [zoneId, setZoneId] = useState("");
  const [points, setPoints] = useState("10");
  const [pendingCenter, setPendingCenter] = useState<{ lat: number; lng: number } | null>(null);
  const [pickingLocation, setPickingLocation] = useState(false);
  const [creating, setCreating] = useState(false);
  const [suggestionsFor, setSuggestionsFor] = useState<number | null>(null);
  const [suggestions, setSuggestions] = useState<TaskSuggestion[]>([]);
  const [loadingSuggestionsFor, setLoadingSuggestionsFor] = useState<number | null>(null);
  const [assigningId, setAssigningId] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState<TaskStatus | "all">("all");
  const mapRef = useRef<TasksMapHandle>(null);

  async function load() {
    const [taskRes, zoneRes, volRes] = await Promise.all([
      api.get<Task[]>("/tasks"),
      api.get<Zone[]>("/zones"),
      api.get<VolunteerOut[]>("/volunteers", { params: { status: "approved" } }),
    ]);
    setTasks(taskRes.data);
    setZones(zoneRes.data);
    setVolunteers(volRes.data);
    setPageLoading(false);
  }

  useEffect(() => {
    load();
    const interval = setInterval(load, 15000);
    return () => clearInterval(interval);
  }, []);

  function volunteerFor(userId: number | null): VolunteerOut | undefined {
    if (userId == null) return undefined;
    return volunteers.find((v) => v.user_id === userId);
  }

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setCreating(true);
    try {
      await api.post("/tasks", {
        description,
        priority,
        zone_id: zoneId ? parseInt(zoneId, 10) : null,
        points: points ? parseInt(points, 10) : 0,
        lat: pendingCenter?.lat ?? null,
        lng: pendingCenter?.lng ?? null,
      });
      setDescription("");
      setZoneId("");
      setPoints("10");
      setPendingCenter(null);
      setPickingLocation(false);
      await load();
    } finally {
      setCreating(false);
    }
  }

  async function showSuggestions(taskId: number) {
    setLoadingSuggestionsFor(taskId);
    try {
      const { data } = await api.get<TaskSuggestion[]>(`/tasks/${taskId}/suggestions`);
      setSuggestions(data);
      setSuggestionsFor(taskId);
    } finally {
      setLoadingSuggestionsFor(null);
    }
  }

  async function assign(taskId: number, userId: number) {
    setAssigningId(userId);
    try {
      await api.patch(`/tasks/${taskId}/assign`, { assignee_id: userId });
      setSuggestionsFor(null);
      await load();
    } catch (err: any) {
      window.alert(err.response?.data?.detail ?? "Couldn't assign this task. Please try again.");
    } finally {
      setAssigningId(null);
    }
  }

  function stop(e: MouseEvent) {
    e.stopPropagation();
  }

  const reviewTasks = tasks.filter((t) => t.status === "review");
  const activeTasks = tasks.filter((t) => ACTIVE_STATUSES.has(t.status));

  const taskPoints: TaskPoint[] = activeTasks
    .filter((t) => t.lat != null && t.lng != null)
    .map((t) => ({ id: t.id, lat: t.lat!, lng: t.lng!, label: t.description }));
  const volunteerPoints: TaskPoint[] = activeTasks
    .map((t) => volunteerFor(t.assignee_id))
    .filter((v): v is VolunteerOut => !!v && v.current_lat != null && v.current_lng != null)
    .map((v) => ({ id: v.user_id, lat: v.current_lat!, lng: v.current_lng!, label: v.name }));

  return (
    <div>
      <h1>Tasks</h1>
      <p className="muted" style={{ marginTop: -8, marginBottom: 20 }}>
        Create tasks and let AI suggest the best-fit volunteer — you make the final call. Click any task to open its detail page.
      </p>

      <div className="card">
        <h2>Create task</h2>
        <form className="inline-form" onSubmit={handleCreate} style={{ flexWrap: "wrap" }}>
          <input
            placeholder="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
            style={{ flex: 1, minWidth: 220 }}
          />
          <select value={priority} onChange={(e) => setPriority(e.target.value as TaskPriority)}>
            {PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
          <select value={zoneId} onChange={(e) => setZoneId(e.target.value)}>
            <option value="">No zone</option>
            {zones.map((z) => (
              <option key={z.id} value={z.id}>
                {z.name}
              </option>
            ))}
          </select>
          <input
            type="number"
            min={0}
            placeholder="Points"
            value={points}
            onChange={(e) => setPoints(e.target.value)}
            style={{ width: 90 }}
          />
          <button type="button" className="secondary" onClick={() => setPickingLocation((p) => !p)}>
            {pickingLocation ? "Stop picking" : pendingCenter ? "Change location" : "Pick location on map"}
          </button>
          <button type="submit" disabled={creating}>
            {creating && <span className="button-spinner" />}
            Create
          </button>
          {pendingCenter && (
            <span className="muted small" style={{ width: "100%" }}>
              Location: {pendingCenter.lat.toFixed(4)}, {pendingCenter.lng.toFixed(4)}
            </span>
          )}
        </form>
      </div>

      <div className="card">
        <h2>Task &amp; volunteer map</h2>
        <TasksMap
          ref={mapRef}
          taskPoints={taskPoints}
          volunteerPoints={volunteerPoints}
          initialCenter={UJJAIN_CENTER}
          pickMode={pickingLocation}
          pendingCenter={pendingCenter}
          onMapClick={(lat, lng) => {
            setPendingCenter({ lat, lng });
          }}
        />
        <div className="muted small" style={{ marginTop: 10 }}>
          <span style={{ color: "#D9762B", fontWeight: 700 }}>● T</span> task location &nbsp;·&nbsp;
          <span style={{ color: "#3E7CB1", fontWeight: 700 }}>● V</span> assigned volunteer's live location
        </div>
      </div>

      {pageLoading && <p className="muted">Loading tasks…</p>}

      {!pageLoading && activeTasks.length > 0 && (
        <div className="card">
          <h2>Active tasks</h2>
          {activeTasks.map((t) => {
            const v = volunteerFor(t.assignee_id);
            return (
              <div
                key={t.id}
                onClick={() => navigate(`/admin/tasks/${t.id}`)}
                style={{
                  cursor: "pointer",
                  borderLeft: `4px solid ${PRIORITY_COLOR[t.priority]}`,
                  borderRadius: 12,
                  background: "var(--surface-tint)",
                  padding: 16,
                  marginBottom: 10,
                }}
              >
                <div style={{ fontWeight: 500, color: "var(--ink)" }}>{t.description}</div>
                <div className="muted small" style={{ marginTop: 4 }}>
                  {t.points} pts · <span style={{ color: STATUS_COLORS[t.status], fontWeight: 600 }}>{STATUS_LABELS[t.status]}</span> ·
                  assigned to {v ? v.name : `#${t.assignee_id}`}
                  {v?.current_lat != null && (
                    <> · last seen {v.location_updated_at ? new Date(v.location_updated_at).toLocaleTimeString() : ""}</>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!pageLoading && reviewTasks.length > 0 && (
        <div className="card">
          <h2>Tasks awaiting review</h2>
          {reviewTasks.map((t) => {
            const v = volunteerFor(t.assignee_id);
            return (
              <div
                key={t.id}
                onClick={() => navigate(`/admin/tasks/${t.id}`)}
                style={{
                  cursor: "pointer",
                  borderRadius: 12,
                  background: "var(--surface-tint)",
                  padding: 16,
                  marginBottom: 10,
                }}
              >
                <div style={{ fontWeight: 500, color: "var(--ink)" }}>{t.description}</div>
                <div className="muted small" style={{ marginTop: 4 }}>
                  {t.points} pts · submitted by {v ? v.name : `#${t.assignee_id}`}
                  {t.submitted_at && ` · ${new Date(t.submitted_at).toLocaleString()}`} · {t.completion_photo_doc_ids.length} photos ·
                  click to review
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!pageLoading && (
        <div className="card">
          <h2>All tasks</h2>
          <div className="pill-tabs" style={{ marginBottom: 16 }}>
            {STATUS_FILTERS.map((f) => (
              <button
                key={f.value}
                className={`pill-tab ${statusFilter === f.value ? "active" : ""}`}
                onClick={() => setStatusFilter(f.value)}
              >
                {f.label}
              </button>
            ))}
          </div>
          {tasks
            .filter((t) => statusFilter === "all" || t.status === statusFilter)
            .map((t) => (
              <div
                key={t.id}
                onClick={() => navigate(`/admin/tasks/${t.id}`)}
                style={{
                  cursor: "pointer",
                  borderLeft: `4px solid ${PRIORITY_COLOR[t.priority]}`,
                  borderRadius: 12,
                  background: "var(--surface-tint)",
                  padding: 16,
                  marginBottom: 10,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                  <div style={{ flex: 1, minWidth: 220 }}>
                    <div style={{ fontWeight: 500, color: "var(--ink)" }}>{t.description}</div>
                    <div className="muted small" style={{ marginTop: 4 }}>
                      {zones.find((z) => z.id === t.zone_id)?.name ?? "No zone"} · {t.priority} priority · {t.points} pts ·{" "}
                      <span style={{ color: STATUS_COLORS[t.status], fontWeight: 600 }}>{STATUS_LABELS[t.status]}</span>
                      {t.assignee_id ? ` · assigned to ${volunteerFor(t.assignee_id)?.name ?? `#${t.assignee_id}`}` : ""}
                    </div>
                  </div>
                  {t.status === "unassigned" && (
                    <button
                      className="secondary"
                      disabled={loadingSuggestionsFor === t.id}
                      onClick={(e) => {
                        stop(e);
                        showSuggestions(t.id);
                      }}
                    >
                      {loadingSuggestionsFor === t.id && <span className="button-spinner" />}
                      Suggest volunteers
                    </button>
                  )}
                </div>
              </div>
            ))}
          {tasks.filter((t) => statusFilter === "all" || t.status === statusFilter).length === 0 && (
            <p className="muted">No tasks match this filter.</p>
          )}
        </div>
      )}

      {suggestionsFor !== null && (
        <div className="ai-card">
          <div className="ai-card-label">
            <i className="ph-fill ph-sparkle" /> Best-fit volunteers for task #{suggestionsFor}
          </div>
          {suggestions.map((s) => (
            <div key={s.user_id} style={{ display: "flex", alignItems: "center", gap: 11, background: "rgba(246,241,231,0.10)", borderRadius: 12, padding: 11 }}>
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
                onClick={() => assign(suggestionsFor, s.user_id)}
              >
                {assigningId === s.user_id && <span className="button-spinner" />}
                Assign
              </button>
            </div>
          ))}
          {suggestions.length === 0 && <p style={{ color: "rgba(246,241,231,0.7)" }}>No approved, on-duty volunteers available right now.</p>}
          <div className="fine-print">Ranked on skill, zone, proximity, and availability. The final call stays with you.</div>
          <button className="secondary" style={{ alignSelf: "flex-start", background: "rgba(246,241,231,0.14)", color: "#fffdf8", border: "none" }} onClick={() => setSuggestionsFor(null)}>
            Close
          </button>
        </div>
      )}
    </div>
  );
}
