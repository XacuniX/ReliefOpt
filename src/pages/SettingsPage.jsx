import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { Badge, Button, Card, Toast } from "../components/ui";
import { useTheme } from "../context/ThemeContext";
import {
  clearTileCache,
  getTileCacheLimit,
  getTileCacheSize,
  setTileCacheLimit,
} from "../lib/tileCache";

export default function SettingsPage() {
  const { currentUser } = useAuth();
  const { theme, setTheme } = useTheme();
  const [language, setLanguage] = useState("English");
  const [cacheSize, setCacheSize] = useState(50);
  const [storedTileSize, setStoredTileSize] = useState(0);
  const [notifSound, setNotifSound] = useState(true);
  const [toast, setToast] = useState(null);

  const roleColors = { central_admin: "navy", warehouse_manager: "amber", field_worker: "teal" };

  useEffect(() => {
    setCacheSize(Math.round(getTileCacheLimit() / (1024 * 1024)));
    getTileCacheSize().then(setStoredTileSize);
  }, []);

  async function changeCacheSize(value) {
    setCacheSize(value);
    const remainingBytes = await setTileCacheLimit(value * 1024 * 1024);
    setStoredTileSize(remainingBytes);
  }

  async function clearCache() {
    try {
      // Keep the user's tile-cache preference while clearing cached data.
      const keys = Object.keys(localStorage).filter(
        (k) => k.startsWith("reliefopt-") && k !== "reliefopt-tile-cache-limit",
      );
      keys.forEach((k) => localStorage.removeItem(k));
      const tilesCleared = await clearTileCache();
      setStoredTileSize(0);
      setToast({
        type: "success",
        message: `Cache cleared (${keys.length} local entries${tilesCleared ? " and map tiles" : ""} removed).`,
      });
    } catch {
      setToast({ type: "error", message: "Failed to clear cache." });
    }
    setTimeout(() => setToast(null), 3000);
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-foreground mb-6">Settings</h1>

      <section className="mb-8">
        <h2 className="text-lg font-bold mb-4">Profile</h2>
        <Card>
          <div className="flex items-center gap-4 mb-4">
            <span className="h-14 w-14 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-lg font-bold">
              {currentUser.name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()}
            </span>
            <div>
              <p className="font-bold">{currentUser.name}</p>
              <Badge color={roleColors[currentUser.role]} text={currentUser.role.replace(/_/g, " ")} />
            </div>
          </div>
          <p className="text-sm"><strong>User ID:</strong> {currentUser.id}</p>
        </Card>
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-bold mb-4">Preferences</h2>
        <Card>
          <div className="mb-4 text-sm">
            <label className="flex items-center justify-between">
              <span>Theme</span>
              <select
                value={theme}
                onChange={(e) => setTheme(e.target.value)}
                className="rounded-md border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="light">Light</option>
                <option value="dark">Dark</option>
                <option value="system">System</option>
              </select>
            </label>
          </div>

          <div className="mb-4 text-sm">
            <label className="flex items-center justify-between">
              <span>Language</span>
              <div className="flex rounded-md border overflow-hidden">
                <button
                  type="button"
                  className={`px-3 py-1.5 text-xs font-semibold transition-colors ${language === "English" ? "bg-primary text-primary-foreground" : "bg-background text-foreground hover:bg-accent"}`}
                  onClick={() => setLanguage("English")}
                >
                  English
                </button>
                <button
                  type="button"
                  className={`px-3 py-1.5 text-xs font-semibold transition-colors ${language === "Bangla" ? "bg-primary text-primary-foreground" : "bg-background text-foreground hover:bg-accent"}`}
                  onClick={() => setLanguage("Bangla")}
                >
                  বাংলা
                </button>
              </div>
            </label>
          </div>

          <div className="mb-4 text-sm">
            <label>
              <span className="block mb-1.5">Map tile cache size: {cacheSize} MB</span>
              <input
                type="range"
                min="10"
                max="200"
                step="10"
                value={cacheSize}
                onChange={(e) => changeCacheSize(Number(e.target.value))}
                className="w-full accent-primary"
              />
              <span className="mt-1 block text-xs text-muted-foreground">
                Currently stored: {(storedTileSize / (1024 * 1024)).toFixed(1)} MB. Older tiles are removed when this limit is exceeded.
              </span>
            </label>
          </div>

          <div className="text-sm">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={notifSound}
                onChange={(e) => setNotifSound(e.target.checked)}
                className="accent-primary"
              />
              Notification sounds
            </label>
          </div>
        </Card>
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-bold mb-4">About</h2>
        <Card>
          <p className="text-sm mb-2"><strong>App Version:</strong> v0.0.1</p>
          <p className="text-sm mb-2"><strong>Last Sync:</strong> {new Date().toLocaleString()}</p>
          <p className="text-sm mb-4"><strong>Cache Status:</strong> Active ({(storedTileSize / (1024 * 1024)).toFixed(1)} MB of {cacheSize} MB)</p>
          <Button variant="outline" size="sm" onClick={clearCache}>Clear Cache</Button>
        </Card>
      </section>

      {toast && (
        <Toast type={toast.type} message={toast.message} onDismiss={() => setToast(null)} />
      )}
    </div>
  );
}
