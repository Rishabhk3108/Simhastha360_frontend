import { useEffect, useState, type FormEvent } from "react";
import { api } from "../../api/client";

interface VolunteerManager {
  id: number;
  name: string;
  phone: string;
}

export function VolunteerManagersPage() {
  const [managers, setManagers] = useState<VolunteerManager[]>([]);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pageLoading, setPageLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  async function load() {
    const { data } = await api.get<VolunteerManager[]>("/volunteer-managers");
    setManagers(data);
    setPageLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setCreating(true);
    try {
      await api.post("/volunteer-managers", { name, phone, password });
      setName("");
      setPhone("");
      setPassword("");
      await load();
    } catch (err: any) {
      setError(err.response?.data?.detail ?? "Couldn't create the account.");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div>
      <h1>Volunteer Managers</h1>
      <p className="muted" style={{ marginTop: -8 }}>
        Police / municipal staff accounts that manage volunteer approvals and task assignment. There is no self-registration
        for this role — accounts are created here only.
      </p>

      <section className="card">
        <h2>Add volunteer manager</h2>
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
          <button type="submit" disabled={creating}>
            {creating && <span className="button-spinner" />}
            Add
          </button>
        </form>
        {error && <p className="error-text">{error}</p>}
      </section>

      {pageLoading && <p className="muted">Loading accounts…</p>}

      {!pageLoading && (
      <section className="card">
        <h2>Accounts</h2>
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Phone</th>
            </tr>
          </thead>
          <tbody>
            {managers.map((m) => (
              <tr key={m.id}>
                <td>{m.name}</td>
                <td>{m.phone}</td>
              </tr>
            ))}
            {managers.length === 0 && (
              <tr>
                <td colSpan={2} className="muted">
                  No volunteer managers yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
      )}
    </div>
  );
}
