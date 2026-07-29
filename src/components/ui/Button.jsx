import { useState } from "react";

const sizeMap = {
  sm: { padding: "6px 12px", fontSize: "13px" },
  md: { padding: "10px 20px", fontSize: "15px" },
  lg: { padding: "14px 28px", fontSize: "17px" },
};

const spinnerKeyframes = `
@keyframes reliefopt-btn-spin {
  to { transform: rotate(360deg); }
}`;

// Inject keyframes once
if (typeof document !== "undefined") {
  const id = "reliefopt-btn-spin-style";
  if (!document.getElementById(id)) {
    const style = document.createElement("style");
    style.id = id;
    style.textContent = spinnerKeyframes;
    document.head.appendChild(style);
  }
}

export default function Button({
  variant = "primary",
  size = "md",
  loading = false,
  onClick,
  children,
  disabled = false,
  style: extraStyle,
  type = "button",
  ...props
}) {
  const [hovered, setHovered] = useState(false);

  const base = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    border: "none",
    borderRadius: "6px",
    fontWeight: 600,
    cursor: disabled || loading ? "not-allowed" : "pointer",
    opacity: disabled ? 0.5 : 1,
    transition: "all 0.2s ease",
    fontFamily: "inherit",
    lineHeight: 1.4,
    ...sizeMap[size] || sizeMap.md,
  };

  const variants = {
    primary: {
      background: `var(--color-teal)`,
      color: `var(--color-white)`,
      border: "none",
      ...(hovered && !disabled && !loading
        ? { filter: "brightness(1.1)" }
        : {}),
    },
    danger: {
      background: "#C0392B",
      color: `var(--color-white)`,
      border: "none",
      ...(hovered && !disabled && !loading
        ? { filter: "brightness(1.1)" }
        : {}),
    },
    ghost: {
      background: "transparent",
      color: `var(--color-navy)`,
      border: `1.5px solid var(--color-navy)`,
      ...(hovered && !disabled && !loading
        ? { background: "var(--color-smoke)" }
        : {}),
    },
  };

  const spinnerStyle = {
    display: "inline-block",
    width: size === "sm" ? "12px" : size === "lg" ? "18px" : "14px",
    height: size === "sm" ? "12px" : size === "lg" ? "18px" : "14px",
    border: "2px solid transparent",
    borderTopColor: "currentColor",
    borderRadius: "50%",
    animation: "reliefopt-btn-spin 0.6s linear infinite",
  };

  return (
    <button
      type={type}
      style={{ ...base, ...variants[variant], ...extraStyle }}
      onClick={disabled || loading ? undefined : onClick}
      disabled={disabled || loading}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      {...props}
    >
      {loading && <span style={spinnerStyle} />}
      {children}
    </button>
  );
}
