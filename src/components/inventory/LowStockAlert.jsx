import { useState } from "react";

const dismissedKey = "reliefopt-low-stock-alert-dismissed";

export default function LowStockAlert({ items, onItemSelect }) {
  const [dismissed, setDismissed] = useState(() => sessionStorage.getItem(dismissedKey) === "true");
  const criticalItems = items.filter((item) => item.qty < 10).sort((a, b) => a.qty - b.qty).slice(0, 3);

  function dismiss() {
    sessionStorage.setItem(dismissedKey, "true");
    setDismissed(true);
  }

  if (dismissed || !criticalItems.length) return null;

  return (
    <aside className="flex items-start gap-3 bg-amber-500/10 border border-amber-500/30 rounded-lg text-foreground p-4 mb-6">
      <span className="text-amber-600 dark:text-amber-400 text-xl leading-5">⚠</span>
      <div className="flex-1 leading-relaxed text-sm">
        <strong>3 items are critically low: </strong>
        {criticalItems.map((item, index) => (
          <span key={item.id}>
            {index > 0 && ", "}
            <button type="button" className="font-bold underline text-amber-700 dark:text-amber-400 hover:text-amber-500" onClick={() => onItemSelect(item)}>
              {item.name}
            </button>
          </span>
        ))}
      </div>
      <button type="button" aria-label="Dismiss low stock alert" onClick={dismiss} className="text-amber-700 dark:text-amber-400 text-xl leading-none">&times;</button>
    </aside>
  );
}
