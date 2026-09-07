import { useEffect, useState, type FormEvent } from "react";
import { api } from "../../api/client";
import type { Task, TaskPriority, TaskSuggestion, Zone } from "../../api/types";

const PRIORITIES: TaskPriority[] = ["low", "medium", "high"];

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
    await api.post("/tasks", {
      description,
      priority,
      zone_id: zoneId ? parseInt(zoneId, 10) : null,
    });
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

      <section className="card">
        <h2>Create task</h2>
        <form className="inline-form" onSubmit={handleCreate}>
          <input placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)} required />
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
      </section>

      <section className="card">
        <h2>All tasks</h2>
        <table>
          <thead>
            <tr>
              <th>Description</th>
              <th>Zone</th>
              <th>Priority</th>
              <th>Status</th>
              <th>Assignee</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {tasks.map((t) => (
              <tr key={t.id}>
                <td>{t.description}</td>
                <td>{zones.find((z) => z.id === t.zone_id)?.name ?? "—"}</td>
                <td>{t.priority}</td>
                <td>{t.status}</td>
                <td>{t.assignee_id ?? "Unassigned"}</td>
                <td>
                  <button className="secondary" onClick={() => showSuggestions(t.id)}>
                    Suggest volunteers
                  </button>
                </td>
              </tr>
            ))}
            {tasks.length === 0 && (
              <tr>
                <td colSpan={6} className="muted">
                  No tasks yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      {suggestionsFor !== null && (
        <section className="card">
          <h2>AI-suggested best-fit volunteers for task #{suggestionsFor}</h2>
          <p className="muted">Ranked by preferred zone match, skill match, and on-duty availability. You make the final call.</p>
          <ul>
            {suggestions.map((s) => (
              <li key={s.user_id}>
                <strong>{s.name}</strong> — score {s.score.toFixed(1)}
                <br />
                <span className="muted">{s.reasons.join("; ")}</span>{" "}
                <button onClick={() => assign(suggestionsFor, s.user_id)}>Assign</button>
              </li>
            ))}
            {suggestions.length === 0 && <p className="muted">No approved, on-duty volunteers available right now.</p>}
          </ul>
          <button className="secondary" onClick={() => setSuggestionsFor(null)}>
            Close
          </button>
        </section>
      )}
    </div>
  );
}
