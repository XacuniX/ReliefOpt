import { useEffect } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "../../lib/utils";

export default function Sheet({ isOpen, onClose, side = "right", children }) {
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
    const handler = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const positions = {
    right: "right-0 top-0 h-full w-full max-w-sm animate-[sheet-slide-in_0.25s_ease]",
    left: "left-0 top-0 h-full w-full max-w-sm",
  };

  return createPortal(
    <>
      <div className="fixed inset-0 z-40 bg-black/30" onClick={onClose} />
      <aside
        className={cn(
          "fixed z-50 shadow-2xl flex flex-col border-l border-teal-500/20 dark:border-white/20 bg-white/90 dark:bg-white/10 backdrop-blur-lg",
          positions[side] || positions.right
        )}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <button
            onClick={onClose}
            className="ml-auto rounded-md p-1 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">{children}</div>
      </aside>
    </>,
    document.body
  );
}
