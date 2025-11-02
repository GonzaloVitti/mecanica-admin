import React, { useRef } from "react";
import {
  GoogleMap,
  useJsApiLoader,
  Marker,
  Polyline,
} from "@react-google-maps/api";

export interface ManualTripMapMarker {
  lat: number;
  lng: number;
  label?: string;
}

interface ManualTripMapProps {
  height?: string;
  initialCenter?: { lat: number; lng: number };
  initialZoom?: number;
  markers: ManualTripMapMarker[];
  selectedIndex: number;
  onMapClick: (lat: number, lng: number) => void;
  polyline?: { lat: number; lng: number }[];
}

const ManualTripMap: React.FC<ManualTripMapProps> = ({
  height = "60vh",
  initialCenter = { lat: 22.7708, lng: -102.5832 },
  initialZoom = 13,
  markers,
  selectedIndex,
  onMapClick,
  polyline = [],
}) => {
  const mapRef = useRef<google.maps.Map | null>(null);

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
  });

  const onMapLoad = (map: google.maps.Map) => {
    mapRef.current = map;
  };

  const mapContainerStyle = {
    width: "100%",
    height,
  };

  // Colores para los marcadores
  const markerColors = [
    "#007bff", // Origen - azul
    "#dc3545", // Destino - rojo
    "#ffc107", // Intermedias - amarillo
  ];

  return isLoaded ? (
    <div className="overflow-hidden border border-gray-200 rounded-xl bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
      <GoogleMap
        mapContainerStyle={mapContainerStyle}
        center={markers[selectedIndex] && markers[selectedIndex].lat && markers[selectedIndex].lng ? { lat: markers[selectedIndex].lat, lng: markers[selectedIndex].lng } : initialCenter}
        zoom={initialZoom}
        onLoad={onMapLoad}
        onClick={e => {
          if (e.latLng) {
            onMapClick(e.latLng.lat(), e.latLng.lng());
          }
        }}
        options={{
          fullscreenControl: true,
          streetViewControl: true,
          mapTypeControl: true,
          gestureHandling: 'greedy',
          styles: [
            {
              featureType: "all",
              elementType: "labels.text.fill",
              stylers: [{ color: "#6c7b88" }]
            },
            {
              featureType: "administrative",
              elementType: "geometry",
              stylers: [{ visibility: "off" }]
            },
          ]
        }}
      >
        {/* Polyline entre paradas */}
        {polyline.length > 1 && (
          <Polyline
            path={polyline}
            options={{
              strokeColor: '#3b82f6',
              strokeOpacity: 0.7,
              strokeWeight: 3,
              geodesic: true,
              zIndex: 2,
            }}
          />
        )}
        {/* Marcadores de paradas */}
        {markers.map((marker, idx) => (
          <Marker
            key={idx}
            position={{ lat: marker.lat, lng: marker.lng }}
            label={marker.label || (idx === 0 ? 'A' : idx === 1 ? 'B' : String.fromCharCode(67 + idx - 2))}
            icon={{
              path: window.google?.maps.SymbolPath.CIRCLE,
              scale: idx === selectedIndex ? 10 : 7,
              fillColor: markerColors[idx] || markerColors[2],
              fillOpacity: 1,
              strokeColor: idx === selectedIndex ? '#222' : '#fff',
              strokeWeight: idx === selectedIndex ? 3 : 2,
            }}
            zIndex={idx === selectedIndex ? 999 : 1}
          />
        ))}
      </GoogleMap>
    </div>
  ) : (
    <div className="flex items-center justify-center w-full h-64 bg-gray-100 dark:bg-gray-800 rounded-lg">
      <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
    </div>
  );
};

export default ManualTripMap; 