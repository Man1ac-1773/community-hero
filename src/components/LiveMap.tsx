'use client';
import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { supabase } from '@/lib/supabase';
import { User } from '@supabase/supabase-js';

const DefaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});
L.Marker.prototype.options.icon = DefaultIcon;

interface Report {
  id: string;
  imageUrl: string;
  category: string;
  severity: string;
  description: string;
  lat: number;
  lng: number;
  status: string;
  verifiedBy?: string[];
  userId?: string;
}

function RecenterAutomatically({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center);
  }, [center, map]);
  return null;
}

export default function LiveMap({ reports, setReports }: { reports: Report[], setReports: any }) {
  const [center, setCenter] = useState<[number, number]>([40.7128, -74.0060]);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    async function fetchReports() {
      try {
        const { data, error } = await supabase.from('reports').select('*');
        if (error) throw error;
        
        const savedReports = data as Report[];
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
  }, [setReports]);

  const handleVerify = async (reportId: string) => {
    if (!user) {
      alert("PLEASE LOGIN TO VERIFY REPORTS.");
      return;
    }
    try {
      const report = reports.find(r => r.id === reportId);
      if (!report) return;
      
      const newVerifiedBy = [...(report.verifiedBy || []), user.id];
      
      const { error } = await supabase
        .from('reports')
        .update({ verifiedBy: newVerifiedBy })
        .eq('id', reportId);
        
      if (error) throw error;
      
      setReports((prev: Report[]) => prev.map(r => r.id === reportId ? { ...r, verifiedBy: newVerifiedBy } : r));
    } catch (err: any) {
      console.error("Error verifying:", err);
      alert("Failed to verify: " + err.message);
    }
  };

  return (
    <div style={{ height: '70vh', width: '100%', border: '2px solid var(--border-color)', boxShadow: '8px 8px 0px 0px #111111', zIndex: 0, position: 'relative', backgroundColor: 'white' }}>
      <MapContainer center={center} zoom={13} style={{ height: '100%', width: '100%' }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <RecenterAutomatically center={center} />
        {reports.map((report) => {
          const hasVerified = user && report.verifiedBy?.includes(user.id);
          const verifyCount = report.verifiedBy?.length || 0;
          return (
          <Marker key={report.id} position={[report.lat, report.lng]}>
            <Popup>
              <div style={{ fontFamily: '"Space Grotesk", sans-serif' }}>
                <strong style={{ display: 'block', fontSize: '1.2rem', textTransform: 'uppercase', marginBottom: '0.5rem', color: 'var(--primary-color)' }}>
                  {report.category}
                </strong>
                {report.imageUrl && <img src={report.imageUrl} alt="Issue" style={{ width: '100%', height: '100px', objectFit: 'cover', marginBottom: '0.5rem' }} />}
                <p style={{ margin: '0 0 0.5rem 0', fontWeight: 600 }}>SEVERITY: {report.severity}</p>
                <p style={{ margin: '0 0 0.5rem 0' }}>{report.description}</p>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                  <div style={{ padding: '0.25rem 0.5rem', backgroundColor: 'var(--text-color)', color: 'white', fontWeight: 700, fontSize: '0.8rem' }}>
                    {report.status}
                  </div>
                  {verifyCount > 0 && (
                    <div style={{ padding: '0.25rem 0.5rem', backgroundColor: 'var(--primary-color)', color: 'white', fontWeight: 700, fontSize: '0.8rem' }}>
                      {verifyCount} VERIFICATIONS
                    </div>
                  )}
                </div>
                
                {user && report.userId !== user.id && !hasVerified && (
                  <button 
                    onClick={() => handleVerify(report.id)}
                    style={{ marginTop: '1rem', width: '100%', padding: '0.5rem', backgroundColor: 'transparent', border: '2px solid var(--primary-color)', color: 'var(--primary-color)', fontWeight: 700, cursor: 'pointer' }}
                  >
                    VERIFY ISSUE
                  </button>
                )}
              </div>
            </Popup>
          </Marker>
        )})}
      </MapContainer>
    </div>
  );
}
