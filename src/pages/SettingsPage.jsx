import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useData } from "../context/DataContext";
import { usePreferences } from "../context/PreferencesContext";
import { useTheme } from "../context/ThemeContext";
import { AuthApiError } from "../lib/authApi";
import { Badge, Button, Card, Input, Toast } from "../components/ui";
import { clearDomainCache } from "../lib/db";
import { clearTileCache, getTileCacheLimit, getTileCacheSize, setTileCacheLimit } from "../lib/tileCache";

const ACCOUNT_UPDATE_ERROR_MESSAGES = {
  CURRENT_PASSWORD_REQUIRED: "Enter your current password to continue.",
  INVALID_CURRENT_PASSWORD: "Current password is incorrect.",
  EMAIL_TAKEN: "That email is already in use.",
  PASSWORD_MISMATCH: "New password confirmation does not match.",
  WEAK_PASSWORD: "New password must contain at least 12 characters.",
  VALIDATION_ERROR: "Enter a valid email address.",
};

const emptySecurityForm = { email: "", currentPassword: "", newPassword: "", confirmNewPassword: "" };

function AccountSecuritySection({ currentUser, updateAccount }) {
  const [form, setForm] = useState({ ...emptySecurityForm, email: currentUser.email || "" });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const update = (field) => (event) => setForm((current) => ({ ...current, [field]: event.target.value }));

  async function submit(event) {
    event.preventDefault();
    setError("");
    if (!form.currentPassword) {
      setError("Enter your current password to continue.");
      return;
    }
    if (form.newPassword && form.newPassword !== form.confirmNewPassword) {
      setError("New password confirmation does not match.");
      return;
    }
    if (form.newPassword && form.newPassword.length < 12) {
      setError("New password must contain at least 12 characters.");
      return;
    }
    const emailChanged = form.email.trim() && form.email.trim() !== currentUser.email;
    if (!emailChanged && !form.newPassword) {
      setError("Change your email or set a new password before saving.");
      return;
    }

    setSaving(true);
    try {
      const changingPassword = Boolean(form.newPassword);
      await updateAccount({
        ...(emailChanged ? { email: form.email.trim() } : {}),
        currentPassword: form.currentPassword,
        ...(changingPassword ? { newPassword: form.newPassword, confirmNewPassword: form.confirmNewPassword } : {}),
      });
      // A password change signs the session out (see AuthContext.updateAccount), which unmounts
      // this page — skip the state update rather than setting state on an unmounted component.
      if (!changingPassword) {
        setForm({ ...emptySecurityForm, email: emailChanged ? form.email.trim() : currentUser.email || "" });
      }
    } catch (updateError) {
      if (updateError instanceof AuthApiError) {
        setError(ACCOUNT_UPDATE_ERROR_MESSAGES[updateError.code] || "Unable to update your account.");
      } else {
        setError("Unable to update your account.");
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <form onSubmit={submit}>
        <Input label="Email" type="email" value={form.email} onChange={update("email")} autoComplete="email" />
        <Input label="New Password (optional)" type="password" value={form.newPassword} onChange={update("newPassword")} autoComplete="new-password" minLength={12} />
        <Input label="Confirm New Password" type="password" value={form.confirmNewPassword} onChange={update("confirmNewPassword")} autoComplete="new-password" minLength={12} />
        <Input label="Current Password" type="password" value={form.currentPassword} onChange={update("currentPassword")} autoComplete="current-password" required />
        {form.newPassword && (
          <p className="text-sm text-amber-700 dark:text-amber-400 -mt-2 mb-4">
            Changing your password signs out this session.
          </p>
        )}
        {error && <p role="alert" className="text-sm text-red-600 dark:text-red-400 mb-4">{error}</p>}
        <Button type="submit" loading={saving}>Save Changes</Button>
      </form>
    </Card>
  );
}

export default function SettingsPage() {
  const { currentUser, updateAccount } = useAuth();
  const { lastSyncedAt, refreshSnapshot } = useData();
  const { theme, setTheme } = useTheme();
  const { language, notificationSound, setLanguage, setNotificationSound, t } = usePreferences();
  const [cacheSize, setCacheSize] = useState(50);
  const [storedTileSize, setStoredTileSize] = useState(0);
  const [clearing, setClearing] = useState(false);
  const [toast, setToast] = useState(null);

  const roleColors = { central_admin: "navy", warehouse_manager: "amber", field_worker: "teal" };

  useEffect(() => {
    setCacheSize(Math.round(getTileCacheLimit() / (1024 * 1024)));
    getTileCacheSize().then(setStoredTileSize);
  }, []);

  async function changeCacheSize(value) {
    setCacheSize(value);
    setStoredTileSize(await setTileCacheLimit(value * 1024 * 1024));
  }

  async function clearCache() {
    setClearing(true);
    try {
      await clearDomainCache({ preserveOutbox: true });
      localStorage.removeItem("reliefopt-shadow-state");
      const tilesCleared = await clearTileCache();
      setStoredTileSize(0);
      const refreshed = await refreshSnapshot({ force: true }).catch(() => false);
      setToast({
        type: "success",
        message: `Domain cache, drafts${tilesCleared ? ", and map tiles" : ""} cleared. Your session, preferences, and proposal outbox were preserved${refreshed ? " and server data was reloaded" : ""}.`,
      });
    } catch {
      setToast({ type: "error", message: "Failed to clear cache." });
    } finally {
      setClearing(false);
      setTimeout(() => setToast(null), 5000);
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="mb-6 text-2xl font-bold text-foreground">{t("settings")}</h1>

      <section className="mb-8">
        <h2 className="mb-4 text-lg font-bold">{t("profile")}</h2>
        <Card>
          <div className="mb-4 flex items-center gap-4">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-lg font-bold text-primary-foreground">
              {currentUser.name.split(" ").map((word) => word[0]).join("").slice(0, 2).toUpperCase()}
            </span>
            <div>
              <p className="font-bold">{currentUser.name}</p>
              <Badge color={roleColors[currentUser.role]} text={currentUser.role.replace(/_/g, " ")} />
            </div>
          </div>
          <p className="mb-2 text-sm"><strong>Email:</strong> {currentUser.email}</p>
          <p className="text-sm"><strong>User ID:</strong> {currentUser.id}</p>
        </Card>
      </section>

      <section className="mb-8">
        <h2 className="mb-4 text-lg font-bold">Security</h2>
        <AccountSecuritySection currentUser={currentUser} updateAccount={updateAccount} />
      </section>

      <section className="mb-8">
        <h2 className="mb-4 text-lg font-bold">{t("preferences")}</h2>
        <Card>
          <label className="mb-4 flex items-center justify-between text-sm">
            <span>Theme</span>
            <select value={theme} onChange={(event) => setTheme(event.target.value)} className="rounded-md border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
              <option value="light">Light</option>
              <option value="dark">Dark</option>
              <option value="system">System</option>
            </select>
          </label>

          <div className="mb-4 text-sm">
            <div className="flex items-center justify-between">
              <span>{t("language")}</span>
              <div className="flex overflow-hidden rounded-md border">
                {[["English", "English"], ["Bangla", "বাংলা"]].map(([value, label]) => (
                  <button key={value} type="button" className={`px-3 py-1.5 text-xs font-semibold transition-colors ${language === value ? "bg-primary text-primary-foreground" : "bg-background text-foreground hover:bg-accent"}`} onClick={() => setLanguage(value)}>{label}</button>
                ))}
              </div>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">The selected language is applied to primary navigation and settings labels.</p>
          </div>

          <label className="mb-4 block text-sm">
            <span className="mb-1.5 block">Map tile cache size: {cacheSize} MB</span>
            <input type="range" min="10" max="200" step="10" value={cacheSize} onChange={(event) => changeCacheSize(Number(event.target.value))} className="w-full accent-primary" />
            <span className="mt-1 block text-xs text-muted-foreground">Currently stored: {(storedTileSize / (1024 * 1024)).toFixed(1)} MB. Older tiles are removed when this limit is exceeded.</span>
          </label>

          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={notificationSound} onChange={(event) => setNotificationSound(event.target.checked)} className="accent-primary" />
            {t("notificationSounds")}
          </label>
        </Card>
      </section>

      <section className="mb-8">
        <h2 className="mb-4 text-lg font-bold">{t("about")}</h2>
        <Card>
          <p className="mb-2 text-sm"><strong>App Version:</strong> v0.0.1</p>
          <p className="mb-2 text-sm"><strong>{t("lastSync")}:</strong> {lastSyncedAt ? new Date(lastSyncedAt).toLocaleString() : "Not yet synchronized"}</p>
          <p className="mb-4 text-sm"><strong>Cache Status:</strong> Active ({(storedTileSize / (1024 * 1024)).toFixed(1)} MB of {cacheSize} MB)</p>
          <Button variant="outline" size="sm" onClick={clearCache} disabled={clearing}>{clearing ? "Clearing…" : t("clearCache")}</Button>
          <p className="mt-2 text-xs text-muted-foreground">Clears authoritative cached data, drafts, and map tiles. It preserves your signed-in session, preferences, and proposal outbox, then reloads server data when online.</p>
        </Card>
      </section>

      {toast && <Toast type={toast.type} message={toast.message} onDismiss={() => setToast(null)} />}
    </div>
  );
}
