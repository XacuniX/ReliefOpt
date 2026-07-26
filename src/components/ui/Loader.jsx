const sizeMap = {
  sm: 20,
  md: 36,
  lg: 52,
};

const keyframes = `
@keyframes reliefopt-loader-spin {
  to { transform: rotate(360deg); }
}`;

if (typeof document !== "undefined") {
  const id = "reliefopt-loader-style";
  if (!document.getElementById(id)) {
    const style = document.createElement("style");
    style.id = id;
    style.textContent = keyframes;
    document.head.appendChild(style);
  }
}

export default function Loader({ size = "md" }) {
  const px = sizeMap[size] || sizeMap.md;
  const borderWidth = size === "sm" ? 2 : size === "lg" ? 4 : 3;

  const wrapperStyle = {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "16px",
  };

  const spinnerStyle = {
    width: `${px}px`,
    height: `${px}px`,
    border: `${borderWidth}px solid var(--color-smoke)`,
    borderTopColor: "var(--color-teal)",
    borderRadius: "50%",
    animation: "reliefopt-loader-spin 0.7s linear infinite",
  };

  return (
    <div style={wrapperStyle}>
      <div style={spinnerStyle} />
    </div>
  );
}
