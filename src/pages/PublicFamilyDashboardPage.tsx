import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../api/client";
import type { PublicFamilyStatus } from "../api/types";

export function PublicFamilyDashboardPage() {
  const { token } = useParams<{ token: string }>();
  const [status, setStatus] = useState<PublicFamilyStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<PublicFamilyStatus>(`/family/public/${token}`)
      .then((res) => setStatus(res.data))
      .catch(() => setError("This link is invalid, revoked, or has expired."));
  }, [token]);

  return (
    <div className="centered-page">
      <div className="public-page-card">
        <div className="public-hero">
          <div style={{ fontSize: 11, letterSpacing: "0.2em", textTransform: "uppercase", color: "var(--brass)", marginBottom: 8 }}>
            Peace of mind
          </div>
          {error ? (
            <div style={{ fontFamily: "Marcellus, serif", fontSize: 28 }}>Link unavailable</div>
          ) : (
            <div style={{ fontFamily: "Marcellus, serif", fontSize: 32 }}>Last known status</div>
          )}
          {status && (
            <div style={{ fontSize: 14, color: "rgba(246,241,231,0.7)", marginTop: 8 }}>
              {status.last_seen_at ? `Last shared ${new Date(status.last_seen_at).toLocaleString()}` : "No recent updates"} · no account needed to view
            </div>
          )}
        </div>

        <div className="public-page-body">
          {error && <p className="error-text">{error}</p>}
          {!error && !status && <p className="muted">Loading...</p>}

          {status && (
            <>
              {status.zone_name ? (
                <div className="info-row positive">
                  <i className="ph-fill ph-check-circle" />
                  <div>
                    <div style={{ fontWeight: 500 }}>Near {status.zone_name}</div>
                    <div className="muted small">Crowd level: {status.crowd_level}</div>
                  </div>
                </div>
              ) : (
                <div className="info-row">
                  <i className="ph ph-map-pin" />
                  <div className="muted">No location has been shared recently.</div>
                </div>
              )}

              <div className="info-row">
                <i className="ph-fill ph-eye-slash" />
                <div>
                  <div style={{ fontWeight: 500 }}>What you cannot see</div>
                  <div className="muted small">Exact coordinates, movement history, phone number, health card. This link can be revoked any time.</div>
                </div>
              </div>
            </>
          )}

          <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
            <button style={{ flex: 1 }}>Ujjain safety advisories</button>
            <button className="secondary" style={{ flex: 1 }}>
              Helpline 1800-360-360
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
