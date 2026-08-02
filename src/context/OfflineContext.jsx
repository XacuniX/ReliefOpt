import { createContext, useContext, useState, useEffect } from "react";

const OfflineContext = createContext(null);

export function OfflineProvider({ children }) {
  const [isOffline, setIsOffline] = useState(() => !navigator.onLine);

  useEffect(() => {
    function handleOnline() { setIsOffline(false); }
    function handleOffline() { setIsOffline(true); }
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  function toggleOffline() {
    setIsOffline((prev) => !prev);
  }

  return (
    <OfflineContext.Provider value={{ isOffline, toggleOffline }}>
      {children}
    </OfflineContext.Provider>
  );
}

export function useOffline() {
  const ctx = useContext(OfflineContext);
  if (!ctx) {
    return { isOffline: false, toggleOffline: () => {} };
  }
  return ctx;
}
