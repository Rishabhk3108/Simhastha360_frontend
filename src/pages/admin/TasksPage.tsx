import { useEffect, useState, type FormEvent } from "react";
import { api } from "../../api/client";
import type { Task, TaskPriority, TaskSuggestion, Zone } from "../../api/types";

const PRIORITIES: TaskPriority[] = ["low", "medium", "high"];
const PRIORITY_COLOR: Record<TaskPriority, string> = { low: "var(--green)", medium: "var(--yellow)", high: "var(--red)" };

export function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<TaskPriority>("medium");
  const [zoneId, setZoneId] = useState("");
  const [suggestionsFor, setSuggestionsFor] = useState<number | null>(null);
  const [suggestions, setSuggestions] = useState<TaskSuggestion[]>([]);

  async function load() {
    const [taskRes, zoneRes] = await Promise.all([api.get<Task[]>("/tasks"), api.get<Zone[]>("/zones")]);
    setTasks(taskRes.data);
    setZones(zoneRes.data);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    await api.post("/tasks", { description, priority, zone_id: zoneId ? parseInt(zoneId, 10) : null });
    setDescription("");
    setZoneId("");
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

  return (
    <div>
      <h1>Tasks</h1>
      <p className="muted" style={{ marginTop: -8, marginBottom: 20 }}>
        Create tasks and let AI suggest the best-fit volunteer — you make the final call.
      </p>

      <div className="card">
        <h2>Create task</h2>
        <form className="inline-form" onSubmit={handleCreate}>
          <input placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)} required style={{ flex: 1, minWidth: 220 }} />
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
          <button type="submit">Create</button>
        </form>
      </div>

      <div className="card">
        <h2>All tasks</h2>
        {tasks.map((t) => (
          <div key={t.id} style={{ borderLeft: `4px solid ${PRIORITY_COLOR[t.priority]}`, borderRadius: 12, background: "var(--surface-tint)", padding: 16, marginBottom: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
              <div style={{ flex: 1, minWidth: 220 }}>
                <div style={{ fontWeight: 500, color: "var(--ink)" }}>{t.description}</div>
                <div className="muted small" style={{ marginTop: 4 }}>
                  {zones.find((z) => z.id === t.zone_id)?.name ?? "No zone"} · {t.priority} priority · {t.status.replace("_", " ")}
                  {t.assignee_id ? ` · assigned to #${t.assignee_id}` : " · unassigned"}
                </div>
              </div>
              <button className="secondary" onClick={() => showSuggestions(t.id)}>
                Suggest volunteers
              </button>
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
          <div className="fine-print">Ranked on skill, zone, and availability. The final call stays with you.</div>
          <button className="secondary" style={{ alignSelf: "flex-start", background: "rgba(246,241,231,0.14)", color: "#fffdf8", border: "none" }} onClick={() => setSuggestionsFor(null)}>
            Close
          </button>
        </div>
      )}
    </div>
  );
}
