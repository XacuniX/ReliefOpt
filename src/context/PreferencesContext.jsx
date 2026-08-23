import { createContext, useContext, useEffect, useMemo, useState } from "react";

const KEY = "reliefopt-preferences";
const PreferencesContext = createContext(null);
const dictionaries = {
  English: {
    dashboard: "Dashboard", map: "Map", reports: "Reports", submitReport: "Submit Report",
    inventory: "Inventory", tasks: "Tasks", cargo: "Cargo", users: "Users", settings: "Settings",
    preferences: "Preferences", profile: "Profile", about: "About", language: "Language",
    notificationSounds: "Notification sounds", clearCache: "Clear Cache", lastSync: "Last Sync",
  },
  Bangla: {
    dashboard: "ড্যাশবোর্ড", map: "মানচিত্র", reports: "প্রতিবেদন", submitReport: "প্রতিবেদন জমা দিন",
    inventory: "মজুত", tasks: "কাজ", cargo: "পণ্য পরিবহন", users: "ব্যবহারকারী", settings: "সেটিংস",
    preferences: "পছন্দসমূহ", profile: "প্রোফাইল", about: "সম্পর্কে", language: "ভাষা",
    notificationSounds: "নোটিফিকেশন শব্দ", clearCache: "ক্যাশ পরিষ্কার করুন", lastSync: "সর্বশেষ সিঙ্ক",
  },
};

function readPreferences() {
  try {
    return { language: "English", notificationSound: true, ...JSON.parse(localStorage.getItem(KEY) || "{}") };
  } catch {
    return { language: "English", notificationSound: true };
  }
}

export default function PreferencesProvider({ children }) {
  const [preferences, setPreferences] = useState(readPreferences);
  useEffect(() => {
    localStorage.setItem(KEY, JSON.stringify(preferences));
    document.documentElement.lang = preferences.language === "Bangla" ? "bn" : "en";
  }, [preferences]);
  const value = useMemo(() => ({
    ...preferences,
    setLanguage: (language) => setPreferences((current) => ({ ...current, language })),
    setNotificationSound: (notificationSound) => setPreferences((current) => ({ ...current, notificationSound })),
    t: (key) => dictionaries[preferences.language]?.[key] || dictionaries.English[key] || key,
  }), [preferences]);
  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}

export function usePreferences() {
  const context = useContext(PreferencesContext);
  if (!context) throw new Error("usePreferences must be used within PreferencesProvider");
  return context;
}
