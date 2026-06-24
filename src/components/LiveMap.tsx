'use client';
import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/ToastProvider';
import { useAuth } from '@/lib/hooks';

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
  const { user } = useAuth();
  const [filterSeverity, setFilterSeverity] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [activeDiscussion, setActiveDiscussion] = useState<string | null>(null);
  const [resolvingReport, setResolvingReport] = useState<Report | null>(null);
  const { showToast } = useToast();

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
      showToast("PLEASE LOGIN TO VERIFY REPORTS.", 'warning');
      return;
    }
    try {
      const report = reports.find(r => r.id === reportId);
      if (!report) return;

      let currentVerified: string[] = [];
      if (typeof report.verifiedBy === 'string') {
        try { currentVerified = JSON.parse(report.verifiedBy); } catch(e) {}
      } else if (Array.isArray(report.verifiedBy)) {
        currentVerified = report.verifiedBy;
      }
      
      const newVerifiedBy = [...currentVerified, user.id];
      
      const { error } = await supabase
        .from('reports')
        .update({ verifiedBy: newVerifiedBy })
        .eq('id', reportId);
        
      if (error) throw error;
      
      setReports((prev: Report[]) => prev.map(r => r.id === reportId ? { ...r, verifiedBy: newVerifiedBy } : r));
    } catch (err: any) {
      console.error("Error verifying:", err);
      showToast("Unable to log your verification at the moment.", 'error');
    }
  };

  const filteredReports = reports.filter(r => {
    if (filterSeverity !== 'ALL' && r.severity?.toUpperCase() !== filterSeverity) return false;
    if (filterStatus !== 'ALL' && r.status?.toUpperCase() !== filterStatus) return false;
    return true;
  });

  return (
    <div style={{ height: '70vh', width: '100%', border: '2px solid var(--border-color)', boxShadow: '8px 8px 0px 0px #111111', zIndex: 0, position: 'relative', backgroundColor: 'white' }}>
      
      {/* FILTER CONTROL PANEL */}
      <div style={{ position: 'absolute', top: '10px', right: '10px', zIndex: 1000, display: 'flex', flexDirection: 'column', gap: '0.5rem', backgroundColor: 'var(--bg-color)', padding: '1rem', border: '3px solid black', boxShadow: '4px 4px 0px #111' }}>
        <h3 style={{ margin: 0, fontSize: '1rem', textTransform: 'uppercase', color: 'var(--primary-color)' }}>FILTERS</h3>
        <select value={filterSeverity} onChange={e => setFilterSeverity(e.target.value)} style={{ padding: '0.5rem', border: '2px solid black', fontWeight: 600, fontFamily: '"Space Grotesk", sans-serif' }}>
          <option value="ALL">ALL SEVERITIES</option>
          <option value="CRITICAL">CRITICAL</option>
          <option value="HIGH">HIGH</option>
          <option value="MEDIUM">MEDIUM</option>
          <option value="LOW">LOW</option>
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ padding: '0.5rem', border: '2px solid black', fontWeight: 600, fontFamily: '"Space Grotesk", sans-serif' }}>
          <option value="ALL">ALL STATUSES</option>
          <option value="OPEN">OPEN</option>
          <option value="RESOLVED">RESOLVED</option>
        </select>
      </div>

      <MapContainer center={center} zoom={13} style={{ height: '100%', width: '100%', zIndex: 1 }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <RecenterAutomatically center={center} />
        {filteredReports.map((report, index) => {
          return (
          <Marker key={report.id || `fallback-${index}`} position={[report.lat, report.lng]}>
            <Popup>
              <div style={{ fontFamily: '"Space Grotesk", sans-serif', maxWidth: '300px' }}>
                <strong style={{ display: 'block', fontSize: '1.2rem', textTransform: 'uppercase', marginBottom: '0.5rem', color: 'var(--primary-color)' }}>
                  {report.category}
                </strong>
                {report.imageUrl && <img src={report.imageUrl} alt="Issue" style={{ width: '100%', height: '100px', objectFit: 'cover', marginBottom: '0.5rem' }} />}
                <p style={{ margin: '0 0 0.5rem 0', fontWeight: 600 }}>SEVERITY: {report.severity}</p>
                <p style={{ 
                  margin: '0 0 0.5rem 0',
                  display: '-webkit-box',
                  WebkitLineClamp: 3,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden'
                }} title={report.description}>{report.description}</p>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                  <div style={{ padding: '0.25rem 0.5rem', backgroundColor: 'var(--text-color)', color: 'white', fontWeight: 700, fontSize: '0.8rem' }}>
                    {report.status}
                  </div>
                </div>
                
                <Link href={`/issue/${report.id}`}>
                  <button style={{ marginTop: '1rem', width: '100%', padding: '0.75rem', backgroundColor: 'var(--primary-color)', color: 'white', fontWeight: 800, border: '2px solid var(--border-color)', cursor: 'pointer', fontFamily: '"Space Grotesk", sans-serif' }}>
                    VIEW FULL DETAILS
                  </button>
                </Link>
              </div>
            </Popup>
          </Marker>
        )})}
      </MapContainer>
    </div>
  );
}
