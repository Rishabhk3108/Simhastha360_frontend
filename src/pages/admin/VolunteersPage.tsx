import { useEffect, useState } from "react";
import { api } from "../../api/client";
import type { VolunteerOut, VolunteerStatus } from "../../api/types";

export function VolunteersPage() {
  const [volunteers, setVolunteers] = useState<VolunteerOut[]>([]);
  const [statusFilter, setStatusFilter] = useState<VolunteerStatus | "">("pending");

  async function load() {
    const { data } = await api.get<VolunteerOut[]>("/volunteers", {
      params: statusFilter ? { status: statusFilter } : {},
    });
    setVolunteers(data);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  async function review(id: number, action: "approve" | "reject" | "request_info") {
    await api.patch(`/volunteers/${id}/review`, { action });
    load();
  }

  return (
    <div>
      <h1>Volunteers</h1>

      <section className="card">
        <label>
          Filter by status
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as VolunteerStatus | "")}>
            <option value="">All</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </label>

        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Phone</th>
              <th>Skills</th>
              <th>Status</th>
              <th>On duty</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {volunteers.map((v) => (
              <tr key={v.id}>
                <td>{v.name}</td>
                <td>{v.phone}</td>
                <td>{v.skills || "—"}</td>
                <td>{v.status}</td>
                <td>{v.status === "approved" ? (v.on_duty ? "Available" : "Off duty") : "—"}</td>
                <td className="row-actions">
                  {v.status === "pending" && (
                    <>
                      <button onClick={() => review(v.id, "approve")}>Approve</button>
                      <button className="secondary" onClick={() => review(v.id, "reject")}>
                        Reject
                      </button>
                      <button className="secondary" onClick={() => review(v.id, "request_info")}>
                        Request info
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
            {volunteers.length === 0 && (
              <tr>
                <td colSpan={6} className="muted">
                  No volunteers match this filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}
