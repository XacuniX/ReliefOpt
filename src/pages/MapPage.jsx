import { useState } from "react";
import MapView from "../components/map/MapView";
import Markers from "../components/map/Markers";
import MapFilters from "../components/map/MapFilters";
import VoiceReportModal from "../components/map/VoiceReportModal";
import OfflineBanner from "../components/map/OfflineBanner";

export default function MapPage() {
  const [filters, setFilters] = useState({
    teams: true,
    warehouses: true,
    supplyDrops: true,
    severityZones: true,
    minSeverity: 1,
  });

  const [voicePins, setVoicePins] = useState([]);

  function handleFilterChange(updatedFilters) {
    setFilters((prev) => ({ ...prev, ...updatedFilters }));
  }

  function handlePlotPin(pin) {
    setVoicePins((prev) => [...prev, pin]);
  }

  return (
    <div className="-mt-14 md:-mt-0 relative">
      <OfflineBanner />
      <MapView>
        <Markers filters={filters} voicePins={voicePins} />
        <MapFilters filters={filters} onFilterChange={handleFilterChange} />
      </MapView>
      <VoiceReportModal onPlotPin={handlePlotPin} />
    </div>
  );
}
