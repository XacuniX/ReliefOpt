import { Badge, Card } from "../ui";

const boxColors = { Food: "#14b8a6", Medicine: "#22c55e", Equipment: "#f97316", Shelter: "#0f172a" };
const darkBoxColors = { Food: "#14b8a6", Medicine: "#22c55e", Equipment: "#f97316", Shelter: "#e2e8f0" };
const supplies = [
  { name: "Rice (Fortified)", category: "Food" },
  { name: "First Aid Kits", category: "Medicine" },
  { name: "Water Pumps", category: "Equipment" },
  { name: "Tarpaulins", category: "Shelter" },
  { name: "Dry Biscuits", category: "Food" },
  { name: "Medical Supplies", category: "Medicine" },
];

function shortLabel(name) {
  return name.length > 13 ? `${name.slice(0, 12)}…` : name;
}

function VehicleView({ title, side }) {
  return (
    <div>
      <h3 className="text-sm font-semibold mb-2">{title}</h3>
      <svg viewBox="0 0 400 300" role="img" aria-label={`${title} vehicle packing layout`} className="border rounded-md w-full h-auto">
        <rect x="20" y="20" width="360" height="240" fill="var(--background, #f8fafc)" stroke="var(--foreground, #0f172a)" strokeWidth="3" rx="3" />
        {supplies.map((item, index) => {
          const col = index % 3;
          const row = Math.floor(index / 3);
          const x = 38 + col * 112;
          const y = side ? 124 + row * 58 : 42 + row * 100;
          const width = 96;
          const height = side ? 44 : 78;
          return (
            <g key={item.name}>
              <rect x={x} y={y} width={width} height={height} fill={boxColors[item.category]} rx="3" className="dark:fill: dark:!fill-slate-300" />
              <text x={x + width / 2} y={y + height / 2 + 4} fill="#fff" fontSize="10" textAnchor="middle">
                {shortLabel(item.name)}
              </text>
            </g>
          );
        })}
        {side && <line x1="20" y1="225" x2="380" y2="225" stroke="var(--foreground, #0f172a)" strokeWidth="2" />}
      </svg>
    </div>
  );
}

export default function PackingCanvas() {
  return (
    <Card>
      <div className="grid grid-cols-2 gap-4">
        <VehicleView title="Top View" />
        <VehicleView title="Side View" side />
      </div>
      <p className="font-bold mt-4 mb-1">Volume Utilized: 78%</p>
      <p className="font-bold mb-3">Total Weight: 1,240 kg</p>
      <Badge color="green" text="Packing efficiency is optimal" />
    </Card>
  );
}
