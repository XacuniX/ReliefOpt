import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { LoginForm, SmokeyBackground } from "../components/ui/login-form";

const DEMO_PASSWORD = "ReliefOpt!123";
const DEMO_ACCOUNTS = [
  { label: "Central Admin", username: "rahim", description: "Full coordination access" },
  { label: "Warehouse Manager", username: "fatima", description: "Inventory and logistics access" },
  { label: "Field Worker", username: "kamal", description: "Field reporting and tasks" },
];

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit({ username, password }) {
    if (!username.trim() || !password.trim()) {
      setError("Enter your username and password.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const user = await login(username.trim(), password);
      navigate(user.role === "field_worker" ? "/map" : "/dashboard");
    } catch (loginError) {
      if (loginError?.code === "OFFLINE_LOGIN_UNAVAILABLE") {
        setError("You are offline. Fresh login requires Central Command connectivity.");
      } else if (loginError?.code === "NETWORK_UNAVAILABLE") {
        setError("Central Command is unreachable. Check the server and your connection.");
      } else {
        setError("Invalid username or password, or the account is inactive.");
      }
    } finally {
      setLoading(false);
    }
  }

  function handleDemoLogin(username) {
    if (loading) return;
    void handleSubmit({ username, password: DEMO_PASSWORD });
  }

  return (
    <div className="app-gradient relative min-h-screen flex items-center justify-center overflow-hidden px-4">
      <div aria-hidden className="glow-blob right-[-10rem] top-[-10rem] h-96 w-96 bg-teal-500/10" />
      <div aria-hidden className="glow-blob bottom-[-12rem] left-[-8rem] h-[28rem] w-[28rem] bg-teal-500/5" />
      <SmokeyBackground color="#0d9488" />
      <div aria-hidden className={`absolute inset-0 ${isDark ? "bg-[#031a17]/80" : "bg-white/60"}`} />
      <div className="relative z-10 w-full flex flex-col items-center">
        <LoginForm onSubmit={handleSubmit} error={error} loading={loading} />
        {import.meta.env.DEV && (
          <section className="mt-4 w-full max-w-sm rounded-2xl border border-amber-500/25 bg-white/80 p-4 text-slate-700 shadow-lg shadow-teal-900/5 backdrop-blur-lg dark:bg-white/10 dark:text-gray-200 dark:shadow-black/30" aria-labelledby="developer-portal-title">
            <div className="mb-3 text-center">
              <h2 id="developer-portal-title" className="text-sm font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300">
                Developer Demo Portal
              </h2>
              <p className="mt-1 text-xs text-slate-500 dark:text-gray-300">
                One-click sign in for local demo accounts
              </p>
            </div>
            <div className="space-y-2">
              {DEMO_ACCOUNTS.map((account) => (
                <button
                  key={account.username}
                  type="button"
                  disabled={loading}
                  onClick={() => handleDemoLogin(account.username)}
                  className="flex w-full items-center justify-between rounded-lg border border-teal-500/20 bg-white/60 px-3 py-2 text-left transition hover:border-teal-500/50 hover:bg-teal-500/10 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white/5"
                >
                  <span>
                    <span className="block text-sm font-semibold">{account.label}</span>
                    <span className="block text-xs text-slate-500 dark:text-gray-300">{account.description}</span>
                  </span>
                  <span className="ml-3 rounded-full bg-teal-500/10 px-2 py-1 font-mono text-xs text-teal-700 dark:text-teal-300">
                    {account.username}
                  </span>
                </button>
              ))}
            </div>
            <p className="mt-3 text-center text-[11px] text-slate-500 dark:text-gray-300">
              Development build only · password: <span className="font-mono">{DEMO_PASSWORD}</span>
            </p>
          </section>
        )}
        <div className="mt-5 p-3 rounded-md text-sm text-slate-700 dark:text-gray-300 text-center font-medium bg-white/80 dark:bg-white/10 backdrop-blur-lg border border-teal-500/20 dark:border-white/20 shadow-lg shadow-teal-900/5 dark:shadow-black/30">
          Internet is required to sign in. Existing unexpired sessions continue offline.
        </div>
      </div>
    </div>
  );
}
