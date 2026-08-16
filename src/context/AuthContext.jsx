import { createContext, useContext, useState } from "react";
import { useData } from "./DataContext";
import { users as mockUsers } from "../mockData";

const AuthContext = createContext(null);

// AuthProvider currently lives in main.jsx, OUTSIDE DataProvider (which is in App.jsx).
// Until that ordering is fixed by the group, fall back to the static mock users so the
// app still boots. Once AuthProvider sits under DataProvider, users come from IndexedDB.
function useUsers() {
  try {
    const { users } = useData();
    return { users: users.length ? users : mockUsers, ready: true };
  } catch {
    return { users: mockUsers, ready: true };
  }
}

function AuthProvider({ children }) {
  const { users, ready } = useUsers();
  const defaultAdmin = users.find((u) => u.role === "central_admin");

  const [currentUser, setCurrentUser] = useState(() =>
    defaultAdmin
      ? { id: defaultAdmin.id, name: defaultAdmin.name, role: defaultAdmin.role }
      : { id: "u1", name: "Rahim Uddin", role: "central_admin" }
  );
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const login = (role) => {
    const user = users.find((u) => u.role === role) || defaultAdmin || currentUser;
    setCurrentUser({ id: user.id, name: user.name, role: user.role });
    setIsAuthenticated(true);
  };

  const logout = () => {
    setIsAuthenticated(false);
    setCurrentUser(
      defaultAdmin
        ? { id: defaultAdmin.id, name: defaultAdmin.name, role: defaultAdmin.role }
        : { id: "u1", name: "Rahim Uddin", role: "central_admin" }
    );
  };

  const setRole = (role) => {
    setCurrentUser((prev) => ({ ...prev, role }));
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        isAuthenticated,
        ready,
        setRole,
        login,
        logout,
      }}
    >
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
