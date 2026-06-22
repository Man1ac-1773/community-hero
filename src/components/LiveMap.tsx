'use client';
import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

const DefaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});
L.Marker.prototype.options.icon = DefaultIcon;

interface Report {
  id: number;
  image: string;
  category: string;
  severity: string;
  description: string;
  lat: number;
  lng: number;
  status: string;
  timestamp: string;
}

function RecenterAutomatically({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center);
  }, [center, map]);
  return null;
}

export default function LiveMap() {
  const [reports, setReports] = useState<Report[]>([]);
  const [center, setCenter] = useState<[number, number]>([40.7128, -74.0060]);

  useEffect(() => {
    async function fetchReports() {
      try {
        const { db } = await import('@/lib/firebase');
        const { collection, getDocs } = await import('firebase/firestore');
        const querySnapshot = await getDocs(collection(db, 'reports'));
        const savedReports: Report[] = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          savedReports.push({ id: doc.id, ...data } as unknown as Report);
        });
        setReports(savedReports);

        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              setCenter([pos.coords.latitude, pos.coords.longitude]);
            },
            (err) => {
               console.error("Geolocation error:", err);
               if (savedReports.length > 0) {
                  setCenter([savedReports[0].lat, savedReports[0].lng]);
               }
            },
            { enableHighAccuracy: true }
          );
        } else if (savedReports.length > 0) {
          setCenter([savedReports[0].lat, savedReports[0].lng]);
        }
      } catch (error) {
         console.error("Error fetching reports:", error);
      }
    }
    fetchReports();
  }, []);

  return (
    <div style={{ height: '70vh', width: '100%', border: '2px solid var(--border-color)', boxShadow: '8px 8px 0px 0px #111111', zIndex: 0, position: 'relative', backgroundColor: 'white' }}>
      <MapContainer center={center} zoom={13} style={{ height: '100%', width: '100%' }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <RecenterAutomatically center={center} />
        {reports.map((report) => (
          <Marker key={report.id} position={[report.lat, report.lng]}>
            <Popup>
              <div style={{ fontFamily: '"Space Grotesk", sans-serif' }}>
                <strong style={{ display: 'block', fontSize: '1.2rem', textTransform: 'uppercase', marginBottom: '0.5rem', color: 'var(--primary-color)' }}>
                  {report.category}
                </strong>
                <p style={{ margin: '0 0 0.5rem 0', fontWeight: 600 }}>SEVERITY: {report.severity}</p>
                <p style={{ margin: '0 0 0.5rem 0' }}>{report.description}</p>
                <div style={{ marginTop: '0.5rem', padding: '0.25rem 0.5rem', backgroundColor: 'var(--text-color)', color: 'white', display: 'inline-block', fontWeight: 700, fontSize: '0.8rem' }}>
                  {report.status}
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
