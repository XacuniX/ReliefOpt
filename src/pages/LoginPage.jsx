import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { LoginForm, RegisterForm, SmokeyBackground } from "../components/ui/login-form";
import { googleSignInAvailable } from "../lib/googleAuth";

const REGISTRATION_ERROR_MESSAGES = {
  USERNAME_TAKEN: "That username is already in use.",
  EMAIL_TAKEN: "That email is already in use.",
  WEAK_PASSWORD: "Password must contain at least 12 characters.",
  PASSWORD_MISMATCH: "Password confirmation does not match.",
  VALIDATION_ERROR: "Check your details and try again.",
};

export default function LoginPage() {
  const { login, loginWithGoogle, register } = useAuth();
  const navigate = useNavigate();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const [mode, setMode] = useState("login");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function switchMode(nextMode) {
    setMode(nextMode);
    setError("");
  }

  function navigateAfterAuthentication(user) {
    navigate(user.role === "field_worker" ? "/map" : "/dashboard");
  }

  async function handleSubmit({ username, password }) {
    if (!username.trim() || !password.trim()) {
      setError("Enter your username and password.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const user = await login(username.trim(), password);
      navigateAfterAuthentication(user);
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

  async function handleRegister(payload) {
    setLoading(true);
    setError("");
    try {
      const user = await register(payload);
      navigateAfterAuthentication(user);
    } catch (registerError) {
      if (registerError?.code === "OFFLINE_LOGIN_UNAVAILABLE") {
        setError("You are offline. Registration requires Central Command connectivity.");
      } else if (registerError?.code === "NETWORK_UNAVAILABLE") {
        setError("Central Command is unreachable. Check the server and your connection.");
      } else {
        setError(REGISTRATION_ERROR_MESSAGES[registerError?.code] || "Unable to create your account.");
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleSuccess(response) {
    if (!response?.credential) {
      setError("Google did not return a sign-in credential. Please try again.");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const user = await loginWithGoogle(response.credential);
      navigateAfterAuthentication(user);
    } catch (googleError) {
      if (googleError?.code === "OFFLINE_LOGIN_UNAVAILABLE") {
        setError("You are offline. Google Sign-In requires an internet connection.");
      } else if (googleError?.code === "NETWORK_UNAVAILABLE") {
        setError("Central Command is unreachable. Check the server and your connection.");
      } else if (googleError?.code === "GOOGLE_ACCOUNT_UNAVAILABLE") {
        setError("This ReliefOpt account is inactive or unavailable.");
      } else if (["INVALID_GOOGLE_CREDENTIAL", "INVALID_GOOGLE_PROFILE"].includes(googleError?.code)) {
        setError("Google could not verify this account. Please try again.");
      } else {
        setError("Unable to sign in with Google right now. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  function handleGoogleError() {
    setError("Google Sign-In was canceled or could not be completed.");
  }

  return (
    <div className="app-gradient app-safe-area relative flex min-h-[100dvh] items-center justify-center overflow-hidden px-4">
      <div aria-hidden className="glow-blob right-[-10rem] top-[-10rem] h-96 w-96 bg-teal-500/10" />
      <div aria-hidden className="glow-blob bottom-[-12rem] left-[-8rem] h-[28rem] w-[28rem] bg-teal-500/5" />
      <SmokeyBackground color="#0d9488" />
      <div aria-hidden className={`absolute inset-0 ${isDark ? "bg-[#031a17]/80" : "bg-white/60"}`} />
      <div className="relative z-10 w-full flex flex-col items-center">
        {mode === "login" ? (
          <LoginForm
            onSubmit={handleSubmit}
            error={error}
            loading={loading}
            onSwitchToRegister={() => switchMode("register")}
            googleEnabled={googleSignInAvailable}
            onGoogleSuccess={handleGoogleSuccess}
            onGoogleError={handleGoogleError}
          />
        ) : (
          <RegisterForm
            onSubmit={handleRegister}
            error={error}
            loading={loading}
            onSwitchToLogin={() => switchMode("login")}
            googleEnabled={googleSignInAvailable}
            onGoogleSuccess={handleGoogleSuccess}
            onGoogleError={handleGoogleError}
          />
        )}
        <div className="mt-5 p-3 rounded-md text-sm text-slate-700 dark:text-gray-300 text-center font-medium bg-white/80 dark:bg-white/10 backdrop-blur-lg border border-teal-500/20 dark:border-white/20 shadow-lg shadow-teal-900/5 dark:shadow-black/30">
          Internet is required to sign in. Existing unexpired sessions continue offline.
        </div>
      </div>
    </div>
  );
}
