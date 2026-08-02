export default function UrgencyGauge({ score, factors }) {
  const pct = Math.min(100, Math.max(0, score));
  const zone = pct < 40 ? "green" : pct < 70 ? "amber" : "red";

  const zoneColors = {
    green: { bg: "#16a34a", text: "text-green-600 dark:text-green-400" },
    amber: { bg: "#d97706", text: "text-amber-600 dark:text-amber-400" },
    red: { bg: "#dc2626", text: "text-red-600 dark:text-red-400" },
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Urgency Score
        </span>
        <span className={`text-lg font-bold ${zoneColors[zone].text}`}>
          {score}
        </span>
      </div>
      <div className="h-2.5 w-full rounded-full bg-muted overflow-hidden flex">
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{
            width: `${Math.min(pct, 39)}%`,
            background: "#16a34a",
          }}
        />
        <div
          className="h-full transition-all duration-300"
          style={{
            width: `${Math.min(Math.max(pct - 39, 0), 30)}%`,
            background: "#d97706",
          }}
        />
        <div
          className="h-full rounded-r-full transition-all duration-300"
          style={{
            width: `${Math.max(pct - 69, 0)}%`,
            background: "#dc2626",
          }}
        />
      </div>
      {factors && factors.length > 0 && (
        <div className="mt-2 space-y-1">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
            Score Breakdown
          </p>
          {factors.map((f, i) => (
            <div key={i} className="flex justify-between text-xs">
              <span className="text-muted-foreground">{f.label}</span>
              <span className="font-medium text-foreground">{f.value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
