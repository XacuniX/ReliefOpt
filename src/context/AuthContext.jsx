import { createContext, useContext, useState } from "react";
import { users } from "../mockData";

const AuthContext = createContext(null);

const defaultAdmin = users.find((u) => u.role === "central_admin");

function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState({
    id: defaultAdmin.id,
    name: defaultAdmin.name,
    role: defaultAdmin.role,
  });

  const setRole = (role) => {
    setCurrentUser((prev) => ({ ...prev, role }));
  };

  return (
    <AuthContext.Provider value={{ currentUser, setRole }}>
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
