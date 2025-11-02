"use client";
import React, { useEffect, useState, useRef } from "react";
import {
  GoogleMap,
  useJsApiLoader,
  Marker,
  InfoWindow,
} from "@react-google-maps/api";
import { fetchApi } from "@/app/lib/data";

// Tipado para la estructura de los conductores
interface Conductor {
  driver_id: string;
  name: string;
  email: string;
  phone_number: string;
  latitude: number;
  longitude: number;
  timestamp: string;
  working: boolean;
  has_trip: boolean;
  connected: boolean;
  vehicle: {
    number: number;
    brand: string;
    line: string;
    model: string;
    license_plate: string;
  };
}
interface ApiResponse {
  ok: boolean;
  drivers_count: number;
  drivers: Conductor[];
}

interface MapProps {
  height?: string;
  initialCenter?: { lat: number; lng: number };
  initialZoom?: number;
  onDataUpdate?: (conductores: Conductor[]) => void;
}

const Map: React.FC<MapProps> = ({
  height = "80vh",
  initialCenter = { lat: 22.7708, lng: -102.5832 },
  initialZoom = 13,
  onDataUpdate,
}) => {
  const [conductores, setConductores] = useState<Conductor[]>([]);
  const [selectedConductor, setSelectedConductor] = useState<Conductor | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const [mapCenter] = useState(initialCenter);
  const [isLoading, setIsLoading] = useState(false);


  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
  });

  const onMapLoad = (map: google.maps.Map) => {
    mapRef.current = map;
  };

  const fetchConductores = async () => {
    if (isLoading) return;

    setIsLoading(true);
    try {
      const response = await fetchApi<ApiResponse>("/api/drivers/driver_locations/");
      if (response && response.ok) {
        // Los datos ya tienen el formato correcto, solo necesitamos validarlos
        const validDrivers = response.drivers.filter(driver =>
          driver &&
          typeof driver.latitude === 'number' &&
          typeof driver.longitude === 'number'
        );

        setConductores(validDrivers);

        if (validDrivers.length < response.drivers.length) {
          console.warn(`Filtrados ${response.drivers.length - validDrivers.length} conductores con datos incompletos`);
        }

        if (onDataUpdate) {
          onDataUpdate(validDrivers);
        }
      }
    } catch (error) {
      console.error("Error al obtener ubicaciones de conductores:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const isValidConductor = (conductor: any): conductor is Conductor => {
    return (
      conductor &&
      typeof conductor.latitude === 'number' &&
      typeof conductor.longitude === 'number' &&
      conductor.vehicle
    );
  };


  useEffect(() => {
    fetchConductores();
  }, []);

  const mapContainerStyle = {
    width: "100%",
    height,
  };

  // Determinar el color/icono según el estado del conductor
  const getMarkerIcon = (conductor: Conductor): google.maps.Icon | undefined => {
    try {
      if (!window.google || !window.google.maps) {
        return undefined;
      }

      const size = new window.google.maps.Size(30, 30);

      if (!conductor.connected) {
        return {
          url: "https://i.imgur.com/LSBfsDt.png", // Inactivo - gris
          scaledSize: size,
        };
      } else if (conductor.working && conductor.has_trip) {
        return {
          url: "https://i.imgur.com/725gpS8.png", // Con viaje - verde
          scaledSize: size,
        };
      } else if (conductor.working) {
        return {
          url: "https://i.imgur.com/uJNM12i.png", // Disponible - azul
          scaledSize: size,
        };
      } else {
        return {
          url: "https://i.imgur.com/LSBfsDt.png", // Inactivo - gris
          scaledSize: size,
        };
      }
    } catch (error) {
      console.error("Error al generar icono:", error);
      return undefined;
    }
  };

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center w-full h-64 bg-gray-100 dark:bg-gray-800 rounded-lg">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden border border-gray-200 rounded-xl bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
      <GoogleMap
        mapContainerStyle={mapContainerStyle}
        center={mapCenter}
        zoom={initialZoom}
        onLoad={onMapLoad}
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
            // Puedes añadir más estilos aquí para personalizar el mapa
          ]
        }}
      >
        {conductores
          .filter(conductor =>
            conductor &&
            typeof conductor.latitude === 'number' &&
            typeof conductor.longitude === 'number'
          )
          .map((conductor) => (
            <Marker
              key={conductor.driver_id}
              position={{
                lat: conductor.latitude,
                lng: conductor.longitude
              }}
              icon={getMarkerIcon(conductor)}
              label={conductor?.vehicle?.number?.toString() || ''}
              onClick={() => setSelectedConductor(conductor)}
            />
          ))
        }

        {selectedConductor && isValidConductor(selectedConductor) && (
          <InfoWindow
            position={{
              lat: selectedConductor.latitude,
              lng: selectedConductor.longitude,
            }}
            onCloseClick={() => setSelectedConductor(null)}
          >
            <div className="p-3 max-w-xs font-sans">
              <h3 className="mb-2 font-semibold text-gray-800 text-theme-md dark:text-dark/90">
                {selectedConductor.name}
              </h3>
              <div className="grid grid-cols-2 gap-1">
                <p className="font-medium text-gray-700 text-theme-sm dark:text-dark/80">ID Vehículo:</p>
                <p className="text-gray-600 text-theme-sm dark:text-gray-600">{selectedConductor.vehicle.number}</p>

                <p className="font-medium text-gray-700 text-theme-sm dark:text-dark/80">Email:</p>
                <p className="text-gray-600 text-theme-sm dark:text-gray-600">{selectedConductor.email}</p>

                <p className="font-medium text-gray-700 text-theme-sm dark:text-dark/80">Teléfono:</p>
                <p className="text-gray-600 text-theme-sm dark:text-gray-600">{selectedConductor.phone_number}</p>

                <p className="font-medium text-gray-700 text-theme-sm dark:text-dark/80">Vehículo:</p>
                <p className="text-gray-600 text-theme-sm dark:text-gray-600">
                  {selectedConductor.vehicle.brand} {selectedConductor.vehicle.line}
                </p>

                <p className="font-medium text-gray-700 text-theme-sm dark:text-dark/80">Placa:</p>
                <p className="text-gray-600 text-theme-sm dark:text-gray-600">{selectedConductor.vehicle.license_plate}</p>

                <p className="font-medium text-gray-700 text-theme-sm dark:text-dark/80">Estado:</p>
                <p className="text-gray-600 text-theme-sm dark:text-gray-600">
                  {selectedConductor.connected ?
                    (selectedConductor.working ? "Activo" : "Registrado") :
                    "Inactivo"}
                </p>

                <p className="font-medium text-gray-700 text-theme-sm dark:text-dark/80">Viaje en curso:</p>
                <p className="text-gray-600 text-theme-sm dark:text-gray-600">
                  {selectedConductor.has_trip ? "Sí" : "No"}
                </p>
              </div>
              <p className="mt-2 text-xs text-gray-600 dark:text-gray-400">
                Actualizado: {new Date(selectedConductor.timestamp).toLocaleString()}
              </p>
            </div>
          </InfoWindow>
        )}
      </GoogleMap>
    </div>
  );
};

export default Map;