'use client';
import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { supabase } from '@/lib/supabase';
import { User } from '@supabase/supabase-js';
import { useToast } from '@/components/ToastProvider';
import DiscussionModal from '@/components/DiscussionModal';
import ResolveModal from '@/components/ResolveModal';

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
  const [filterSeverity, setFilterSeverity] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [activeDiscussion, setActiveDiscussion] = useState<string | null>(null);
  const [resolvingReport, setResolvingReport] = useState<Report | null>(null);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const { showToast } = useToast();

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
    <div style={{ display: 'flex', width: '100%', height: '70vh', alignItems: 'stretch' }}>
      
      {/* MAP WRAPPER */}
      <div style={{ flexGrow: 1, position: 'relative', border: '2px solid var(--border-color)', boxShadow: '8px 8px 0px 0px #111111', backgroundColor: 'white', overflow: 'hidden' }}>
      
      {/* FILTER CONTROL PANEL */}
      <div style={{ position: 'absolute', top: '10px', left: '10px', zIndex: 1000, display: 'flex', flexDirection: 'column', gap: '0.5rem', backgroundColor: 'var(--bg-color)', padding: '1rem', border: '3px solid black', boxShadow: '4px 4px 0px #111' }}>
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
            <Marker 
              key={report.id || `fallback-${index}`} 
              position={[report.lat, report.lng]}
              eventHandlers={{
                click: () => setSelectedReport(report)
              }}
            />
          );
        })}
      </MapContainer>
      </div>

      {/* RIGHT SIDE PANEL */}
      <div style={{
        width: selectedReport ? '400px' : '0px',
        marginLeft: selectedReport ? '1.5rem' : '0px',
        opacity: selectedReport ? 1 : 0,
        backgroundColor: 'var(--bg-color)',
        border: selectedReport ? '2px solid var(--border-color)' : 'none',
        boxShadow: selectedReport ? '8px 8px 0px 0px #111111' : 'none',
        transition: 'all 0.3s ease-in-out',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        position: 'relative',
        zIndex: 10
      }}>
        {selectedReport && (() => {
          const verifiedByVal = selectedReport.verifiedBy as any;
          const hasVerified = user && (typeof verifiedByVal === 'string' 
            ? verifiedByVal.includes(user.id) 
            : Array.isArray(verifiedByVal) && verifiedByVal.includes(user.id));
          
          let verifyCount = 0;
          if (typeof verifiedByVal === 'string') {
            try { verifyCount = JSON.parse(verifiedByVal).length; } catch(e){}
          } else if (Array.isArray(verifiedByVal)) {
            verifyCount = verifiedByVal.length;
          }

          return (
            <div style={{ width: '400px', display: 'flex', flexDirection: 'column', height: '100%' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', borderBottom: '4px solid var(--border-color)' }}>
                <h3 style={{ margin: 0, fontSize: '1.2rem', textTransform: 'uppercase', color: 'var(--primary-color)' }}>ISSUE DETAILS</h3>
                <button onClick={() => setSelectedReport(null)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', fontWeight: 800, cursor: 'pointer' }}>X</button>
              </div>
              
              <div style={{ padding: '1.5rem', overflowY: 'auto', flexGrow: 1, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <strong style={{ display: 'block', fontSize: '2rem', textTransform: 'uppercase', marginBottom: '0.5rem', lineHeight: '1' }}>{selectedReport.category}</strong>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    <div style={{ padding: '0.25rem 0.5rem', backgroundColor: 'var(--text-color)', color: 'white', fontWeight: 700, fontSize: '0.8rem' }}>
                      {selectedReport.status}
                    </div>
                    {verifyCount > 0 && (
                      <div style={{ padding: '0.25rem 0.5rem', backgroundColor: 'var(--primary-color)', color: 'white', fontWeight: 700, fontSize: '0.8rem' }}>
                        {verifyCount} VERIFICATIONS
                      </div>
                    )}
                  </div>
                </div>

                {selectedReport.imageUrl && <img src={selectedReport.imageUrl} alt="Issue" style={{ width: '100%', height: '200px', objectFit: 'cover', border: '2px solid var(--border-color)', marginTop: '0.5rem' }} />}
                
                <div style={{ backgroundColor: 'white', padding: '1rem', border: '2px solid var(--border-color)' }}>
                  <p style={{ margin: '0 0 0.5rem 0', fontWeight: 800, color: 'var(--primary-color)' }}>SEVERITY: {selectedReport.severity}</p>
                  <p style={{ margin: 0, fontWeight: 500, lineHeight: '1.5' }}>{selectedReport.description}</p>
                </div>

                <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem', paddingTop: '1rem' }}>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    {user && selectedReport.userId !== user.id && !hasVerified && (
                      <button 
                        onClick={() => handleVerify(selectedReport.id)}
                        style={{ flexGrow: 1, padding: '0.75rem', backgroundColor: 'transparent', border: '2px solid var(--primary-color)', color: 'var(--primary-color)', fontWeight: 800, cursor: 'pointer' }}
                      >
                        VERIFY
                      </button>
                    )}
                    <button 
                      onClick={() => setActiveDiscussion(selectedReport.id)}
                      style={{ flexGrow: 1, padding: '0.75rem', backgroundColor: 'var(--text-color)', border: '2px solid var(--border-color)', color: 'white', fontWeight: 800, cursor: 'pointer' }}
                    >
                      DISCUSS
                    </button>
                  </div>
                  {selectedReport.status === 'OPEN' && (
                    <button 
                      onClick={() => setResolvingReport(selectedReport)}
                      style={{ width: '100%', padding: '0.75rem', backgroundColor: '#00E676', border: '2px solid var(--border-color)', color: 'black', fontWeight: 800, cursor: 'pointer' }}
                    >
                      MARK AS RESOLVED
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })()}
      </div>

      {activeDiscussion && (
        <DiscussionModal 
          reportId={activeDiscussion} 
          user={user} 
          onClose={() => setActiveDiscussion(null)} 
        />
      )}

      {resolvingReport && (
        <ResolveModal 
          report={resolvingReport}
          user={user}
          onClose={() => setResolvingReport(null)}
          onResolved={() => {
            setReports((prev: Report[]) => prev.map(r => r.id === resolvingReport.id ? { ...r, status: 'RESOLVED' } : r));
          }}
        />
      )}
    </div>
  );
}
