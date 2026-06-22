'use client';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useEffect, useState } from 'react';

// Fix for default marker icon in react-leaflet
const DefaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

interface MapPickerProps {
  position: [number, number] | null;
  setPosition: (pos: [number, number]) => void;
}

function LocationMarker({ position, setPosition }: MapPickerProps) {
  useMapEvents({
    click(e) {
      setPosition([e.latlng.lat, e.latlng.lng]);
    },
  });

  return position === null ? null : (
    <Marker position={position}></Marker>
  );
}

function RecenterAutomatically({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center);
  }, [center, map]);
  return null;
}

export default function MapPicker({ position, setPosition }: MapPickerProps) {
  const [center, setCenter] = useState<[number, number]>([40.7128, -74.0060]);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setCenter([pos.coords.latitude, pos.coords.longitude]);
        },
        (err) => console.error("Geolocation error:", err),
        { enableHighAccuracy: true }
      );
    }
  }, []);

  return (
    <div style={{ height: '400px', width: '100%', border: '2px solid var(--border-color)', boxShadow: '4px 4px 0px 0px #111111', zIndex: 0, position: 'relative' }}>
      <MapContainer center={center} zoom={13} style={{ height: '100%', width: '100%' }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <RecenterAutomatically center={center} />
        <LocationMarker position={position} setPosition={setPosition} />
      </MapContainer>
    </div>
  );
}
