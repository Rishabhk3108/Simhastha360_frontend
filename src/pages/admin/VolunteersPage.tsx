import { useEffect, useState } from "react";
import { api } from "../../api/client";
import type { VolunteerOut, VolunteerStatus } from "../../api/types";

const TABS: { label: string; value: VolunteerStatus }[] = [
  { label: "Pending review", value: "pending" },
  { label: "Approved pool", value: "approved" },
  { label: "Rejected", value: "rejected" },
];

export function VolunteersPage() {
  const [volunteers, setVolunteers] = useState<VolunteerOut[]>([]);
  const [statusFilter, setStatusFilter] = useState<VolunteerStatus>("pending");

  async function load() {
    const { data } = await api.get<VolunteerOut[]>("/volunteers", { params: { status: statusFilter } });
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
      <p className="muted" style={{ marginTop: -8, marginBottom: 20 }}>
        Review applications, browse the approved pool, and see who's on duty.
      </p>

      <div className="pill-tabs">
        {TABS.map((t) => (
          <button key={t.value} className={`pill-tab ${statusFilter === t.value ? "active" : ""}`} onClick={() => setStatusFilter(t.value)}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="card">
        <table>
          <thead>
            <tr>
              <th>Applicant</th>
              <th>Skills</th>
              <th>Status</th>
              <th>On duty</th>
              <th style={{ textAlign: "right" }}>Decision</th>
            </tr>
          </thead>
          <tbody>
            {volunteers.map((v) => (
              <tr key={v.id}>
                <td>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: "50%",
                        background: "var(--teal-tint)",
                        color: "var(--teal)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 12,
                        fontWeight: 700,
                        flexShrink: 0,
                      }}
                    >
                      {v.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontWeight: 500 }}>{v.name}</div>
                      <div className="muted small">{v.phone}</div>
                    </div>
                  </div>
                </td>
                <td>{v.skills || "—"}</td>
                <td>{v.status}</td>
                <td>{v.status === "approved" ? (v.on_duty ? "Available" : "Off duty") : "—"}</td>
                <td>
                  <div className="row-actions" style={{ justifyContent: "flex-end" }}>
                    {v.status === "pending" && (
                      <>
                        <button style={{ background: "var(--teal)" }} onClick={() => review(v.id, "approve")}>
                          Approve
                        </button>
                        <button className="secondary" onClick={() => review(v.id, "reject")}>
                          Reject
                        </button>
                        <button className="secondary" onClick={() => review(v.id, "request_info")}>
                          Request info
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {volunteers.length === 0 && (
              <tr>
                <td colSpan={5} className="muted">
                  No volunteers match this filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
