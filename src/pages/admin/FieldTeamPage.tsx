import { useEffect, useState, type FormEvent } from "react";
import { api } from "../../api/client";
import type { FieldTeamMember } from "../../api/types";

export function FieldTeamPage() {
  const [members, setMembers] = useState<FieldTeamMember[]>([]);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");

  async function load() {
    const { data } = await api.get<FieldTeamMember[]>("/field-team");
    setMembers(data);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    await api.post("/field-team", { name, phone, password });
    setName("");
    setPhone("");
    setPassword("");
    load();
  }

  return (
    <div>
      <h1>Field Team</h1>

      <section className="card">
        <h2>Add field team member</h2>
        <form className="inline-form" onSubmit={handleCreate}>
          <input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} required />
          <input placeholder="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} required />
          <input
            placeholder="Initial password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button type="submit">Add</button>
        </form>
      </section>

      <section className="card">
        <h2>Live locations</h2>
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Phone</th>
              <th>Location</th>
              <th>Last update</th>
            </tr>
          </thead>
          <tbody>
            {members.map((m) => (
              <tr key={m.id}>
                <td>{m.name}</td>
                <td>{m.phone}</td>
                <td>{m.current_lat != null ? `${m.current_lat.toFixed(4)}, ${m.current_lng!.toFixed(4)}` : "—"}</td>
                <td>{m.location_updated_at ? new Date(m.location_updated_at).toLocaleString() : "—"}</td>
              </tr>
            ))}
            {members.length === 0 && (
              <tr>
                <td colSpan={4} className="muted">
                  No field team members yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}
