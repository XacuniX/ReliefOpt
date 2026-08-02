import { Badge, Card } from "../ui";

const boxColors = { Food: "#14b8a6", Medicine: "#22c55e", Equipment: "#f97316", Shelter: "#8b5cf6" };

function shortLabel(name) {
  return name.length > 11 ? `${name.slice(0, 10)}…` : name;
}

function VehicleView({ title, vehicle, items, side }) {
  if (!items || items.length === 0) {
    return (
      <div>
        <h3 className="text-sm font-semibold mb-2">{title}</h3>
        <svg viewBox="0 0 400 300" role="img" aria-label={`${title} vehicle packing layout`} className="border rounded-md w-full h-auto">
          <rect x="20" y="20" width="360" height="240" fill="var(--background, #f8fafc)" stroke="var(--foreground, #0f172a)" strokeWidth="3" rx="3" />
          <text x="200" y="140" textAnchor="middle" fill="var(--muted-foreground, #64748b)" fontSize="14">No items to display</text>
        </svg>
      </div>
    );
  }

  const cols = 3;
  const itemCount = items.reduce((sum, i) => sum + (i.quantity || 1), 0);
  const rows = Math.ceil(itemCount / cols);

  return (
    <div>
      <h3 className="text-sm font-semibold mb-2">{title}</h3>
      <svg viewBox="0 0 400 300" role="img" aria-label={`${title} vehicle packing layout`} className="border rounded-md w-full h-auto">
        <rect x="20" y="20" width="360" height="240" fill="var(--background, #f8fafc)" stroke="var(--foreground, #0f172a)" strokeWidth="3" rx="3" />

        {(() => {
          const flatItems = [];
          items.forEach((item) => {
            for (let q = 0; q < (item.quantity || 1); q++) {
              flatItems.push(item);
            }
          });

          return flatItems.map((item, index) => {
            const col = index % cols;
            const row = Math.floor(index / cols);
            const scaling = Math.min(1, 3 / cols, 3 / rows);
            const boxW = 96 * scaling;
            const boxH = side ? 44 * scaling : 78 * scaling;
            const gapX = (360 - cols * boxW) / (cols + 1);
            const gapY = side ? 12 : 10;
            const x = 20 + gapX + col * (boxW + gapX);
            const y = 20 + gapY + row * (boxH + gapY);

            return (
              <g key={`${item.id}-${index}`}>
                <rect x={x} y={y} width={boxW} height={boxH} fill={boxColors[item.category] || "#94a3b8"} rx="3" />
                <text x={x + boxW / 2} y={y + boxH / 2 + 3} fill="#fff" fontSize={Math.max(8, 10 * scaling)} textAnchor="middle">
                  {shortLabel(item.name)}
                </text>
              </g>
            );
          });
        })()}
      </svg>
    </div>
  );
}

export default function PackingCanvas({ vehicle, items }) {
  if (!items || items.length === 0) {
    return (
      <Card>
        <p className="text-muted-foreground text-center py-8">Run the optimizer to see the packing plan.</p>
      </Card>
    );
  }

  const totalItemVolume = items.reduce((sum, i) => {
    const l = i.length || 1;
    const w = i.width || 1;
    const h = i.height || 1;
    const q = i.quantity || 1;
    return sum + l * w * h * q;
  }, 0);

  const v = vehicle || { length: 6, width: 2.4, height: 2.5 };
  const vehicleVolume = v.length * v.width * v.height;
  const volumePct = vehicleVolume > 0 ? Math.min(100, Math.round((totalItemVolume / vehicleVolume) * 100)) : 0;

  const totalWeight = items.reduce((sum, i) => sum + (i.weight || 10) * (i.quantity || 1), 0);

  return (
    <Card>
      <div className="grid grid-cols-2 gap-4">
        <VehicleView title="Top View" vehicle={vehicle} items={items} />
        <VehicleView title="Side View" vehicle={vehicle} items={items} side />
      </div>
      <p className="font-bold mt-4 mb-1">Volume Utilized: {volumePct}%</p>
      <p className="font-bold mb-3">Total Weight: {totalWeight.toLocaleString()} kg</p>
      <Badge color={volumePct < 60 ? "amber" : volumePct <= 90 ? "green" : "red"} text={volumePct <= 90 ? "Packing efficiency is optimal" : "Vehicle may be overloaded"} />
    </Card>
  );
}
