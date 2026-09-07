import { Navigate, Route, Routes } from "react-router-dom";
import { LoginPage } from "./pages/LoginPage";
import { VolunteerRegisterPage } from "./pages/VolunteerRegisterPage";
import { PublicFamilyDashboardPage } from "./pages/PublicFamilyDashboardPage";
import { AdminLayout } from "./pages/admin/AdminLayout";
import { LiveMonitoringPage } from "./pages/admin/LiveMonitoringPage";
import { FacilitiesPage } from "./pages/admin/FacilitiesPage";
import { VolunteersPage } from "./pages/admin/VolunteersPage";
import { TasksPage } from "./pages/admin/TasksPage";
import { FieldTeamPage } from "./pages/admin/FieldTeamPage";
import { ProtectedRoute } from "./components/ProtectedRoute";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/volunteer-register" element={<VolunteerRegisterPage />} />
      <Route path="/family/:token" element={<PublicFamilyDashboardPage />} />

      <Route
        path="/admin"
        element={
          <ProtectedRoute>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<LiveMonitoringPage />} />
        <Route path="facilities" element={<FacilitiesPage />} />
        <Route path="volunteers" element={<VolunteersPage />} />
        <Route path="tasks" element={<TasksPage />} />
        <Route path="field-team" element={<FieldTeamPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

export default App;
