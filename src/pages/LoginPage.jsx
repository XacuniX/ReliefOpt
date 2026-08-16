import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Button, Input, Card } from "../components/ui";

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function handleSubmit(e) {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError("Enter your username and password.");
      return;
    }
    setLoading(true);
    setError("");
    setTimeout(() => {
      const user = login(username.trim(), password);
      setLoading(false);
      if (!user) {
        setError("Invalid username or password, or the account is inactive.");
        return;
      }
      navigate(user.role === "field_worker" ? "/map" : "/dashboard");
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
          <Button type="submit" loading={loading} className="w-full mt-2">
            Sign In
          </Button>
          {error && (
            <p className="mt-3 text-sm font-medium text-red-600 dark:text-red-400 text-center" role="alert">
              {error}
            </p>
          )}
        </form>
        <div className="mt-5 p-3 bg-amber-500/10 border border-amber-500/30 rounded-md text-sm text-amber-600 dark:text-amber-400 text-center font-medium">
          Offline Mode Available — data will sync when connected
        </div>
      </Card>
    </div>
  );
}
