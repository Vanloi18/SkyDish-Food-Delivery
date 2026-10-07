import { useEffect } from "react";
import { CircleMarker, MapContainer, Polyline, Popup, TileLayer, useMap, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";

const VIETNAM_CENTER = [16.0, 107.5];

function MapViewport({ position, restaurantPosition }) {
  const map = useMap();

  useEffect(() => {
    const locations = [position, restaurantPosition]
      .filter(Boolean)
      .map(({ latitude, longitude }) => [latitude, longitude]);

    if (locations.length > 1) {
      map.fitBounds(locations, { padding: [28, 28], maxZoom: 15 });
    } else if (locations.length === 1) {
      map.setView(locations[0], 15);
    }
  }, [map, position, restaurantPosition]);

  return null;
}

function LocationMarker({ position, label, color }) {
  if (!position) return null;

  return (
    <CircleMarker
      center={[position.latitude, position.longitude]}
      radius={9}
      pathOptions={{ color: "#ffffff", weight: 3, fillColor: color, fillOpacity: 1 }}
    >
      <Popup>{label}</Popup>
    </CircleMarker>
  );
}

function SelectableMarker({ position, onChange }) {
  useMapEvents({
    click(event) {
      onChange({ latitude: event.latlng.lat, longitude: event.latlng.lng });
    },
  });

  return <LocationMarker position={position} label="Vị trí giao hàng" color="#e94b24" />;
}

export default function DeliveryLocationPicker({ position, restaurantPosition, onChange }) {
  const initialCenter = position
    ? [position.latitude, position.longitude]
    : restaurantPosition
      ? [restaurantPosition.latitude, restaurantPosition.longitude]
      : VIETNAM_CENTER;
  const initialZoom = position || restaurantPosition ? 15 : 5;
  const locations = [position, restaurantPosition].filter(Boolean);

  return (
    <div style={{ height: "260px", width: "100%", overflow: "hidden", border: "1px solid #d9e2ec", borderRadius: "8px" }}>
      <MapContainer center={initialCenter} zoom={initialZoom} style={{ height: "100%", width: "100%" }}>
        <TileLayer
          url="https://{s}.tile.openstreetmap.fr/osmfr/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        <MapViewport position={position} restaurantPosition={restaurantPosition} />
        <SelectableMarker position={position} onChange={onChange} />
        <LocationMarker position={restaurantPosition} label="Nhà hàng" color="#2563eb" />
        {locations.length > 1 && (
          <Polyline
            positions={locations.map(({ latitude, longitude }) => [latitude, longitude])}
            pathOptions={{ color: "#64748b", dashArray: "7 7", weight: 3 }}
          />
        )}
      </MapContainer>
    </div>
  );
}
