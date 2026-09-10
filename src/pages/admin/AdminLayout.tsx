import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";

const adminLinks = [
  { to: "/admin", label: "Live monitoring", icon: "ph-fill ph-monitor", end: true },
  { to: "/admin/emergency", label: "Emergency (SOS)", icon: "ph-fill ph-siren" },
  { to: "/admin/facilities", label: "Facilities", icon: "ph ph-map-pin-area" },
  { to: "/admin/parking", label: "Sinhastha Saarthi", icon: "ph ph-car" },
  { to: "/admin/volunteers", label: "Volunteers", icon: "ph ph-users" },
  { to: "/admin/tasks", label: "Tasks", icon: "ph ph-clipboard-text" },
  { to: "/admin/field-team", label: "Field teams", icon: "ph ph-shield-star" },
  { to: "/admin/volunteer-managers", label: "Volunteer managers", icon: "ph ph-identification-badge" },
];

const volunteerManagerLinks = [
  { to: "/admin", label: "Live monitoring", icon: "ph-fill ph-monitor", end: true },
  { to: "/admin/emergency", label: "Emergency (SOS)", icon: "ph-fill ph-siren" },
  { to: "/admin/volunteers", label: "Volunteers", icon: "ph ph-users" },
  { to: "/admin/tasks", label: "Tasks", icon: "ph ph-clipboard-text" },
];

export function AdminLayout() {
  const { name, role, logout } = useAuth();
  const navigate = useNavigate();
  const links = role === "volunteer_manager" ? volunteerManagerLinks : adminLinks;

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <div className="brand-mark">
          <div className="brand-seal" />
          <div>
            <div className="brand-title">सिंहस्थ ३६०</div>
            <div className="brand-subtitle">Command Centre</div>
          </div>
        </div>
        <nav>
          {links.map((l) => (
            <NavLink key={l.to} to={l.to} end={l.end} className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}>
              <i className={l.icon} />
              {l.label}
            </NavLink>
          ))}
        </nav>
        <div
          style={{
            background: "rgba(246,241,231,0.08)",
            borderRadius: 16,
            padding: 15,
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase", color: "#E9B45C" }}>
            <i className="ph-fill ph-broadcast" /> Channels live
          </div>
          <div style={{ fontSize: 12.5, lineHeight: 1.5, color: "rgba(246,241,231,0.75)" }}>App · Web · IVR 1800-360-360 · SMS "UJJAIN"</div>
        </div>
        <div className="sidebar-footer">
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: "50%",
              background: "rgba(233,180,92,0.22)",
              color: "#E9B45C",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 13,
              fontWeight: 700,
              flexShrink: 0,
            }}
          >
            {(name ?? "?").slice(0, 2).toUpperCase()}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="muted" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {name}
            </div>
            <button
              className="secondary"
              style={{ background: "transparent", border: "none", color: "rgba(246,241,231,0.6)", padding: 0, fontSize: 12, marginTop: 2 }}
              onClick={() => {
                logout();
                navigate("/login");
              }}
            >
              Log out
            </button>
          </div>
        </div>
      </aside>
      <div className="admin-content">
        <div className="tricolor-strip">
          <span />
          <span />
          <span />
        </div>
        <div className="admin-content-inner">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
