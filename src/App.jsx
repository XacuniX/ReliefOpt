import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ROUTES } from "./routes";
import { useAuth } from "./context/AuthContext";
import { OfflineProvider } from "./context/OfflineContext";
import { DataProvider } from "./context/DataContext";
import NotifDrawer from "./components/notifications/NotifDrawer";
import AppLayout from "./components/layout/AppLayout";
import TestApp from "./TestApp";
import DashboardPage from "./pages/DashboardPage";
import MapPage from "./pages/MapPage";
import ReportsPage from "./pages/ReportsPage";
import SubmitReportPage from "./pages/SubmitReportPage";
import InventoryPage from "./pages/InventoryPage";
import TasksPage from "./pages/TasksPage";
import CargoPage from "./pages/CargoPage";
import UsersPage from "./pages/UsersPage";
import LoginPage from "./pages/LoginPage";
import SettingsPage from "./pages/SettingsPage";

function AuthRoutes() {
  const { isAuthenticated } = useAuth();

  return (
    <>
      <NotifDrawer />
      <Routes>
        <Route
          path={ROUTES.LOGIN}
          element={
            isAuthenticated ? <Navigate to={ROUTES.DASHBOARD} replace /> : <LoginPage />
          }
        />
        <Route
          element={isAuthenticated ? <AppLayout /> : <Navigate to={ROUTES.LOGIN} replace />}
        >
          <Route path={ROUTES.DASHBOARD} element={<DashboardPage />} />
          <Route path={ROUTES.MAP} element={<MapPage />} />
          <Route path={ROUTES.REPORTS} element={<ReportsPage />} />
          <Route path={ROUTES.SUBMIT_REPORT} element={<SubmitReportPage />} />
          <Route path={ROUTES.INVENTORY} element={<InventoryPage />} />
          <Route path={ROUTES.TASKS} element={<TasksPage />} />
          <Route path={ROUTES.CARGO} element={<CargoPage />} />
          <Route path={ROUTES.USERS} element={<UsersPage />} />
          <Route path={ROUTES.SETTINGS} element={<SettingsPage />} />
          <Route path="/test" element={<TestApp />} />
        </Route>
        <Route
          path="/"
          element={<Navigate to={isAuthenticated ? ROUTES.DASHBOARD : ROUTES.LOGIN} replace />}
        />
        <Route
          path="*"
          element={<Navigate to={isAuthenticated ? ROUTES.DASHBOARD : ROUTES.LOGIN} replace />}
        />
      </Routes>
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <OfflineProvider>
        <DataProvider>
          <AuthRoutes />
        </DataProvider>
      </OfflineProvider>
    </BrowserRouter>
  );
}
