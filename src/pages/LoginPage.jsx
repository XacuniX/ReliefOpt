import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Button, Input, Select, Card } from "../components/ui";

const roles = [
  { value: "field_worker", label: "Field Worker" },
  { value: "warehouse_manager", label: "Warehouse Manager" },
  { value: "central_admin", label: "Central Admin" },
];

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
    <div className="min-h-screen flex items-center justify-center bg-muted/50 px-4">
      <Card className="w-full max-w-md p-8">
        <h1 className="text-2xl font-extrabold text-foreground text-center mb-6">
          Relief<span className="text-primary">Opt</span>
        </h1>
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
          <Button type="submit" loading={loading} className="w-full mt-2">
            Sign In
          </Button>
        </form>
        <div className="mt-5 p-3 bg-amber-500/10 border border-amber-500/30 rounded-md text-sm text-amber-600 dark:text-amber-400 text-center font-medium">
          Offline Mode Available — data will sync when connected
        </div>
      </Card>
    </div>
  );
}
