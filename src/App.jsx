import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ROUTES } from "./routes";
import DemoSwitcher from "./components/DemoSwitcher";
import NotifDrawer from "./components/notifications/NotifDrawer";
import AppLayout from "./components/layout/AppLayout";
import TestApp from "./TestApp";
import PlaceholderPage from "./pages/PlaceholderPage";
import InventoryPage from "./pages/InventoryPage";
import TasksPage from "./pages/TasksPage";
import CargoPage from "./pages/CargoPage";
import UsersPage from "./pages/UsersPage";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import SettingsPage from "./pages/SettingsPage";

export default function App() {
  return (
    <BrowserRouter>
      <DemoSwitcher />
      <NotifDrawer />
      <Routes>
        <Route path={ROUTES.LOGIN} element={<LoginPage />} />
        <Route element={<AppLayout />}>
          <Route path={ROUTES.DASHBOARD} element={<DashboardPage />} />
          <Route path={ROUTES.MAP} element={<PlaceholderPage title="Live Map" />} />
          <Route path={ROUTES.REPORTS} element={<PlaceholderPage title="Reports" />} />
          <Route path={ROUTES.SUBMIT_REPORT} element={<PlaceholderPage title="Submit Report" />} />
          <Route path={ROUTES.INVENTORY} element={<InventoryPage />} />
          <Route path={ROUTES.TASKS} element={<TasksPage />} />
          <Route path={ROUTES.CARGO} element={<CargoPage />} />
          <Route path={ROUTES.USERS} element={<UsersPage />} />
          <Route path={ROUTES.SETTINGS} element={<SettingsPage />} />
          <Route path="/test" element={<TestApp />} />
          <Route path="/" element={<Navigate to={ROUTES.DASHBOARD} replace />} />
          <Route path="*" element={<Navigate to={ROUTES.DASHBOARD} replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
