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
    <div className="app-gradient relative min-h-screen flex items-center justify-center overflow-hidden px-4">
      <div aria-hidden className="glow-blob right-[-10rem] top-[-10rem] h-96 w-96 bg-teal-500/10" />
      <div aria-hidden className="glow-blob bottom-[-12rem] left-[-8rem] h-[28rem] w-[28rem] bg-teal-500/5" />
      <SmokeyBackground color="#0d9488" />
      <div className="relative z-10 w-full flex flex-col items-center">
        <LoginForm onSubmit={handleSubmit} error={error} loading={loading} />
        <div className="mt-5 p-3 glass-card rounded-md text-sm text-slate-700 dark:text-gray-300 text-center font-medium">
          Offline Mode Available — data will sync when connected
        </div>
      </div>
    </div>
  );
}
