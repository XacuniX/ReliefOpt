import { useEffect, useState } from "react";

const typeColors = {
  success: "var(--color-success, #27AE60)",
  error: "#C0392B",
  warning: "var(--color-warning, #F39C12)",
  info: "var(--color-teal)",
};

const keyframes = `
@keyframes reliefopt-toast-in {
  from { transform: translateX(120%); opacity: 0; }
  to   { transform: translateX(0); opacity: 1; }
}`;

if (typeof document !== "undefined") {
  const id = "reliefopt-toast-style";
  if (!document.getElementById(id)) {
    const style = document.createElement("style");
    style.id = id;
    style.textContent = keyframes;
    document.head.appendChild(style);
  }
}

export default function Toast({ type = "info", message, onDismiss }) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      onDismiss?.();
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  if (!visible) return null;

  const borderColor = typeColors[type] || typeColors.info;

  const containerStyle = {
    position: "fixed",
    bottom: "24px",
    right: "24px",
    zIndex: 2000,
    background: "var(--color-white)",
    borderRadius: "8px",
    padding: "14px 20px",
    paddingLeft: "16px",
    borderLeft: `4px solid ${borderColor}`,
    boxShadow: "0 8px 24px rgba(0, 0, 0, 0.15)",
    maxWidth: "380px",
    display: "flex",
    alignItems: "center",
    gap: "12px",
    animation: "reliefopt-toast-in 0.3s ease-out",
    fontFamily: "inherit",
  };

  const messageStyle = {
    flex: 1,
    fontSize: "14px",
    color: "var(--color-navy)",
    lineHeight: 1.4,
  };

  const closeBtnStyle = {
    background: "none",
    border: "none",
    cursor: "pointer",
    fontSize: "16px",
    color: "var(--color-mid)",
    padding: "2px 4px",
    lineHeight: 1,
  };

  return (
    <div style={containerStyle}>
      <span style={messageStyle}>{message}</span>
      <button style={closeBtnStyle} onClick={() => { setVisible(false); onDismiss?.(); }} aria-label="Dismiss">
        ✕
      </button>
    </div>
  );
}
