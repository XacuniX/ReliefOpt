import { MapContainer, TileLayer } from "react-leaflet";

export default function MapView({ children }) {
  return (
    <MapContainer
      center={[23.8103, 90.4125]}
      zoom={8}
      scrollWheelZoom={true}
      attributionControl={false}
      className="h-[calc(100vh-56px)] w-full rounded-none"
    >
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      {children}
    </MapContainer>
  );
}
