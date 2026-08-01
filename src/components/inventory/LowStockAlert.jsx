import { useState } from "react";

const dismissedKey = "reliefopt-low-stock-alert-dismissed";

const styles = {
  alert: {
    alignItems: "flex-start",
    background: "rgba(243, 156, 18, 0.16)",
    border: "1px solid rgba(212, 136, 15, 0.36)",
    borderRadius: 8,
    color: "var(--color-navy)",
    display: "flex",
    gap: 12,
    marginBottom: 24,
    padding: "14px 16px",
  },
  icon: { color: "#B76E00", fontSize: 20, lineHeight: "20px" },
  content: { flex: 1, lineHeight: 1.55 },
  link: {
    background: "none", border: "none", color: "#9A5A00", cursor: "pointer",
    font: "inherit", fontWeight: 700, padding: 0, textDecoration: "underline",
  },
  close: {
    background: "transparent", border: "none", color: "#7C4A03", cursor: "pointer",
    fontSize: 22, lineHeight: 1, padding: "0 0 0 8px",
  },
};

export default function LowStockAlert({ items, onItemSelect }) {
  const [dismissed, setDismissed] = useState(() => sessionStorage.getItem(dismissedKey) === "true");
  const criticalItems = items.filter((item) => item.qty < 10).sort((a, b) => a.qty - b.qty).slice(0, 3);

  function dismiss() {
    sessionStorage.setItem(dismissedKey, "true");
    setDismissed(true);
  }

  if (dismissed || !criticalItems.length) return null;

  return (
    <aside style={styles.alert} aria-label="Low stock alert">
      <span aria-hidden="true" style={styles.icon}>⚠</span>
      <div style={styles.content}>
        <strong>3 items are critically low: </strong>
        {criticalItems.map((item, index) => (
          <span key={item.id}>
            {index > 0 && ", "}
            <button type="button" style={styles.link} onClick={() => onItemSelect(item)}>{item.name}</button>
          </span>
        ))}
      </div>
      <button type="button" aria-label="Dismiss low stock alert" onClick={dismiss} style={styles.close}>×</button>
    </aside>
  );
}
