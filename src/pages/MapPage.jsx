import { useState } from "react";
import MapView from "../components/map/MapView";
import Markers from "../components/map/Markers";
import MapFilters from "../components/map/MapFilters";
import VoiceReportModal from "../components/map/VoiceReportModal";
import OfflineBanner from "../components/map/OfflineBanner";
import { useData } from "../context/DataContext";

export default function MapPage() {
  const { mapPins } = useData();
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
    <div className="-mt-14 md:-mt-0 relative">
      <OfflineBanner />
      <MapView>
        <Markers filters={filters} mapPins={mapPins} />
        <MapFilters filters={filters} onFilterChange={handleFilterChange} />
      </MapView>
      <VoiceReportModal />
    </div>
  );
}
