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
  suggestedLocation?: [number, number] | null;
  setShowWarning: (show: boolean) => void;
  getDistanceFromLatLonInM: (lat1: number, lon1: number, lat2: number, lon2: number) => number;
}

function LocationMarker({ position, setPosition, suggestedLocation, setShowWarning, getDistanceFromLatLonInM }: MapPickerProps) {
  useMapEvents({
    click(e) {
      setPosition([e.latlng.lat, e.latlng.lng]);
      if (suggestedLocation) {
        const dist = getDistanceFromLatLonInM(suggestedLocation[0], suggestedLocation[1], e.latlng.lat, e.latlng.lng);
        setShowWarning(dist > 100);
      }
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

export default function MapPicker({ position, setPosition, suggestedLocation }: Omit<MapPickerProps, 'setShowWarning' | 'getDistanceFromLatLonInM'>) {
  const [center, setCenter] = useState<[number, number]>([12.9716, 77.5946]); // Bangalore default
  const [showWarning, setShowWarning] = useState(false);

  function getDistanceFromLatLonInM(lat1: number, lon1: number, lat2: number, lon2: number) {
    const R = 6371e3;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2); 
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
    return R * c;
  }

  useEffect(() => {
    if (suggestedLocation) {
      setCenter(suggestedLocation);
      setPosition(suggestedLocation);
      setShowWarning(false);
    } else if (!position && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setCenter([pos.coords.latitude, pos.coords.longitude]);
        },
        (err) => console.error("Geolocation error:", err),
        { enableHighAccuracy: true }
      );
    }
  }, [suggestedLocation]);

  return (
    <div style={{ height: '400px', width: '100%', position: 'relative', zIndex: 0 }}>
      <MapContainer center={center} zoom={13} style={{ height: '100%', width: '100%', border: '2px solid black', zIndex: 1 }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <RecenterAutomatically center={center} />
        <LocationMarker position={position} setPosition={setPosition} suggestedLocation={suggestedLocation} setShowWarning={setShowWarning} getDistanceFromLatLonInM={getDistanceFromLatLonInM} />
      </MapContainer>
      {showWarning && (
        <div style={{ position: 'absolute', bottom: '10px', left: '10px', right: '10px', backgroundColor: 'var(--primary-color)', color: 'white', padding: '1rem', border: '2px solid black', fontWeight: 800, zIndex: 1000, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>WARNING: You moved the pin &gt;100m away from the photo&apos;s original geotag!</span>
          <button onClick={() => { if(suggestedLocation) setPosition(suggestedLocation); setShowWarning(false); }} className="btn-secondary" style={{ padding: '0.5rem', fontSize: '0.8rem', border: '2px solid black' }}>REVERT</button>
        </div>
      )}
    </div>
  );
}
