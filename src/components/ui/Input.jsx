export default function Input({
  label,
  placeholder,
  value,
  onChange,
  error,
  disabled = false,
  type = "text",
  style: extraStyle,
}) {
  const labelStyle = {
    display: "block",
    marginBottom: "6px",
    fontSize: "14px",
    fontWeight: 600,
    color: "var(--color-navy)",
  };

  const inputStyle = {
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
    opacity: disabled ? 0.6 : 1,
  };

  const errorStyle = {
    marginTop: "4px",
    fontSize: "13px",
    color: "#C0392B",
  };

  return (
    <div style={{ marginBottom: "16px", ...extraStyle }}>
      {label && <label style={labelStyle}>{label}</label>}
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        disabled={disabled}
        style={inputStyle}
        onFocus={(e) => {
          e.target.style.borderColor = "var(--color-teal)";
        }}
        onBlur={(e) => {
          e.target.style.borderColor = error
            ? "#C0392B"
            : "var(--color-mid)";
        }}
      />
      {error && <div style={errorStyle}>{error}</div>}
    </div>
  );
}
