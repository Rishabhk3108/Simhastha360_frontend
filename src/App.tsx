import { Navigate, Route, Routes } from "react-router-dom";
import { LoginPage } from "./pages/LoginPage";
import { VolunteerRegisterPage } from "./pages/VolunteerRegisterPage";
import { PublicFamilyDashboardPage } from "./pages/PublicFamilyDashboardPage";
import { AdminLayout } from "./pages/admin/AdminLayout";
import { LiveMonitoringPage } from "./pages/admin/LiveMonitoringPage";
import { FacilitiesPage } from "./pages/admin/FacilitiesPage";
import { ParkingPage } from "./pages/admin/ParkingPage";
import { VolunteersPage } from "./pages/admin/VolunteersPage";
import { TasksPage } from "./pages/admin/TasksPage";
import { TaskDetailPage } from "./pages/admin/TaskDetailPage";
import { FieldTeamPage } from "./pages/admin/FieldTeamPage";
import { VolunteerManagersPage } from "./pages/admin/VolunteerManagersPage";
import { EmergencyPage } from "./pages/admin/EmergencyPage";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { GlobalLoadingBar } from "./components/GlobalLoadingBar";

function App() {
  return (
    <>
      <GlobalLoadingBar />
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
          <Route
            path="facilities"
            element={
              <ProtectedRoute roles={["admin"]}>
                <FacilitiesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="parking"
            element={
              <ProtectedRoute roles={["admin"]}>
                <ParkingPage />
              </ProtectedRoute>
            }
          />
          <Route path="emergency" element={<EmergencyPage />} />
          <Route path="volunteers" element={<VolunteersPage />} />
          <Route path="tasks" element={<TasksPage />} />
          <Route path="tasks/:taskId" element={<TaskDetailPage />} />
          <Route
            path="field-team"
            element={
              <ProtectedRoute roles={["admin"]}>
                <FieldTeamPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="volunteer-managers"
            element={
              <ProtectedRoute roles={["admin"]}>
                <VolunteerManagersPage />
              </ProtectedRoute>
            }
          />
        </Route>

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </>
  );
}

export default App;
