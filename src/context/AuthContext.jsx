import { createContext, useContext, useState } from "react";
import { users } from "../mockData";

const AuthContext = createContext(null);

const SESSION_KEY = "reliefopt-session";
const DEMO_PASSWORD = "reliefopt";

function readSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeSession(user) {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(user));
  } catch {
    // Storage unavailable — session just won't survive a refresh.
  }
}

function clearSession() {
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch {
    // Ignore — nothing to clean up.
  }
}

const defaultAdmin = users.find((u) => u.role === "central_admin");

function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(() => {
    const session = readSession();
    if (session?.id) {
      const fresh = users.find((u) => u.id === session.id);
      if (fresh && fresh.status !== "Inactive") {
        return { id: fresh.id, name: fresh.name, role: fresh.role };
      }
    }
    return { id: defaultAdmin.id, name: defaultAdmin.name, role: defaultAdmin.role };
  });
  const [isAuthenticated, setIsAuthenticated] = useState(() => !!readSession());

  /**
   * Real login: look the user up by username, verify the demo password, and
   * refuse deactivated accounts. Returns true on success, false on failure.
   * Demo switcher compatibility: passing a role string ("field_worker", ...)
   * or a user object logs that user in without a password check.
   */
  const login = (username, password) => {
    let user;
    if (username && typeof username === "object" && username.id) {
      user = users.find((u) => u.id === username.id) || null;
    } else if (["field_worker", "warehouse_manager", "central_admin"].includes(username)) {
      // Legacy demo-switcher call: login("field_worker") → first active user in that role.
      user = users.find((u) => u.role === username && u.status !== "Inactive") || null;
    } else {
      user = users.find((u) => u.username === username) || null;
    }
    if (!user) return false;
    if (user.status === "Inactive") return false;
    if (password && password !== DEMO_PASSWORD) return false;

    const sessionUser = { id: user.id, name: user.name, role: user.role };
    setCurrentUser(sessionUser);
    setIsAuthenticated(true);
    writeSession(sessionUser);
    return sessionUser;
  };

  const logout = () => {
    setIsAuthenticated(false);
    setCurrentUser({ id: defaultAdmin.id, name: defaultAdmin.name, role: defaultAdmin.role });
    clearSession();
  };

  const setRole = (role) => {
    setCurrentUser((prev) => ({ ...prev, role }));
    writeSession({ ...currentUser, role });
  };

  return (
    <AuthContext.Provider value={{ currentUser, isAuthenticated, setRole, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}

export default AuthProvider;
