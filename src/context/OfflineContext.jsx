import { createContext, useContext, useState } from "react";

const OfflineContext = createContext(null);

export function OfflineProvider({ children }) {
  const [isOffline, setIsOffline] = useState(true);

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
    return { isOffline: true, toggleOffline: () => {} };
  }
  return ctx;
}
