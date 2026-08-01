import { useState } from "react";
import { Badge } from "../ui";
import { notifications as mockNotifications } from "../../mockData";

const types = ["All", "Critical", "System"];
const typeColors = { Critical: "red", System: "navy", Info: "teal" };

const overlayStyle = {
  position: "fixed",
  inset: 0,
  zIndex: 1500,
  background: "rgba(0,0,0,.3)",
};

const drawerStyle = {
  position: "fixed",
  top: 0,
  right: 0,
  bottom: 0,
  width: 380,
  maxWidth: "95vw",
  background: "var(--color-white)",
  boxShadow: "-4px 0 24px rgba(0,0,0,.15)",
  zIndex: 1501,
  display: "flex",
  flexDirection: "column",
  animation: "reliefopt-drawer-slide 0.25s ease",
};

const headerStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "var(--space-5) var(--space-6)",
  borderBottom: "1px solid var(--color-smoke)",
};

const titleStyle = { fontSize: "var(--text-lg)", fontWeight: 700, margin: 0 };

const closeBtn = {
  background: "none",
  border: "none",
  fontSize: 22,
  cursor: "pointer",
  color: "var(--color-mid)",
  lineHeight: 1,
};

const tabsStyle = {
  display: "flex",
  gap: 4,
  padding: "var(--space-3) var(--space-6)",
  borderBottom: "1px solid var(--color-smoke)",
};

const tabStyle = (active) => ({
  background: active ? "var(--color-navy)" : "transparent",
  color: active ? "var(--color-white)" : "var(--color-navy)",
  border: "none",
  borderRadius: 6,
  padding: "6px 14px",
  font: "inherit",
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
});

const listStyle = {
  flex: 1,
  overflowY: "auto",
  padding: "var(--space-3) var(--space-6)",
};

const itemStyle = (read) => ({
  display: "flex",
  gap: "var(--space-3)",
  padding: "var(--space-3) 0",
  borderBottom: "1px solid var(--color-smoke)",
  opacity: read ? 0.55 : 1,
});

const dotStyle = { width: 8, height: 8, borderRadius: "50%", background: "var(--color-teal)", marginTop: 5, flexShrink: 0 };

const bodyStyle = { flex: 1 };

const itemTitleStyle = { fontSize: 14, fontWeight: 600, margin: "0 0 2px" };

const itemBodyStyle = { fontSize: 13, color: "var(--color-navy)", margin: "0 0 6px", lineHeight: 1.4 };

const timeStyle = { fontSize: 11, color: "var(--color-mid)" };

const markAllStyle = {
  display: "block",
  width: "100%",
  background: "transparent",
  border: "1px solid var(--color-smoke)",
  borderRadius: 6,
  padding: "var(--space-2) var(--space-3)",
  marginTop: "var(--space-4)",
  font: "inherit",
  fontSize: 13,
  fontWeight: 600,
  color: "var(--color-teal)",
  cursor: "pointer",
};

const bellBtnStyle = {
  position: "fixed",
  top: 16,
  right: 16,
  zIndex: 1400,
  background: "var(--color-white)",
  border: "1.5px solid var(--color-mid)",
  borderRadius: "50%",
  width: 42,
  height: 42,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
  fontSize: 18,
  boxShadow: "0 2px 8px rgba(0,0,0,.08)",
};

const badgeDot = {
  position: "absolute",
  top: 6,
  right: 6,
  width: 10,
  height: 10,
  borderRadius: "50%",
  background: "#C0392B",
};

const keyframes = `@keyframes reliefopt-drawer-slide { from { transform: translateX(100%); } to { transform: translateX(0); } }`;
if (typeof document !== "undefined" && !document.getElementById("reliefopt-drawer-style")) {
  const style = document.createElement("style");
  style.id = "reliefopt-drawer-style";
  style.textContent = keyframes;
  document.head.appendChild(style);
}

export default function NotifDrawer() {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("All");
  const [notifs, setNotifs] = useState(mockNotifications);
  const unreadCount = notifs.filter((n) => !n.read).length;

  const filtered = notifs.filter((n) => {
    if (activeTab === "All") return true;
    return n.type === activeTab;
  });

  function toggleRead(id) {
    setNotifs((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: !n.read } : n))
    );
  }

  function markAllRead() {
    setNotifs((prev) => prev.map((n) => ({ ...n, read: true })));
  }

  return (
    <>
      <button
        type="button"
        style={bellBtnStyle}
        onClick={() => setOpen(true)}
        aria-label={`Notifications (${unreadCount} unread)`}
      >
        🔔
        {unreadCount > 0 && <span style={badgeDot} />}
      </button>

      {open && (
        <>
          <div style={overlayStyle} onClick={() => setOpen(false)} />
          <aside style={drawerStyle} aria-label="Notifications panel">
            <div style={headerStyle}>
              <h2 style={titleStyle}>Notifications</h2>
              <button type="button" style={closeBtn} onClick={() => setOpen(false)} aria-label="Close notifications">
                ✕
              </button>
            </div>

            <div style={tabsStyle}>
              {types.map((tab) => (
                <button
                  key={tab}
                  type="button"
                  style={tabStyle(activeTab === tab)}
                  onClick={() => setActiveTab(tab)}
                >
                  {tab}
                </button>
              ))}
            </div>

            <div style={listStyle}>
              {filtered.map((notif) => (
                <div key={notif.id} style={itemStyle(notif.read)} onClick={() => toggleRead(notif.id)} role="button" tabIndex={0} onKeyDown={(e) => e.key === "Enter" && toggleRead(notif.id)}>
                  {!notif.read && <span style={dotStyle} />}
                  <div style={bodyStyle}>
                    <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", marginBottom: 2 }}>
                      <p style={itemTitleStyle}>{notif.title}</p>
                      <Badge color={typeColors[notif.type] || "grey"} text={notif.type} />
                    </div>
                    <p style={itemBodyStyle}>{notif.body}</p>
                    <span style={timeStyle}>{new Date(notif.timestamp).toLocaleString([], { dateStyle: "short", timeStyle: "short" })}</span>
                  </div>
                </div>
              ))}
              {!filtered.length && (
                <p style={{ color: "var(--color-mid)", textAlign: "center", padding: "var(--space-6) 0" }}>
                  No {activeTab === "All" ? "notifications" : activeTab.toLowerCase()} notifications.
                </p>
              )}
              <button type="button" style={markAllStyle} onClick={markAllRead}>
                Mark all as read
              </button>
            </div>
          </aside>
        </>
      )}
    </>
  );
}
