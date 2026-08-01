import { Badge, Card } from "../ui";

const boxColors = { Food: "#16A085", Medicine: "#1E8449", Equipment: "#EA580C", Shelter: "#1B2A4A" };
const supplies = [
  { name: "Rice (Fortified)", category: "Food" }, { name: "First Aid Kits", category: "Medicine" },
  { name: "Water Pumps", category: "Equipment" }, { name: "Emergency Tarpaulins", category: "Shelter" },
  { name: "Dry Biscuits", category: "Food" }, { name: "Medical Supplies", category: "Medicine" },
];

function shortLabel(name) { return name.length > 13 ? `${name.slice(0, 12)}…` : name; }

function VehicleView({ title, side }) {
  return (
    <div style={{ minWidth: 0 }}>
      <h3 style={{ fontSize: 15, margin: "0 0 8px" }}>{title}</h3>
      <svg viewBox="0 0 400 300" role="img" aria-label={`${title} vehicle packing layout`} style={{ border: "1px solid var(--color-mid)", borderRadius: 6, display: "block", height: "auto", maxWidth: "100%" }}>
        <rect x="20" y="20" width="360" height="240" fill="#F8FAFC" stroke="#1B2A4A" strokeWidth="3" rx="3" />
        {supplies.map((item, index) => {
          const col = index % 3;
          const row = Math.floor(index / 3);
          const x = 38 + col * 112;
          const y = side ? 124 + row * 58 : 42 + row * 100;
          const width = side ? 96 : 96;
          const height = side ? 44 : 78;
          return <g key={item.name}>
            <rect x={x} y={y} width={width} height={height} fill={boxColors[item.category]} rx="3" />
            <text x={x + width / 2} y={y + height / 2 + 4} fill="#fff" fontSize="10" textAnchor="middle">{shortLabel(item.name)}</text>
          </g>;
        })}
        {side && <line x1="20" y1="225" x2="380" y2="225" stroke="#1B2A4A" strokeWidth="2" />}
      </svg>
    </div>
  );
}

export default function PackingCanvas() {
  return (
    <Card>
      <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}>
        <VehicleView title="Top View" />
        <VehicleView title="Side View" side />
      </div>
      <p style={{ fontWeight: 700, margin: "18px 0 6px" }}>Volume Utilized: 78%</p>
      <p style={{ fontWeight: 700, margin: "0 0 14px" }}>Total Weight: 1,240 kg</p>
      <Badge color="green" text="Packing efficiency is optimal" />
    </Card>
  );
}
