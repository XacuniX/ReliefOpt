export default function Select({
  label,
  value,
  onChange,
  options = [],
  error,
  disabled = false,
  style: extraStyle,
}) {
  const labelStyle = {
    display: "block",
    marginBottom: "6px",
    fontSize: "14px",
    fontWeight: 600,
    color: "var(--color-navy)",
  };

  const selectStyle = {
    width: "100%",
    padding: "10px 12px",
    fontSize: "15px",
    fontFamily: "inherit",
    border: error
      ? "1.5px solid #C0392B"
      : "1.5px solid var(--color-mid)",
    borderRadius: "6px",
    outline: "none",
    background: disabled ? "var(--color-smoke)" : "var(--color-white)",
    color: "var(--color-navy)",
    transition: "border-color 0.2s ease",
    boxSizing: "border-box",
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.6 : 1,
    appearance: "none",
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath d='M2 4l4 4 4-4' fill='none' stroke='%23666' stroke-width='1.5'/%3E%3C/svg%3E")`,
    backgroundRepeat: "no-repeat",
    backgroundPosition: "right 12px center",
    paddingRight: "32px",
  };

  const errorStyle = {
    marginTop: "4px",
    fontSize: "13px",
    color: "#C0392B",
  };

  return (
    <div style={{ marginBottom: "16px", ...extraStyle }}>
      {label && <label style={labelStyle}>{label}</label>}
      <select
        value={value}
        onChange={onChange}
        disabled={disabled}
        style={selectStyle}
        onFocus={(e) => {
          e.target.style.borderColor = "var(--color-teal)";
        }}
        onBlur={(e) => {
          e.target.style.borderColor = error
            ? "#C0392B"
            : "var(--color-mid)";
        }}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && <div style={errorStyle}>{error}</div>}
    </div>
  );
}
