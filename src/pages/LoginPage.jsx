import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { LoginForm, SmokeyBackground } from "../components/ui/login-form";

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function handleSubmit({ username, password }) {
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
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-slate-900 px-4">
      <SmokeyBackground color="#1E40AF" />
      <div className="relative z-10 w-full flex flex-col items-center">
        <LoginForm onSubmit={handleSubmit} error={error} loading={loading} />
        <div className="mt-5 p-3 bg-white/10 border border-white/20 rounded-md text-sm text-gray-300 text-center font-medium backdrop-blur-lg">
          Offline Mode Available — data will sync when connected
        </div>
      </div>
    </div>
  );
}
