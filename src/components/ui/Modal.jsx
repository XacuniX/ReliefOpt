const overlayStyle = {
  position: "fixed",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  background: "rgba(0, 0, 0, 0.5)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 1000,
  animation: "reliefopt-modal-fade-in 0.2s ease",
};

const cardStyle = {
  background: "var(--color-white)",
  borderRadius: "12px",
  maxWidth: "500px",
  width: "90%",
  maxHeight: "85vh",
  display: "flex",
  flexDirection: "column",
  boxShadow: "0 20px 60px rgba(0, 0, 0, 0.3)",
  animation: "reliefopt-modal-slide-up 0.25s ease",
};

const headerStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "20px 24px 16px",
  borderBottom: "1px solid var(--color-smoke)",
};

const titleStyle = {
  margin: 0,
  fontSize: "18px",
  fontWeight: 700,
  color: "var(--color-navy)",
};

const closeBtnStyle = {
  background: "none",
  border: "none",
  fontSize: "22px",
  cursor: "pointer",
  color: "var(--color-mid)",
  padding: "4px 8px",
  borderRadius: "4px",
  lineHeight: 1,
  transition: "color 0.15s ease",
};

const bodyStyle = {
  padding: "20px 24px",
  overflowY: "auto",
  flex: 1,
};

const keyframes = `
@keyframes reliefopt-modal-fade-in {
  from { opacity: 0; }
  to   { opacity: 1; }
}
@keyframes reliefopt-modal-slide-up {
  from { transform: translateY(20px); opacity: 0; }
  to   { transform: translateY(0); opacity: 1; }
}`;

if (typeof document !== "undefined") {
  const id = "reliefopt-modal-style";
  if (!document.getElementById(id)) {
    const style = document.createElement("style");
    style.id = id;
    style.textContent = keyframes;
    document.head.appendChild(style);
  }
}

export default function Modal({ isOpen, onClose, title, children }) {
  if (!isOpen) return null;

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose?.();
    }
  };

  return (
    <div style={overlayStyle} onClick={handleOverlayClick}>
      <div style={cardStyle}>
        <div style={headerStyle}>
          <h2 style={titleStyle}>{title}</h2>
          <button
            style={closeBtnStyle}
            onClick={onClose}
            onMouseEnter={(e) => {
              e.target.style.color = "var(--color-navy)";
            }}
            onMouseLeave={(e) => {
              e.target.style.color = "var(--color-mid)";
            }}
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        <div style={bodyStyle}>{children}</div>
      </div>
    </div>
  );
}
