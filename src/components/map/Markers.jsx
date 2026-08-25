import { Marker, Popup, Circle } from "react-leaflet";
import L from "leaflet";
import { supplyDrops, cityCoords } from "../../mockData";

function createColoredIcon(color) {
  return L.divIcon({
    className: "",
    html: `<div style="width:14px;height:14px;border-radius:50%;background:${color};border:2px solid white;box-shadow:0 1px 3px rgba(0,0,0,0.4)"></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  });
}

const teamIcon = createColoredIcon("#3b82f6");
const warehouseIcon = createColoredIcon("#16a34a");
const supplyDropIcon = createColoredIcon("#f97316");

const severityColors = {
  1: { fill: "rgba(239,68,68,0.15)", stroke: "#ef4444" },
  2: { fill: "rgba(239,68,68,0.2)", stroke: "#ef4444" },
  3: { fill: "rgba(239,68,68,0.3)", stroke: "#ef4444" },
  4: { fill: "rgba(239,68,68,0.4)", stroke: "#ef4444" },
  5: { fill: "rgba(239,68,68,0.55)", stroke: "#ef4444" },
};

export default function Markers({ filters, mapPins, teams, reports, warehouses }) {
  const severityRadius = { 1: 1000, 2: 2000, 3: 4000, 4: 6000, 5: 10000 };

  return (
    <>
      {filters.teams &&
        teams.map((team) => {
          const coords = cityCoords[team.location];
          if (!coords) return null;
          return (
            <Marker key={`team-${team.id}`} position={coords} icon={teamIcon}>
              <Popup>
                <div className="text-sm">
                  <strong>{team.name}</strong>
                  <br />
                  Status: {team.status}
                  <br />
                  Leader: {team.leader}
                  <br />
                  Members: {team.memberCount}
                  <br />
                  Task: {team.activeTask}
                </div>
              </Popup>
            </Marker>
          );
        })}

      {filters.warehouses &&
        warehouses.map((warehouse) => {
          const coords = Number.isFinite(warehouse.lat) && Number.isFinite(warehouse.lng)
            ? [warehouse.lat, warehouse.lng]
            : cityCoords[warehouse.name];
          if (!coords) return null;
          return <Marker key={`wh-${warehouse.id}`} position={coords} icon={warehouseIcon}>
            <Popup>
              <div className="text-sm">
                <strong>{warehouse.name}</strong>
                <br />
                ReliefOpt supply hub
              </div>
            </Popup>
          </Marker>;
        })}

      {filters.supplyDrops &&
        supplyDrops.map((drop) => {
          const coords = cityCoords[drop.location];
          if (!coords) return null;
          return (
            <Marker
              key={`drop-${drop.id}`}
              position={coords}
              icon={supplyDropIcon}
            >
              <Popup>
                <div className="text-sm">
                  <strong>{drop.name}</strong>
                  <br />
                  Status: {drop.status}
                  <br />
                  Last update:{" "}
                  {new Date(drop.lastUpdate).toLocaleString([], {
                    dateStyle: "short",
                    timeStyle: "short",
                  })}
                </div>
              </Popup>
            </Marker>
          );
        })}

      {filters.severityZones &&
        reports
          .filter((r) => r.severity >= filters.minSeverity)
          .map((report) => {
            const coords = report.location
              ? [report.location.lat, report.location.lng]
              : cityCoords[report.district];
            if (!coords) return null;
            const colors = severityColors[report.severity] || severityColors[1];
            return (
              <Circle
                key={`sz-${report.id}`}
                center={coords}
                radius={severityRadius[report.severity] || 2000}
                pathOptions={{ fillColor: colors.fill, color: colors.stroke, fillOpacity: 1, weight: 2 }}
              >
                <Popup>
                  <div className="text-sm">
                    <strong>{report.type} — {report.district || "Unknown"}</strong>
                    <br />
                    Severity: {report.severity}/5
                    <br />
                    Affected: {Number(report.affectedCount || 0).toLocaleString()}
                    <br />
                    Status: {report.status}
                  </div>
                </Popup>
              </Circle>
            );
          })}

      {mapPins.map((pin) => {
        const position = pin.position || (Number.isFinite(pin.lat) && Number.isFinite(pin.lng) ? [pin.lat, pin.lng] : null);
        if (!position) return null;
        return (
        <Marker
          key={`voice-${pin.id}`}
          position={position}
          icon={createColoredIcon("#ef4444")}
        >
          <Popup>
            <div className="text-sm">
              <strong>Voice Report</strong>
              <br />
              Location: {pin.location}
              <br />
              Water Level: {pin.waterLevel || (pin.waterLevelFt != null ? `${pin.waterLevelFt}ft` : "—")}
              <br />
              People Stranded: {pin.peopleCount ?? "—"}
              <br />
              Children Present: {typeof pin.childrenPresent === "boolean" ? (pin.childrenPresent ? "Yes" : "No") : pin.childrenPresent}
            </div>
          </Popup>
        </Marker>
        );
      })}
    </>
  );
}
