import { Badge, Card } from "../ui";

const boxColors = { Food: "#14b8a6", Medicine: "#22c55e", Equipment: "#f97316", Shelter: "#8b5cf6" };
const SVG = { x: 20, y: 20, width: 360, height: 240 };

function shortLabel(name) {
  return name.length > 11 ? `${name.slice(0, 10)}…` : name;
}

function VehicleView({ title, vehicle, placements, side }) {
  const xSize = Number(vehicle.width) * 100;
  const ySize = (side ? Number(vehicle.height) : Number(vehicle.length)) * 100;
  const yCoordinate = side ? "z" : "y";
  const boxYSize = side ? "height" : "depth";

  return (
    <div>
      <h3 className="text-sm font-semibold mb-2">{title}</h3>
      <svg viewBox="0 0 400 300" role="img" aria-label={`${title} vehicle packing layout`} className="border rounded-md w-full h-auto">
        <rect x={SVG.x} y={SVG.y} width={SVG.width} height={SVG.height} fill="var(--background, #f8fafc)" stroke="var(--foreground, #0f172a)" strokeWidth="3" rx="3" />
        {placements.map((box) => {
          const x = SVG.x + (box.x / xSize) * SVG.width;
          const y = SVG.y + (box[yCoordinate] / ySize) * SVG.height;
          const width = (box.width / xSize) * SVG.width;
          const height = (box[boxYSize] / ySize) * SVG.height;

          return (
            <g key={`${title}-${box.boxId}`}>
              <rect x={x} y={y} width={width} height={height} fill={boxColors[box.category] || "#94a3b8"} rx="3" />
              {width > 32 && height > 16 && (
                <text x={x + width / 2} y={y + height / 2 + 3} fill="#fff" fontSize="9" textAnchor="middle">
                  {shortLabel(box.name)}
                </text>
              )}
            </g>
          );
        })}
        {placements.length === 0 && (
          <text x="200" y="140" textAnchor="middle" fill="var(--muted-foreground, #64748b)" fontSize="14">No boxes fit</text>
        )}
      </svg>
    </div>
  );
}

export default function PackingCanvas({ vehicle, placements = [], rejected = [], volumeUtilized = 0, totalWeight = 0, fits }) {
  if (!vehicle) {
    return (
      <Card>
        <p className="text-muted-foreground text-center py-8">Run the optimizer to see the packing plan.</p>
      </Card>
    );
  }

  return (
    <Card>
      <div className="grid grid-cols-2 gap-4">
        <VehicleView title="Top View" vehicle={vehicle} placements={placements} />
        <VehicleView title="Side View" vehicle={vehicle} placements={placements} side />
      </div>
      <p className="font-bold mt-4 mb-1">Volume Utilized: {volumeUtilized}%</p>
      <p className="font-bold mb-1">{placements.length} boxes placed</p>
      <p className="font-bold mb-3">Total Weight: {totalWeight.toLocaleString()} kg</p>
      <Badge color={fits ? "green" : "amber"} text={fits ? "All boxes fit" : "Some boxes could not fit"} />

      {rejected.length > 0 && (
        <div className="mt-4 border-t pt-3">
          <h3 className="text-sm font-semibold mb-2">Could not fit</h3>
          <ul className="space-y-1 text-sm text-muted-foreground">
            {rejected.map((box) => (
              <li key={box.boxId}><span className="font-medium text-foreground">{box.name}</span>: {box.reason}</li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}
