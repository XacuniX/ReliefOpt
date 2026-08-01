import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { Badge, Button, Card } from "../components/ui";

const sectionStyle = { marginBottom: "var(--space-8)" };
const sectionTitle = { fontSize: "var(--text-lg)", fontWeight: 700, margin: "0 0 var(--space-4)" };
const rowStyle = { marginBottom: "var(--space-3)", fontSize: 14 };

const roleColors = { central_admin: "navy", warehouse_manager: "amber", field_worker: "teal" };

export default function SettingsPage() {
  const { currentUser } = useAuth();
  const [language, setLanguage] = useState("English");
  const [cacheSize, setCacheSize] = useState(50);
  const [notifSound, setNotifSound] = useState(true);

  const initials = currentUser.name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  function clearCache() {
    console.log("Cache cleared");
  }

  return (
    <main style={{ maxWidth: 720, margin: "0 auto" }}>
      <h1 style={{ fontSize: "var(--text-2xl)", margin: "0 0 var(--space-6)" }}>Settings</h1>

      <section style={sectionStyle}>
        <h2 style={sectionTitle}>Profile</h2>
        <Card>
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-4)", marginBottom: "var(--space-4)" }}>
            <span
              aria-label={`${currentUser.name} avatar`}
              style={{
                width: 56,
                height: 56,
                borderRadius: "50%",
                background: "var(--color-teal)",
                color: "var(--color-white)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 18,
                fontWeight: 700,
              }}
            >
              {initials}
            </span>
            <div>
              <p style={{ fontWeight: 700, margin: 0 }}>{currentUser.name}</p>
              <Badge color={roleColors[currentUser.role]} text={currentUser.role.replaceAll("_", " ")} />
            </div>
          </div>
          <p style={rowStyle}><strong>User ID:</strong> {currentUser.id}</p>
        </Card>
      </section>

      <section style={sectionStyle}>
        <h2 style={sectionTitle}>Preferences</h2>
        <Card>
          <div style={rowStyle}>
            <label style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span>Language</span>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                style={{
                  padding: "6px 10px",
                  border: "1.5px solid var(--color-mid)",
                  borderRadius: 6,
                  font: "inherit",
                  fontSize: 13,
                }}
              >
                <option value="English">English</option>
                <option value="Bangla">Bangla</option>
              </select>
            </label>
          </div>

          <div style={rowStyle}>
            <label>
              <span style={{ display: "block", marginBottom: 6 }}>
                Map tile cache size: {cacheSize} MB
              </span>
              <input
                type="range"
                min="10"
                max="200"
                step="10"
                value={cacheSize}
                onChange={(e) => setCacheSize(Number(e.target.value))}
                style={{ width: "100%", accentColor: "var(--color-teal)" }}
              />
            </label>
          </div>

          <div style={rowStyle}>
            <label style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
              <input
                type="checkbox"
                checked={notifSound}
                onChange={(e) => setNotifSound(e.target.checked)}
                style={{ accentColor: "var(--color-teal)" }}
              />
              Notification sounds
            </label>
          </div>
        </Card>
      </section>

      <section style={sectionStyle}>
        <h2 style={sectionTitle}>About</h2>
        <Card>
          <p style={rowStyle}><strong>App Version:</strong> v0.0.1</p>
          <p style={rowStyle}><strong>Last Sync:</strong> {new Date().toLocaleString()}</p>
          <p style={rowStyle}><strong>Cache Status:</strong> Active</p>
          <Button variant="ghost" size="sm" onClick={clearCache}>
            Clear Cache
          </Button>
        </Card>
      </section>
    </main>
  );
}
