import { useState } from "react";
import { Badge } from "../ui";
import Sheet from "../ui/Sheet";
import { Tabs, TabsContent } from "../ui/Tabs";
import { notifications as mockNotifications } from "../../mockData";
import { Bell, AlertTriangle, Info } from "lucide-react";

const types = ["All", "Critical", "System"];
const typeColors = { Critical: "red", System: "navy", Info: "teal" };
const typeIcons = { Critical: AlertTriangle, System: Bell, Info: Info };

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
    setNotifs((prev) => prev.map((n) => (n.id === id ? { ...n, read: !n.read } : n)));
  }

  function markAllRead() {
    setNotifs((prev) => prev.map((n) => ({ ...n, read: true })));
  }

  return (
    <>
      <button
        type="button"
        className="fixed top-4 right-4 z-[1400] h-10 w-10 rounded-full bg-card border shadow-sm flex items-center justify-center cursor-pointer hover:bg-accent transition-colors"
        onClick={() => setOpen(true)}
        aria-label={`Notifications (${unreadCount} unread)`}
      >
        <Bell className="h-[18px] w-[18px] text-muted-foreground" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 h-2.5 w-2.5 rounded-full bg-red-500" />
        )}
      </button>

      <Sheet isOpen={open} onClose={() => setOpen(false)}>
        <div className="flex items-center justify-between px-4 py-3">
          <h2 className="text-lg font-bold">Notifications</h2>
        </div>

        <div className="px-4 pb-3 border-b">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            {types.map((tab) => (
              <TabsContent key={tab} value={tab}>{tab}</TabsContent>
            ))}
          </Tabs>
        </div>

        <div className="px-4 py-3 flex-1 overflow-y-auto">
          {filtered.map((notif) => (
            <div
              key={notif.id}
              className={`flex gap-3 py-3 border-b border-border cursor-pointer ${notif.read ? "opacity-55" : ""}`}
              onClick={() => toggleRead(notif.id)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === "Enter" && toggleRead(notif.id)}
            >
              {(() => {
                const Icon = typeIcons[notif.type] || Info;
                const iconColor = notif.type === "Critical" ? "text-red-500" : notif.type === "System" ? "text-blue-500" : "text-teal-500";
                return <Icon className={`h-4 w-4 mt-1 shrink-0 ${iconColor}`} />;
              })()}
              {!notif.read && <span className="h-2 w-2 rounded-full bg-primary mt-1.5 shrink-0" />}
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-0.5">
                  <p className="text-sm font-semibold">{notif.title}</p>
                  <Badge color={typeColors[notif.type] || "grey"} text={notif.type} />
                </div>
                <p className="text-[13px] leading-relaxed mb-1.5">{notif.body}</p>
                <span className="text-[11px] text-muted-foreground">
                  {new Date(notif.timestamp).toLocaleString([], { dateStyle: "short", timeStyle: "short" })}
                </span>
              </div>
            </div>
          ))}
          {!filtered.length && (
            <p className="text-muted-foreground text-center py-6">
              No {activeTab === "All" ? "notifications" : activeTab.toLowerCase()} notifications.
            </p>
          )}
          <button
            type="button"
            className="w-full mt-4 py-2 border rounded-md text-sm font-semibold text-primary hover:bg-primary/5 transition-colors"
            onClick={markAllRead}
          >
            Mark all as read
          </button>
        </div>
      </Sheet>
    </>
  );
}
