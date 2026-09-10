import { Fragment, useEffect, useState } from "react";
import { api } from "../../api/client";
import type { VolunteerOut, VolunteerStatus } from "../../api/types";

const TABS: { label: string; value: VolunteerStatus }[] = [
  { label: "Pending review", value: "pending" },
  { label: "Approved pool", value: "approved" },
  { label: "Rejected", value: "rejected" },
];

const UPLOADS_BASE = `${api.defaults.baseURL}/uploads`;
const POLL_INTERVAL_MS = 20000;

export function VolunteersPage() {
  const [volunteers, setVolunteers] = useState<VolunteerOut[]>([]);
  const [statusFilter, setStatusFilter] = useState<VolunteerStatus>("pending");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [pageLoading, setPageLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);

  async function load() {
    const { data } = await api.get<VolunteerOut[]>("/volunteers", { params: { status: statusFilter } });
    setVolunteers(data);
    setPageLoading(false);
  }

  useEffect(() => {
    setPageLoading(true);
    load();
    const interval = setInterval(load, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  async function review(id: number, action: "approve" | "reject" | "request_info") {
    let note: string | undefined;
    let rating: number | undefined;
    if (action === "approve") {
      const entered = window.prompt("Rate this volunteer (1-5, optional):");
      if (entered === null) return; // cancelled
      if (entered.trim()) {
        const parsed = Number(entered);
        if (!Number.isNaN(parsed)) rating = Math.max(1, Math.min(5, parsed));
      }
    } else if (action === "reject" || action === "request_info") {
      const promptText =
        action === "reject" ? "Reason for rejecting this application (shown to the applicant):" : "What additional info is needed?";
      const entered = window.prompt(promptText);
      if (entered === null) return; // cancelled
      note = entered || undefined;
    }
    setBusyId(id);
    try {
      await api.patch(`/volunteers/${id}/review`, { action, note, rating });
      await load();
    } finally {
      setBusyId(null);
    }
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

      {pageLoading && <p className="muted">Loading volunteers…</p>}

      {!pageLoading && (
      <div className="card">
        <table>
          <thead>
            <tr>
              <th>Applicant</th>
              <th>Skills</th>
              <th>Status</th>
              <th>On duty</th>
              <th>Rating</th>
              <th></th>
              <th style={{ textAlign: "right" }}>Decision</th>
            </tr>
          </thead>
          <tbody>
            {volunteers.map((v) => (
              <Fragment key={v.id}>
                <tr>
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
                  <td>{v.rating != null ? `${v.rating.toFixed(1)} ★` : "—"}</td>
                  <td>
                    <button type="button" className="secondary" onClick={() => setExpandedId(expandedId === v.id ? null : v.id)}>
                      {expandedId === v.id ? "Hide details" : "Details"}
                    </button>
                  </td>
                  <td>
                    <div className="row-actions" style={{ justifyContent: "flex-end" }}>
                      {v.status === "pending" && (
                        <>
                          <button style={{ background: "var(--teal)" }} disabled={busyId === v.id} onClick={() => review(v.id, "approve")}>
                            {busyId === v.id && <span className="button-spinner" />}
                            Approve
                          </button>
                          <button className="secondary" disabled={busyId === v.id} onClick={() => review(v.id, "reject")}>
                            {busyId === v.id && <span className="button-spinner" />}
                            Reject
                          </button>
                          <button className="secondary" disabled={busyId === v.id} onClick={() => review(v.id, "request_info")}>
                            {busyId === v.id && <span className="button-spinner" />}
                            Request info
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
                {expandedId === v.id && (
                  <tr>
                    <td colSpan={7}>
                      <VolunteerDetails volunteer={v} />
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
            {volunteers.length === 0 && (
              <tr>
                <td colSpan={7} className="muted">
                  No volunteers match this filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      )}
    </div>
  );
}

function DocThumb({ label, docId }: { label: string; docId: string | null }) {
  if (!docId) return null;
  return (
    <a href={`${UPLOADS_BASE}/${docId}`} target="_blank" rel="noreferrer" style={{ textAlign: "center" }}>
      <img
        src={`${UPLOADS_BASE}/${docId}`}
        alt={label}
        style={{ width: 100, height: 100, objectFit: "cover", borderRadius: 10, border: "1px solid var(--border)" }}
      />
      <div className="muted small" style={{ marginTop: 4 }}>
        {label}
      </div>
    </a>
  );
}

function VolunteerDetails({ volunteer: v }: { volunteer: VolunteerOut }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 24, padding: "12px 4px" }}>
      <div style={{ display: "flex", gap: 14 }}>
        <DocThumb label="Photo" docId={v.photo_doc_id} />
        <DocThumb label="ID front" docId={v.id_proof_front_doc_id} />
        <DocThumb label="ID back" docId={v.id_proof_back_doc_id} />
      </div>

      <div style={{ flex: 1, minWidth: 260, fontSize: 13, lineHeight: 1.8 }}>
        <div>
          <strong>Age / Gender:</strong> {v.age ?? "—"} / {v.gender ?? "—"}
        </div>
        <div>
          <strong>Email:</strong> {v.email ?? "—"}
        </div>
        <div>
          <strong>City/State:</strong> {v.city_state ?? "—"}
        </div>
        <div>
          <strong>Permanent address:</strong> {v.permanent_address ?? "—"}
        </div>
        <div>
          <strong>Emergency contact:</strong> {v.emergency_contact_name ?? "—"} ({v.emergency_contact_phone ?? "—"})
        </div>
        <div>
          <strong>ID proof:</strong> {v.id_proof_type ?? "—"} · {v.id_number ?? "—"}
        </div>
      </div>

      <div style={{ flex: 1, minWidth: 260, fontSize: 13, lineHeight: 1.8 }}>
        <div>
          <strong>Languages:</strong> {v.languages || "—"}
        </div>
        <div>
          <strong>T-shirt size:</strong> {v.tshirt_size ?? "—"}
        </div>
        <div>
          <strong>Organization:</strong> {v.organization_affiliation ?? "—"}
        </div>
        <div>
          <strong>Medical conditions:</strong> {v.medical_conditions ?? "—"}
        </div>
        <div>
          <strong>Prior experience:</strong> {v.prior_experience ?? "—"}
        </div>
        <div>
          <strong>No criminal record declared:</strong> {v.no_criminal_record ? "Yes" : "No"}
        </div>
        <div>
          <strong>Code of conduct accepted:</strong> {v.code_of_conduct_accepted ? "Yes" : "No"}
        </div>
        <div>
          <strong>Media consent:</strong> {v.media_consent ? "Yes" : "No"}
        </div>
      </div>

      <div style={{ flex: 1, minWidth: 220, fontSize: 13 }}>
        <strong>Availability</strong>
        <ul style={{ margin: "6px 0 0", paddingLeft: 18 }}>
          {v.availability_slots.length === 0 && <li className="muted">None provided</li>}
          {v.availability_slots.map((slot, i) => (
            <li key={i}>
              {slot.date} · {slot.start_time}–{slot.end_time}
            </li>
          ))}
        </ul>
        {v.review_note && (
          <div style={{ marginTop: 12 }}>
            <strong>Latest review note:</strong>
            <div className="muted">{v.review_note}</div>
          </div>
        )}
        {v.rating != null && (
          <div style={{ marginTop: 12 }}>
            <strong>Rating:</strong> <span className="muted">{v.rating.toFixed(1)} ★</span>
          </div>
        )}
        {v.status === "approved" && (
          <div style={{ marginTop: 12 }}>
            <strong>Live location:</strong>
            <div className="muted">
              {v.current_lat != null
                ? `${v.current_lat.toFixed(4)}, ${v.current_lng!.toFixed(4)} · updated ${new Date(v.location_updated_at!).toLocaleString()}`
                : "Not reported yet"}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
