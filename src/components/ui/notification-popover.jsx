import React, { useState } from "react";
import { Bell, AlertTriangle, Info } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "../../lib/utils";
import Badge from "./Badge";
import { notifications as mockNotifications } from "../../mockData";

const typeColors = { Critical: "red", System: "navy", Info: "teal" };
const typeIcons = { Critical: AlertTriangle, System: Bell, Info: Info };
const types = ["All", "Critical", "System"];

const NotificationItem = ({
  notification,
  index,
  onMarkAsRead,
}) => {
  const Icon = typeIcons[notification.type] || Info;
  const iconColor =
    notification.type === "Critical"
      ? "text-red-500"
      : notification.type === "System"
      ? "text-blue-500"
      : "text-teal-500";

  return (
    <motion.div
      initial={{ opacity: 0, x: 20, filter: "blur(10px)" }}
      animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      key={notification.id}
      className={cn(
        "p-4 cursor-pointer transition-colors hover:bg-slate-100/70 dark:hover:bg-white/10 border-b border-slate-200/60 dark:border-white/10",
        notification.read && "opacity-55"
      )}
      onClick={() => onMarkAsRead(notification.id)}
    >
      <div className="flex justify-between items-start gap-2">
        <div className="flex items-center gap-2 min-w-0">
          {!notification.read && (
            <span className="h-2 w-2 rounded-full bg-teal-500 dark:bg-teal-400 mt-1.5 shrink-0" />
          )}
          <Icon className={`h-4 w-4 mt-0.5 shrink-0 ${iconColor}`} />
          <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
            {notification.title}
          </h4>
          <Badge color={typeColors[notification.type] || "grey"} text={notification.type} />
        </div>

        <span className="text-[11px] text-slate-500 dark:text-slate-400 shrink-0 mt-0.5 max-w-[110px] truncate">
          {new Date(notification.timestamp).toLocaleString([], {
            dateStyle: "medium",
            timeStyle: "short",
          })}
        </span>
      </div>
      <p className="text-xs text-slate-600 dark:text-slate-300 mt-1.5 leading-relaxed">
        {notification.body}
      </p>
    </motion.div>
  );
};

const NotificationList = ({ notifications, onMarkAsRead }) => (
  <div>
    {notifications.map((notification, index) => (
      <NotificationItem
        key={notification.id}
        notification={notification}
        index={index}
        onMarkAsRead={onMarkAsRead}
      />
    ))}
  </div>
);

export const NotificationPopover = ({
  notifications: initialNotifications = mockNotifications,
  onNotificationsChange,
  buttonClassName,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("All");
  const [notifications, setNotifications] = useState(initialNotifications);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const filtered = notifications.filter((n) => {
    if (activeTab === "All") return true;
    return n.type === activeTab;
  });

  const toggleOpen = () => setIsOpen(!isOpen);

  const markAllAsRead = () => {
    const updated = notifications.map((n) => ({ ...n, read: true }));
    setNotifications(updated);
    onNotificationsChange?.(updated);
  };

  const markAsRead = (id) => {
    const updated = notifications.map((n) =>
      n.id === id ? { ...n, read: true } : n
    );
    setNotifications(updated);
    onNotificationsChange?.(updated);
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={toggleOpen}
        aria-label={`Notifications (${unreadCount} unread)`}
        className={cn(
          "h-10 w-10 rounded-full flex items-center justify-center cursor-pointer transition-all bg-white/80 dark:bg-[#0b1215] border border-teal-500/20 dark:border-teal-500/20 shadow-lg shadow-teal-900/5 dark:shadow-black/40 hover:border-teal-500/50",
          buttonClassName
        )}
      >
        <Bell className="h-[18px] w-[18px] text-slate-700 dark:text-muted-foreground" />
        {unreadCount > 0 && (
          <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white bg-red-500 border-2 border-white dark:border-[#0b1215]">
            {unreadCount}
          </div>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute right-0 mt-2 w-80 sm:w-96 max-h-[420px] overflow-y-auto overflow-x-hidden rounded-xl shadow-lg shadow-black/40 z-[2000] bg-white dark:bg-[#0b1215] border border-teal-500/25 dark:border-teal-500/20"
          >
            <div className="p-4 border-b border-slate-200/60 dark:border-white/10 flex justify-between items-center">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Notifications
              </h3>
              <button
                type="button"
                onClick={markAllAsRead}
                className="text-xs font-semibold text-teal-600 dark:text-teal-400 hover:underline"
              >
                Mark all as read
              </button>
            </div>

            {/* Tabs (same as old drawer) */}
            <div className="px-4 py-2 border-b border-slate-200/60 dark:border-white/10 flex gap-1">
              {types.map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  className={cn(
                    "px-3 py-1 rounded-md text-xs font-semibold transition-colors",
                    activeTab === tab
                      ? "bg-teal-500/15 text-teal-700 dark:bg-teal-500/25 dark:text-teal-300"
                      : "text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10 dark:hover:text-slate-200"
                  )}
                >
                  {tab}
                </button>
              ))}
            </div>

            <div>
              {filtered.length === 0 ? (
                <p className="text-slate-500 dark:text-slate-400 text-center py-6 text-sm">
                  No {activeTab === "All" ? "notifications" : activeTab.toLowerCase()} notifications.
                </p>
              ) : (
                <NotificationList
                  notifications={filtered}
                  onMarkAsRead={markAsRead}
                />
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
