import { useEffect } from "react";
import { CircleMarker, MapContainer, TileLayer, useMap, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";

const VIETNAM_CENTER = [16.0, 107.5];

function MapViewport({ position }) {
  const map = useMap();

  useEffect(() => {
    if (position) map.setView([position.latitude, position.longitude], 16);
  }, [map, position]);

  return null;
}

function SelectableMarker({ position, onChange }) {
  useMapEvents({
    click(event) {
      onChange({ latitude: event.latlng.lat, longitude: event.latlng.lng });
    },
  });

  if (!position) return null;

  return (
    <CircleMarker
      center={[position.latitude, position.longitude]}
      radius={9}
      pathOptions={{ color: "#ffffff", weight: 3, fillColor: "#e94b24", fillOpacity: 1 }}
    />
  );
}

export default function DeliveryLocationPicker({ position, onChange }) {
  const initialCenter = position
    ? [position.latitude, position.longitude]
    : VIETNAM_CENTER;

  return (
    <div style={{ height: "260px", width: "100%", overflow: "hidden", border: "1px solid #d9e2ec", borderRadius: "8px" }}>
      <MapContainer center={initialCenter} zoom={position ? 15 : 5} style={{ height: "100%", width: "100%" }}>
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution="&copy; OpenStreetMap contributors"
        />
        <MapViewport position={position} />
        <SelectableMarker position={position} onChange={onChange} />
      </MapContainer>
    </div>
  );
}