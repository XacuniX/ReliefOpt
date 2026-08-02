import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { Badge, Button, Card } from "../components/ui";
import { Sun, Moon } from "lucide-react";
import { useTheme } from "../context/ThemeContext";

export default function SettingsPage() {
  const { currentUser } = useAuth();
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [language, setLanguage] = useState("English");
  const [cacheSize, setCacheSize] = useState(50);
  const [notifSound, setNotifSound] = useState(true);

  const roleColors = { central_admin: "navy", warehouse_manager: "amber", field_worker: "teal" };

  function clearCache() {
    console.log("Cache cleared");
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
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="rounded-md border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="English">English</option>
                <option value="Bangla">Bangla</option>
              </select>
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
                onChange={(e) => setCacheSize(Number(e.target.value))}
                className="w-full accent-primary"
              />
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
          <p className="text-sm mb-4"><strong>Cache Status:</strong> Active</p>
          <Button variant="outline" size="sm" onClick={clearCache}>Clear Cache</Button>
        </Card>
      </section>
    </div>
  );
}
