import { useEffect, useRef, useState } from "react";
import { AlertTriangle, Bell, Info } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useData } from "../../context/DataContext";
import { usePreferences } from "../../context/PreferencesContext";
import { cn } from "../../lib/utils";
import Badge from "./Badge";

const typeColors = { Critical: "red", System: "navy", Info: "teal" };
const typeIcons = { Critical: AlertTriangle, System: Bell, Info };

function playNotificationTone() {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    const context = new AudioContext();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.frequency.value = 660;
    gain.gain.setValueAtTime(0.08, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.18);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + 0.18);
  } catch {
    // Browsers may block sound until the first user gesture.
  }
}

export function NotificationPopover({ buttonClassName }) {
  const { notifications, markNotificationRead, markAllNotificationsRead } = useData();
  const { notificationSound } = usePreferences();
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("All");
  const previousUnread = useRef(notifications.filter((item) => !item.read).length);
  const unreadCount = notifications.filter((item) => !item.read).length;
  const filtered = notifications.filter((item) => activeTab === "All" || item.type === activeTab);

  useEffect(() => {
    if (notificationSound && unreadCount > previousUnread.current) playNotificationTone();
    previousUnread.current = unreadCount;
  }, [notificationSound, unreadCount]);

  return (
    <div className="relative">
      <button type="button" onClick={() => setIsOpen((open) => !open)} aria-label={`Notifications (${unreadCount} unread)`}
        className={cn("relative h-10 w-10 rounded-full flex items-center justify-center bg-white/80 dark:bg-[#0b1215] border border-teal-500/20", buttonClassName)}>
        <Bell className="h-[18px] w-[18px]" />
        {unreadCount > 0 && <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full grid place-items-center text-[10px] font-bold text-white bg-red-500">{unreadCount}</span>}
      </button>
      <AnimatePresence>{isOpen && <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
        className="absolute right-0 mt-2 w-80 sm:w-96 max-h-[420px] overflow-y-auto rounded-xl shadow-xl z-[2000] bg-white dark:bg-[#0b1215] border">
        <div className="p-4 border-b flex justify-between items-center">
          <h3 className="text-sm font-bold">Notifications</h3>
          <button type="button" onClick={() => markAllNotificationsRead()} disabled={!unreadCount} className="text-xs font-semibold text-teal-600 disabled:opacity-50">Mark all as read</button>
        </div>
        <div className="px-4 py-2 border-b flex gap-1">{["All", "Critical", "System", "Info"].map((tab) => (
          <button key={tab} type="button" onClick={() => setActiveTab(tab)} className={cn("px-3 py-1 rounded-md text-xs font-semibold", activeTab === tab ? "bg-teal-500/15 text-teal-700" : "text-muted-foreground")}>{tab}</button>
        ))}</div>
        {!filtered.length ? <p className="text-muted-foreground text-center py-6 text-sm">No notifications.</p> : filtered.map((notification, index) => {
          const Icon = typeIcons[notification.type] || Info;
          return <motion.button type="button" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.03 }}
            key={notification.id} onClick={() => markNotificationRead(notification.id, true)}
            className={cn("block w-full text-left p-4 border-b hover:bg-muted/60", notification.read && "opacity-55")}>
            <div className="flex items-start gap-2"><Icon className="h-4 w-4 mt-0.5 shrink-0" /><div className="min-w-0 flex-1">
              <div className="flex items-center gap-2"><strong className="text-sm truncate">{notification.title}</strong><Badge color={typeColors[notification.type]} text={notification.type} /></div>
              <p className="text-xs text-muted-foreground mt-1">{notification.body}</p>
              <p className="text-[10px] text-muted-foreground mt-1">{new Date(notification.timestamp).toLocaleString()}</p>
            </div></div>
          </motion.button>;
        })}
      </motion.div>}</AnimatePresence>
    </div>
  );
}
