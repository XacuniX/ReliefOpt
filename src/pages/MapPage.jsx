import { useState } from "react";
import MapView from "../components/map/MapView";
import Markers from "../components/map/Markers";
import MapFilters from "../components/map/MapFilters";
import VoiceReportModal from "../components/map/VoiceReportModal";
import OfflineBanner from "../components/map/OfflineBanner";
import { useData } from "../context/DataContext";

export default function MapPage() {
  const { mapPins, reports, teams, warehouses } = useData();
  const [filters, setFilters] = useState({
    teams: true,
    warehouses: true,
    supplyDrops: true,
    severityZones: true,
    minSeverity: 1,
  });

  function handleFilterChange(updatedFilters) {
    setFilters((prev) => ({ ...prev, ...updatedFilters }));
  }

  return (
    <div className="relative -m-3 sm:-m-6">
      <h1 className="sr-only">Relief operations map</h1>
      <OfflineBanner />
      <MapView>
        <Markers
          filters={filters}
          mapPins={mapPins}
          reports={reports}
          teams={teams}
          warehouses={warehouses}
        />
        <MapFilters filters={filters} onFilterChange={handleFilterChange} />
      </MapView>
      <VoiceReportModal />
    </div>
  );
}
