import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";

const links = [
  { to: "/admin", label: "Live Monitoring", end: true },
  { to: "/admin/facilities", label: "Facilities" },
  { to: "/admin/volunteers", label: "Volunteers" },
  { to: "/admin/tasks", label: "Tasks" },
  { to: "/admin/field-team", label: "Field Team" },
];

export function AdminLayout() {
  const { name, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <h2>Simhastha 360</h2>
        <nav>
          {links.map((l) => (
            <NavLink key={l.to} to={l.to} end={l.end} className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}>
              {l.label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-footer">
          <p className="muted">{name}</p>
          <button
            className="secondary"
            onClick={() => {
              logout();
              navigate("/login");
            }}
          >
            Log out
          </button>
        </div>
      </aside>
      <main className="admin-content">
        <Outlet />
      </main>
    </div>
  );
}
