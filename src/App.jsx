import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ROUTES } from "./routes";
import DemoSwitcher from "./components/DemoSwitcher";
import NotifDrawer from "./components/notifications/NotifDrawer";
import TestApp from "./TestApp";
import InventoryPage from "./pages/InventoryPage";
import TasksPage from "./pages/TasksPage";
import CargoPage from "./pages/CargoPage";
import UsersPage from "./pages/UsersPage";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import SettingsPage from "./pages/SettingsPage";

function PlaceholderPage({ title }) {
  return (
    <main style={{ maxWidth: 720, margin: "0 auto", paddingTop: 60, textAlign: "center" }}>
      <h1 style={{ fontSize: "var(--text-2xl)", color: "var(--color-navy)" }}>{title}</h1>
      <p style={{ color: "var(--color-mid)" }}>Coming soon</p>
    </main>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <DemoSwitcher />
      <NotifDrawer />
      <Routes>
        <Route path={ROUTES.LOGIN} element={<LoginPage />} />
        <Route path={ROUTES.DASHBOARD} element={<DashboardPage />} />
        <Route path={ROUTES.MAP} element={<PlaceholderPage title="Live Map" />} />
        <Route path={ROUTES.REPORTS} element={<PlaceholderPage title="Reports" />} />
        <Route path={ROUTES.INVENTORY} element={<InventoryPage />} />
        <Route path={ROUTES.TASKS} element={<TasksPage />} />
        <Route path={ROUTES.CARGO} element={<CargoPage />} />
        <Route path={ROUTES.USERS} element={<UsersPage />} />
        <Route path={ROUTES.SETTINGS} element={<SettingsPage />} />
        <Route path="/test" element={<TestApp />} />
        <Route path="*" element={<LoginPage />} />
      </Routes>
    </BrowserRouter>
  );
}
