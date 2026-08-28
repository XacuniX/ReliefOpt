import { createContext, useContext, useEffect, useState } from "react";
import { AuthApiError, fetchCurrentUser, loginWithPassword, registerAccount, updateOwnAccount } from "../lib/authApi";
import {
  clearCachedSession,
  readCachedSession,
  sessionFromAccessToken,
  writeCachedSession,
} from "../lib/authSession";

const AuthContext = createContext(null);

export class OfflineLoginError extends Error {
  constructor() {
    super("An internet connection is required for a fresh login.");
    this.name = "OfflineLoginError";
    this.code = "OFFLINE_LOGIN_UNAVAILABLE";
  }
}

function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [accessToken, setAccessToken] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authReady, setAuthReady] = useState(false);

  function acceptSession(session, serverUser) {
    setAccessToken(session.accessToken);
    setCurrentUser(serverUser || session.user);
    setIsAuthenticated(true);
  }

  function clearSession() {
    clearCachedSession();
    setAccessToken(null);
    setCurrentUser(null);
    setIsAuthenticated(false);
  }

  useEffect(() => {
    let cancelled = false;

    async function restoreSession() {
      const cached = readCachedSession();
      if (!cached) {
        clearCachedSession();
        if (!cancelled) clearSession();
        return;
      }

      if (navigator.onLine === false) {
        if (!cancelled) acceptSession(cached);
        return;
      }

      try {
        const { user } = await fetchCurrentUser(cached.accessToken);
        if (!cancelled) acceptSession(cached, user);
      } catch (error) {
        if (error instanceof AuthApiError && error.code === "NETWORK_UNAVAILABLE") {
          if (!cancelled) acceptSession(cached);
        } else if (!cancelled) {
          clearSession();
        }
      }
    }

    async function initialize() {
      await restoreSession();
      if (!cancelled) setAuthReady(true);
    }

    function handleOnline() {
      void restoreSession();
    }

    void initialize();
    window.addEventListener("online", handleOnline);
    return () => {
      cancelled = true;
      window.removeEventListener("online", handleOnline);
    };
  }, []);

  useEffect(() => {
    if (!accessToken) return undefined;
    const session = sessionFromAccessToken(accessToken);
    if (!session) {
      clearSession();
      return undefined;
    }
    const delay = Math.max(0, Date.parse(session.expiresAt) - Date.now());
    const timer = window.setTimeout(() => clearSession(), delay);
    return () => window.clearTimeout(timer);
  }, [accessToken]);

  async function login(username, password) {
    if (navigator.onLine === false) throw new OfflineLoginError();
    const response = await loginWithPassword(username, password);
    const session = writeCachedSession(response.accessToken);
    const tokenSession = sessionFromAccessToken(response.accessToken);
    if (
      !tokenSession ||
      tokenSession.user.id !== response.user.id ||
      tokenSession.user.role !== response.user.role
    ) {
      clearSession();
      throw new AuthApiError("Central Command returned an invalid session.", {
        code: "INVALID_SESSION",
      });
    }
    acceptSession(session, response.user);
    return response.user;
  }

  async function register(payload) {
    if (navigator.onLine === false) throw new OfflineLoginError();
    const response = await registerAccount(payload);
    const session = writeCachedSession(response.accessToken);
    acceptSession(session, response.user);
    return response.user;
  }

  async function updateAccount(payload) {
    const response = await updateOwnAccount(accessToken, payload);
    if (response.passwordChanged) {
      logout();
      return response.user;
    }
    setCurrentUser(response.user);
    return response.user;
  }

  async function refreshCurrentUser() {
    if (!accessToken) return null;
    try {
      const { user } = await fetchCurrentUser(accessToken);
      setCurrentUser(user);
      return user;
    } catch (error) {
      if (error instanceof AuthApiError && error.code === "INVALID_SESSION") clearSession();
      throw error;
    }
  }

  function logout() {
    clearSession();
  }

  return (
    <AuthContext.Provider
      value={{
        currentUser, accessToken, isAuthenticated, authReady,
        login, register, updateAccount, logout, refreshCurrentUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}

export default AuthProvider;
