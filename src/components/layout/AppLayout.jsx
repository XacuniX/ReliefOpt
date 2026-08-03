import { useState } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import BottomNav from "./BottomNav";
import SyncIndicator from "../sync/SyncIndicator";

export default function AppLayout() {
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem("reliefopt-sidebar-collapsed") === "true";
    } catch {
      return false;
    }
  });

  function handleToggleCollapse() {
    const next = !collapsed;
    setCollapsed(next);
    try {
      localStorage.setItem("reliefopt-sidebar-collapsed", String(next));
    } catch {}
  }

  return (
    <>
      <Sidebar collapsed={collapsed} onToggleCollapse={handleToggleCollapse} />
      <main
        className={`min-h-screen transition-all duration-200 px-4 pt-14 md:pt-0 pb-20 md:pb-6 ${collapsed ? "md:pl-16" : "md:pl-60"}`}
      >
        <div className="fixed top-2 right-16 z-[100] hidden md:block">
          <SyncIndicator />
        </div>
        <Outlet />
      </main>
      <BottomNav />
    </>
  );
}
