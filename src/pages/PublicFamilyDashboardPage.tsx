import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../api/client";
import { CrowdBadge } from "../components/CrowdBadge";
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
      <div className="card auth-card">
        <h1>Peace of Mind</h1>
        {error && <p className="error-text">{error}</p>}
        {!error && !status && <p>Loading...</p>}
        {status && (
          <>
            {status.last_known_lat != null ? (
              <p>
                Last known location: <strong>{status.last_known_lat.toFixed(4)}, {status.last_known_lng!.toFixed(4)}</strong>
                <br />
                <span className="muted">Last shared {new Date(status.last_seen_at!).toLocaleString()}</span>
              </p>
            ) : (
              <p className="muted">No location has been shared recently.</p>
            )}
            {status.zone_name && (
              <p>
                Area: <strong>{status.zone_name}</strong> — <CrowdBadge level={status.crowd_level!} />
              </p>
            )}
          </>
        )}
        <p className="muted small">This page shows only what was voluntarily shared. No account or login is needed to view it.</p>
      </div>
    </div>
  );
}
