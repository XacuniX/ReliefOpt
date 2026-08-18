import { useMap } from "react-leaflet";
import { Input, Badge } from "../ui";
import { cityCoords } from "../../mockData";

const cities = Object.keys(cityCoords).filter((c) => c !== "Mirpur");

export default function MapFilters({ filters, onFilterChange }) {
  const map = useMap();

  function handleToggle(key) {
    onFilterChange({ [key]: !filters[key] });
  }

  function handleSearch(value) {
    const city = cities.find((c) => c.toLowerCase().includes(value.toLowerCase()));
    if (city && cityCoords[city]) {
      map.flyTo(cityCoords[city], 12, { duration: 1.5 });
    }
  }

  return (
    <div className="glass-card absolute top-4 right-4 z-[1000] rounded-xl shadow-lg p-4 w-64 space-y-4">
      <h3 className="text-sm font-bold text-foreground">Map Filters</h3>

      <Input
        placeholder="Search location..."
        onChange={(e) => handleSearch(e.target.value)}
      />

      <div className="space-y-2">
        {[
          { key: "teams", label: "Teams", color: "blue" },
          { key: "warehouses", label: "Warehouses", color: "green" },
          { key: "supplyDrops", label: "Supply Drops", color: "orange" },
          { key: "severityZones", label: "Severity Zones", color: "red" },
        ].map(({ key, label, color }) => (
          <label
            key={key}
            className="flex items-center gap-2 cursor-pointer text-sm text-foreground"
          >
            <input
              type="checkbox"
              checked={filters[key]}
              onChange={() => handleToggle(key)}
              className="rounded accent-primary"
            />
            <span
              className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
              style={{ background: color === "blue" ? "#3b82f6" : color === "green" ? "#16a34a" : color === "orange" ? "#f97316" : "#ef4444" }}
            />
            {label}
          </label>
        ))}
      </div>

      <div>
        <label className="flex items-center justify-between text-sm text-foreground mb-1">
          <span>Min Severity</span>
          <Badge color="red" text={String(filters.minSeverity)} />
        </label>
        <input
          type="range"
          min={1}
          max={5}
          value={filters.minSeverity}
          onChange={(e) => onFilterChange({ minSeverity: Number(e.target.value) })}
          className="w-full accent-red-500"
        />
        <div className="flex justify-between text-[10px] text-muted-foreground mt-0.5">
          <span>1</span>
          <span>2</span>
          <span>3</span>
          <span>4</span>
          <span>5</span>
        </div>
      </div>
    </div>
  );
}
