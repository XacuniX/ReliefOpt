import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useMap } from "react-leaflet";
import { Input, Badge } from "../ui";
import { cityCoords } from "../../mockData";

const cities = Object.keys(cityCoords);

export default function MapFilters({ filters, onFilterChange }) {
  const map = useMap();
  const [isMinimized, setIsMinimized] = useState(false);

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
    <div className="absolute left-3 right-3 top-3 z-[1000] max-h-[calc(100%-1.5rem)] space-y-3 overflow-y-auto rounded-xl border border-teal-500/20 bg-white/90 p-3 shadow-lg shadow-teal-900/5 backdrop-blur-lg dark:border-white/20 dark:bg-[#0b1215]/90 dark:shadow-black/30 sm:left-auto sm:right-4 sm:top-4 sm:w-64 sm:space-y-4 sm:p-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-bold text-foreground">Map Filters</h3>
        <button
          type="button"
          onClick={() => setIsMinimized((minimized) => !minimized)}
          aria-expanded={!isMinimized}
          aria-controls="map-filter-controls"
          className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          title={isMinimized ? "Expand map filters" : "Minimize map filters"}
        >
          {isMinimized ? (
            <ChevronDown className="h-4 w-4" aria-hidden="true" />
          ) : (
            <ChevronUp className="h-4 w-4" aria-hidden="true" />
          )}
          <span className="sr-only">
            {isMinimized ? "Expand map filters" : "Minimize map filters"}
          </span>
        </button>
      </div>

      {!isMinimized && (
        <div id="map-filter-controls" className="space-y-3 sm:space-y-4">
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
      )}
    </div>
  );
}
