import { useEffect } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

export default function Dialog({ isOpen, onClose, title, children, persistent = false }) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    if (persistent) return;
    const handler = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isOpen, onClose, persistent]);

  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 animate-[dialog-fade-in_0.2s_ease]"
      onClick={(e) => {
        if (!persistent && e.target === e.currentTarget) onClose?.();
      }}
    >
      <div className="relative w-full max-w-lg max-h-[85vh] rounded-xl shadow-2xl animate-[dialog-slide-up_0.25s_ease] flex flex-col bg-white/90 dark:bg-white/10 backdrop-blur-lg border border-teal-500/20 dark:border-white/20">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-bold text-foreground m-0">{title}</h2>
          <button
            onClick={persistent ? undefined : onClose}
            disabled={persistent}
            className="rounded-md p-1 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-muted-foreground"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="px-6 py-4 overflow-y-auto flex-1">{children}</div>
      </div>
    </div>,
    document.body
  );
}
