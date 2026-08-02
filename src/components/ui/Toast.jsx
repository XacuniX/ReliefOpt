import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "../../lib/utils";

const typeStyles = {
  success: "border-l-emerald-500",
  error: "border-l-red-500",
  warning: "border-l-amber-500",
  info: "border-l-teal-500",
};

export default function Toast({ type = "info", message, onDismiss, className }) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      onDismiss?.();
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  if (!visible) return null;

  return createPortal(
    <div
      className={cn(
        "fixed bottom-6 right-6 z-[2000] max-w-sm rounded-lg bg-card border border-border border-l-4 shadow-lg px-5 py-3.5 flex items-center gap-3 animate-[toast-slide-in_0.3s_ease-out]",
        typeStyles[type] || typeStyles.info,
        className
      )}
    >
      <span className="flex-1 text-sm text-foreground">{message}</span>
      <button
        onClick={() => {
          setVisible(false);
          onDismiss?.();
        }}
        className="text-muted-foreground hover:text-foreground"
        aria-label="Dismiss"
      >
        <X className="h-4 w-4" />
      </button>
    </div>,
    document.body
  );
}
