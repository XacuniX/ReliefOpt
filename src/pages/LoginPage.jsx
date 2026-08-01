import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Button, Input, Select, Card } from "../components/ui";

const roles = [
  { value: "field_worker", label: "Field Worker" },
  { value: "warehouse_manager", label: "Warehouse Manager" },
  { value: "central_admin", label: "Central Admin" },
];

const pageStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: "calc(100vh - 48px)",
};

const cardStyle = {
  width: 400,
  maxWidth: "100%",
  padding: "var(--space-8)",
};

const headingStyle = {
  fontSize: "var(--text-2xl)",
  fontWeight: 800,
  color: "var(--color-navy)",
  margin: "0 0 var(--space-6)",
  textAlign: "center",
};

const bannerStyle = {
  marginTop: "var(--space-5)",
  padding: "var(--space-3) var(--space-4)",
  background: "rgba(243, 156, 18, 0.12)",
  border: "1px solid rgba(243, 156, 18, 0.3)",
  borderRadius: 6,
  fontSize: "var(--text-sm)",
  color: "var(--color-amber)",
  textAlign: "center",
  fontWeight: 500,
};

export default function LoginPage() {
  const { setRole } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [selectedRole, setSelectedRole] = useState("central_admin");
  const [loading, setLoading] = useState(false);

  function handleSubmit(e) {
    e.preventDefault();
    if (!username.trim() || !password.trim()) return;
    setLoading(true);
    setTimeout(() => {
      setRole(selectedRole);
      setLoading(false);
      navigate("/dashboard");
    }, 500);
  }

  return (
    <div style={pageStyle}>
      <Card style={cardStyle}>
        <h1 style={headingStyle}>ReliefOpt</h1>
        <form onSubmit={handleSubmit}>
          <Input
            label="Username"
            placeholder="Enter your username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <Input
            label="Password"
            type="password"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <Select
            label="Role"
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            options={roles}
          />
          <Button type="submit" loading={loading} style={{ width: "100%", marginTop: "var(--space-2)" }}>
            Sign In
          </Button>
        </form>
        <div style={bannerStyle}>
          Offline Mode Available — data will sync when connected
        </div>
      </Card>
    </div>
  );
}
