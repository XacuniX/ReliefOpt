import { useAuth } from "../context/AuthContext";

export default function RoleGate({ allowed, children }) {
  const { currentUser } = useAuth();

  if (!allowed || !allowed.includes(currentUser.role)) {
    return null;
  }

  return children;
}
