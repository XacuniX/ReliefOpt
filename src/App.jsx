import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ROUTES } from "./routes";
import { useAuth } from "./context/AuthContext";
import { OfflineProvider } from "./context/OfflineContext";
import { DataProvider } from "./context/DataContext";
import { AppShell } from "./components/app-shell";
import LoginPage from "./pages/LoginPage";
import { canAccessRoute, homeForRole } from "./lib/rbac";

const DashboardPage = lazy(() => import("./pages/DashboardPage"));
const MapPage = lazy(() => import("./pages/MapPage"));
const ReportsPage = lazy(() => import("./pages/ReportsPage"));
const SubmitReportPage = lazy(() => import("./pages/SubmitReportPage"));
const InventoryPage = lazy(() => import("./pages/InventoryPage"));
const TasksPage = lazy(() => import("./pages/TasksPage"));
const CargoPage = lazy(() => import("./pages/CargoPage"));
const UsersPage = lazy(() => import("./pages/UsersPage"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));

function ProtectedRoute({ path, children }) {
  const { currentUser } = useAuth();
  return canAccessRoute(currentUser?.role, path)
    ? children
    : <Navigate to={homeForRole(currentUser?.role)} replace />;
}

function AuthRoutes() {
  const { isAuthenticated, authReady, currentUser } = useAuth();

  if (!authReady) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-sm text-muted-foreground">
        Restoring secure session…
      </div>
    );
  }

  const authenticatedHome = homeForRole(currentUser?.role);

  return (
    <Suspense fallback={<div className="flex min-h-48 items-center justify-center text-sm text-muted-foreground">Loading…</div>}>
    <Routes>
      <Route
        path={ROUTES.LOGIN}
        element={
          isAuthenticated ? <Navigate to={authenticatedHome} replace /> : <LoginPage />
        }
      />
      <Route
        element={isAuthenticated ? <AppShell /> : <Navigate to={ROUTES.LOGIN} replace />}
      >
        <Route path={ROUTES.DASHBOARD} element={<ProtectedRoute path={ROUTES.DASHBOARD}><DashboardPage /></ProtectedRoute>} />
        <Route path={ROUTES.MAP} element={<ProtectedRoute path={ROUTES.MAP}><MapPage /></ProtectedRoute>} />
        <Route path={ROUTES.REPORTS} element={<ProtectedRoute path={ROUTES.REPORTS}><ReportsPage /></ProtectedRoute>} />
        <Route path={ROUTES.SUBMIT_REPORT} element={<ProtectedRoute path={ROUTES.SUBMIT_REPORT}><SubmitReportPage /></ProtectedRoute>} />
        <Route path={ROUTES.INVENTORY} element={<ProtectedRoute path={ROUTES.INVENTORY}><InventoryPage /></ProtectedRoute>} />
        <Route path={ROUTES.TASKS} element={<ProtectedRoute path={ROUTES.TASKS}><TasksPage /></ProtectedRoute>} />
        <Route path={ROUTES.CARGO} element={<ProtectedRoute path={ROUTES.CARGO}><CargoPage /></ProtectedRoute>} />
        <Route path={ROUTES.USERS} element={<ProtectedRoute path={ROUTES.USERS}><UsersPage /></ProtectedRoute>} />
        <Route path={ROUTES.SETTINGS} element={<ProtectedRoute path={ROUTES.SETTINGS}><SettingsPage /></ProtectedRoute>} />
      </Route>
      <Route
        path="/"
        element={<Navigate to={isAuthenticated ? authenticatedHome : ROUTES.LOGIN} replace />}
      />
      <Route
        path="*"
        element={<Navigate to={isAuthenticated ? authenticatedHome : ROUTES.LOGIN} replace />}
      />
    </Routes>
    </Suspense>
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
