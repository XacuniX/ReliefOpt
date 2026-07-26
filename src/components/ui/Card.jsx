export default function Card({ children, style: extraStyle }) {
  const cardStyle = {
    background: "var(--color-white)",
    borderRadius: "8px",
    padding: "16px",
    boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
    ...extraStyle,
  };

  return <div style={cardStyle}>{children}</div>;
}
