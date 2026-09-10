import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

const DEFAULT_ROLES = ["admin", "volunteer_manager"];

export function ProtectedRoute({ children, roles = DEFAULT_ROLES }: { children: ReactNode; roles?: string[] }) {
  const { token, role } = useAuth();
  if (!token || !role) {
    return <Navigate to="/login" replace />;
  }
  if (!roles.includes(role)) {
    // Logged in, just not allowed on this particular page - send them
    // somewhere both roles can see instead of bouncing them to login.
    return <Navigate to="/admin" replace />;
  }
  return <>{children}</>;
}
