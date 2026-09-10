import { useEffect, useRef, useState, type FormEvent } from "react";
import { api } from "../../api/client";
import { TasksMap, type TaskPoint, type TasksMapHandle } from "../../components/TasksMap";
import type { Task, TaskPriority, TaskSuggestion, VolunteerOut, Zone } from "../../api/types";

const PRIORITIES: TaskPriority[] = ["low", "medium", "high"];
const PRIORITY_COLOR: Record<TaskPriority, string> = { low: "var(--green)", medium: "var(--yellow)", high: "var(--red)" };
const UJJAIN_CENTER = { lat: 23.1765, lng: 75.7885 };
const UPLOADS_BASE = `${api.defaults.baseURL}/uploads`;
const ACTIVE_STATUSES = new Set(["acknowledged", "in_progress"]);

export function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [volunteers, setVolunteers] = useState<VolunteerOut[]>([]);
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<TaskPriority>("medium");
  const [zoneId, setZoneId] = useState("");
  const [points, setPoints] = useState("10");
  const [pendingCenter, setPendingCenter] = useState<{ lat: number; lng: number } | null>(null);
  const [pickingLocation, setPickingLocation] = useState(false);
  const [suggestionsFor, setSuggestionsFor] = useState<number | null>(null);
  const [suggestions, setSuggestions] = useState<TaskSuggestion[]>([]);
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
    load();
  }

  async function showSuggestions(taskId: number) {
    const { data } = await api.get<TaskSuggestion[]>(`/tasks/${taskId}/suggestions`);
    setSuggestions(data);
    setSuggestionsFor(taskId);
  }

  async function assign(taskId: number, userId: number) {
    await api.patch(`/tasks/${taskId}/assign`, { assignee_id: userId });
    setSuggestionsFor(null);
    load();
  }

  async function reviewTask(taskId: number, action: "approve" | "reject") {
    let note: string | undefined;
    if (action === "reject") {
      const entered = window.prompt("What needs to be fixed before this task can be approved?");
      if (entered === null) return;
      note = entered || undefined;
    }
    await api.patch(`/tasks/${taskId}/review`, { action, note });
    load();
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
        Create tasks and let AI suggest the best-fit volunteer — you make the final call.
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
          <button
            type="button"
            className="secondary"
            onClick={() => setPickingLocation((p) => !p)}
          >
            {pickingLocation ? "Stop picking" : pendingCenter ? "Change location" : "Pick location on map"}
          </button>
          <button type="submit">Create</button>
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

      {activeTasks.length > 0 && (
        <div className="card">
          <h2>Active tasks</h2>
          {activeTasks.map((t) => {
            const v = volunteerFor(t.assignee_id);
            return (
              <div
                key={t.id}
                style={{
                  borderLeft: `4px solid ${PRIORITY_COLOR[t.priority]}`,
                  borderRadius: 12,
                  background: "var(--surface-tint)",
                  padding: 16,
                  marginBottom: 10,
                }}
              >
                <div style={{ fontWeight: 500, color: "var(--ink)" }}>{t.description}</div>
                <div className="muted small" style={{ marginTop: 4 }}>
                  {t.points} pts · {t.status.replace("_", " ")} · assigned to {v ? v.name : `#${t.assignee_id}`}
                  {v?.current_lat != null && (
                    <> · last seen {v.location_updated_at ? new Date(v.location_updated_at).toLocaleTimeString() : ""}</>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {reviewTasks.length > 0 && (
        <div className="card">
          <h2>Tasks awaiting review</h2>
          {reviewTasks.map((t) => {
            const v = volunteerFor(t.assignee_id);
            return (
              <div
                key={t.id}
                style={{
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
                      {t.points} pts · submitted by {v ? v.name : `#${t.assignee_id}`}
                      {t.submitted_at && ` · ${new Date(t.submitted_at).toLocaleString()}`}
                    </div>
                  </div>
                  <div className="row-actions">
                    <button style={{ background: "var(--teal)" }} onClick={() => reviewTask(t.id, "approve")}>
                      Approve
                    </button>
                    <button className="secondary" onClick={() => reviewTask(t.id, "reject")}>
                      Reject
                    </button>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 14, marginTop: 12, flexWrap: "wrap" }}>
                  {t.completion_photo_doc_ids.map((docId) => (
                    <a key={docId} href={`${UPLOADS_BASE}/${docId}`} target="_blank" rel="noreferrer">
                      <img
                        src={`${UPLOADS_BASE}/${docId}`}
                        alt="Completion photo"
                        style={{ width: 120, height: 120, objectFit: "cover", borderRadius: 10, border: "1px solid var(--border)" }}
                      />
                    </a>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="card">
        <h2>All tasks</h2>
        {tasks.map((t) => (
          <div
            key={t.id}
            style={{
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
                  {t.status.replace("_", " ")}
                  {t.assignee_id ? ` · assigned to ${volunteerFor(t.assignee_id)?.name ?? `#${t.assignee_id}`}` : " · unassigned"}
                </div>
              </div>
              {t.status === "unassigned" && (
                <button className="secondary" onClick={() => showSuggestions(t.id)}>
                  Suggest volunteers
                </button>
              )}
            </div>
          </div>
        ))}
        {tasks.length === 0 && <p className="muted">No tasks yet.</p>}
      </div>

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
              <button style={{ background: "var(--brass)", color: "var(--ink)" }} onClick={() => assign(suggestionsFor, s.user_id)}>
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
