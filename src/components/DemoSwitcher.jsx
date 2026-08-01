import { useAuth } from "../context/AuthContext";

const roles = [
  { key: "field_worker", label: "Field Worker" },
  { key: "warehouse_manager", label: "Warehouse Manager" },
  { key: "central_admin", label: "Central Admin" },
];

const panelStyle = {
  position: "fixed",
  bottom: 16,
  right: 16,
  zIndex: 9999,
  background: "var(--color-navy)",
  borderRadius: 10,
  padding: "12px 14px",
  boxShadow: "0 4px 20px rgba(0,0,0,.3)",
  minWidth: 180,
};

const labelStyle = {
  fontSize: 10,
  fontWeight: 700,
  color: "var(--color-amber)",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  margin: "0 0 8px",
};

const btnBase = {
  display: "block",
  width: "100%",
  border: "none",
  borderRadius: 6,
  padding: "6px 10px",
  marginBottom: 4,
  font: "inherit",
  fontSize: 12,
  fontWeight: 600,
  cursor: "pointer",
  color: "var(--color-white)",
  background: "transparent",
  textAlign: "left",
  transition: "background 0.15s",
};

export default function DemoSwitcher() {
  const { currentUser, setRole } = useAuth();

  return (
    <aside style={panelStyle} aria-label="Demo mode role switcher">
      <p style={labelStyle}>Demo Mode</p>
      {roles.map(({ key, label }) => {
        const active = currentUser.role === key;
        return (
          <button
            key={key}
            type="button"
            style={{
              ...btnBase,
              background: active ? "var(--color-teal)" : "transparent",
            }}
            onClick={() => setRole(key)}
            onMouseEnter={(e) => {
              if (!active) e.target.style.background = "rgba(255,255,255,0.1)";
            }}
            onMouseLeave={(e) => {
              if (!active) e.target.style.background = "transparent";
            }}
          >
            {label}
          </button>
        );
      })}
    </aside>
  );
}
