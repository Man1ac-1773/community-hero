'use client';
import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import DiscussionBoard from '@/components/DiscussionBoard';
import html2canvas from 'html2canvas';
import dynamic from 'next/dynamic';
import TriagePanel from '@/components/TriagePanel';

const MapPicker = dynamic(() => import('@/components/MapPicker'), { ssr: false });
import Link from 'next/link';
import { useToast } from '@/components/ToastProvider';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/hooks';

export default function IssuePage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isUpdatingLocation, setIsUpdatingLocation] = useState(false);
  const [newPosition, setNewPosition] = useState<[number, number] | null>(null);
  const { user } = useAuth();
  const { showToast } = useToast();
  const shareCardRef = useRef<HTMLDivElement>(null);
  
  const [generatingUpdate, setGeneratingUpdate] = useState(false);
  const [publicUpdate, setPublicUpdate] = useState<string | null>(null);

  useEffect(() => {
    async function loadIssue() {
      const { data, error } = await supabase
        .from('reports')
        .select('*')
        .eq('id', id)
        .single();
        
      if (data) setReport(data);
      setLoading(false);
    }
    loadIssue();
  }, [id]);

  const handleVerify = async () => {
    if (!user) {
      showToast("PLEASE LOGIN TO VERIFY REPORTS.", 'warning');
      return;
    }
    if (report.userId === user.id) {
      showToast("You cannot verify your own reported issue.", 'warning');
      return;
    }
    try {
      const { error } = await supabase.rpc('verify_report', { report_id: report.id });
      if (error) throw error;
      
      const currentVerified = Array.isArray(report.verifiedBy) ? report.verifiedBy : [];
      const newVerifiedBy = [...currentVerified, user.id];
      const newHistory = [...(report.history || []), { type: "VERIFIED", timestamp: new Date().toISOString(), user: user.id }];
      
      setReport({ ...report, verifiedBy: newVerifiedBy, history: newHistory });
      showToast("Issue successfully verified!", "success");
    } catch (err) {
      showToast("Failed to verify issue.", "error");
    }
  };

  const handleShare = async () => {
    if (!shareCardRef.current) return;
    try {
      const canvas = await html2canvas(shareCardRef.current, { useCORS: true, scale: 2 });
      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `civic-watch-${report.id.substring(0, 8)}.png`;
      link.href = dataUrl;
      link.click();
      showToast("Bounty card downloaded! Share it to rally the community.", "success");
    } catch (err) {
      console.error(err);
      showToast("Failed to generate shareable card.", "error");
    }
  };

  const handleSubscribe = async () => {
    if (!user) {
      showToast("PLEASE LOGIN TO SUBSCRIBE.", 'warning');
      return;
    }
    try {
      const { error } = await supabase.rpc('subscribe_report', { report_id: report.id });
      if (error) throw error;
      
      const currentSubscribers = Array.isArray(report.subscribers) ? report.subscribers : [];
      setReport({ ...report, subscribers: [...currentSubscribers, user.id] });
      showToast("Subscribed! You will be notified when this is resolved.", "success");
    } catch (err) {
      showToast("Failed to subscribe.", "error");
    }
  };

  const handleConfirmResolution = async () => {
    if (!user) {
      showToast("PLEASE LOGIN TO CONFIRM RESOLUTION.", 'warning');
      return;
    }
    try {
      const { error } = await supabase.rpc('resolve_report', { report_id: report.id });
      if (error) throw error;
      
      const currentResolvedBy = Array.isArray(report.resolvedBy) ? report.resolvedBy : [];
      const newResolvedBy = [...currentResolvedBy, user.id];
      const isNowResolved = newResolvedBy.length >= 3;
      const newStatus = isNowResolved ? 'RESOLVED' : 'OPEN';
      
      const newHistory = [...(report.history || []), { 
        type: isNowResolved ? "RESOLVED" : "RESOLUTION_VOTE", 
        timestamp: new Date().toISOString(), 
        user: isNowResolved ? "SYSTEM" : user.id 
      }];

      setReport({ ...report, resolvedBy: newResolvedBy, status: newStatus, history: newHistory });
      
      if (isNowResolved) {
        showToast("Community consensus reached! Issue is now officially RESOLVED.", "success");
      } else {
        showToast(`Vote recorded! ${3 - newResolvedBy.length} more vote(s) needed.`, "success");
      }
    } catch (err) {
      showToast("Failed to confirm resolution.", "error");
    }
  };

  const handleUpdateLocation = async () => {
    if (!newPosition) return;
    try {
      const { error } = await supabase
        .from('reports')
        .update({ lat: newPosition[0], lng: newPosition[1] })
        .eq('id', report.id);
      
      if (error) throw error;
      
      setReport({ ...report, lat: newPosition[0], lng: newPosition[1] });
      setIsUpdatingLocation(false);
      showToast("Location successfully updated!", "success");
    } catch (err) {
      showToast("Failed to update location.", "error");
    }
  };

  const handleGenerateUpdate = async () => {
    setGeneratingUpdate(true);
    setPublicUpdate(null);
    try {
      const res = await fetch('/api/generate-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: report.category,
          severity: report.severity,
          description: report.description,
          status: report.status,
          triageClassification: report.triageClassification,
          caseBrief: report.caseBrief
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to generate update.");
      setPublicUpdate(data.update);
      showToast("Public update generated successfully!", "success");
    } catch (err: any) {
      console.error(err);
      showToast(err.message, "error");
    } finally {
      setGeneratingUpdate(false);
    }
  };

  if (loading) return <h2 style={{ textAlign: 'center', padding: '4rem' }}>LOADING ISSUE DETAILS...</h2>;
  if (!report) return <h2 style={{ textAlign: 'center', padding: '4rem' }}>ISSUE NOT FOUND.</h2>;

  const verifiedByVal = report.verifiedBy as any;
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
    <main className="container" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '2rem', minHeight: '80vh' }}>
      
      <Link href="/map" style={{ fontWeight: 800, color: 'var(--primary-color)', textDecoration: 'underline' }}>
        ← BACK TO MAP
      </Link>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', flexGrow: 1 }}>
        {/* LEFT COLUMN: DETAILS */}
        <div className="brutalist-panel" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', backgroundColor: 'var(--bg-color)' }}>
          <div style={{ padding: '1.5rem', backgroundColor: 'var(--primary-color)', color: 'white', borderBottom: '4px solid var(--border-color)', margin: '-1.5rem -1.5rem 0 -1.5rem' }}>
            <h1 style={{ margin: 0, fontSize: '3rem', textTransform: 'uppercase', lineHeight: '1' }}>{report.category}</h1>
            <p style={{ margin: '0.5rem 0 0 0', fontWeight: 600 }}>REPORTED BY: {report.userName?.toUpperCase() || 'CITIZEN'}</p>
          </div>

          {report.triageClassification && (
            <TriagePanel 
              triage={{
                classification: report.triageClassification,
                confidence: report.triageConfidence,
                primaryReportId: report.duplicateOf,
                relatedReportIds: report.relatedReportIds,
                clusterKey: report.clusterKey,
                priorityScore: report.priorityScore,
                priorityBand: report.priorityBand,
                recommendedAction: report.recommendedAction,
                reasoning: report.triageReasoning,
                caseBrief: report.caseBrief,
                signals: report.triageSignals
              }} 
              variant="issue" 
            />
          )}

          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <div style={{ padding: '0.5rem 1rem', backgroundColor: 'var(--text-color)', color: 'white', fontWeight: 800, fontSize: '1rem' }}>
              STATUS: {report.status}
            </div>
            <div style={{ padding: '0.5rem 1rem', backgroundColor: 'var(--primary-color)', color: 'white', fontWeight: 800, fontSize: '1rem' }}>
              SEVERITY: {report.severity}
            </div>
            <div style={{ padding: '0.5rem 1rem', backgroundColor: 'white', color: 'var(--text-color)', fontWeight: 800, fontSize: '1rem', border: '2px solid var(--border-color)' }}>
              VERIFICATIONS: {verifyCount}
            </div>
          </div>

          {report.imageUrl && (
            <img 
              src={report.imageUrl} 
              alt="Issue" 
              style={{ width: '100%', maxHeight: '400px', objectFit: 'cover', border: '4px solid var(--border-color)' }} 
            />
          )}

          <div style={{ padding: '1rem', backgroundColor: 'white', border: '2px solid var(--border-color)' }}>
            <p style={{ margin: 0, fontWeight: 600, fontSize: '1.2rem', lineHeight: '1.6' }}>{report.description}</p>
          </div>

          <div style={{ marginTop: 'auto' }}>
            <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem', flexWrap: 'wrap' }}>
              <button 
                onClick={handleGenerateUpdate}
                disabled={generatingUpdate}
                className="btn-primary"
                style={{ flexGrow: 1, padding: '1rem', border: '3px solid var(--border-color)', fontWeight: 800, fontSize: '1.2rem', textTransform: 'uppercase', backgroundColor: '#111', color: 'white' }}
              >
                {generatingUpdate ? 'GENERATING...' : '✨ AI OFFICIAL COPILOT'}
              </button>
            </div>
            
            {publicUpdate && (
              <div style={{ marginTop: '1.5rem', padding: '1.5rem', backgroundColor: '#f0f0f0', border: '4px solid var(--primary-color)' }}>
                <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.2rem', textTransform: 'uppercase', color: 'var(--primary-color)' }}>PUBLIC ANNOUNCEMENT DRAFT</h3>
                <div style={{ whiteSpace: 'pre-wrap', fontFamily: 'serif', fontSize: '1.1rem', lineHeight: '1.6', color: '#111' }}>
                  {publicUpdate}
                </div>
              </div>
            )}

            {user && (
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                {!hasVerified && report.userId !== user.id && (
                  <button 
                    onClick={handleVerify}
                    className="btn-primary"
                    style={{ flexGrow: 1, padding: '1rem', border: '3px solid var(--border-color)', fontWeight: 800, fontSize: '1.2rem', textTransform: 'uppercase', opacity: report.status === 'RESOLVED' ? 0.5 : 1, pointerEvents: report.status === 'RESOLVED' ? 'none' : 'auto' }}
                  >
                    VERIFY ISSUE
                  </button>
                )}
                
                <button 
                  onClick={handleShare}
                  className="btn-secondary"
                  style={{ flexGrow: 1, padding: '1rem', border: '3px solid var(--border-color)', fontWeight: 800, fontSize: '1.2rem', textTransform: 'uppercase', backgroundColor: 'var(--border-color)', color: 'white' }}
                >
                  SHARE TO RALLY
                </button>
              </div>
            )}
            
            {report.status === 'OPEN' && (
              <div style={{ marginTop: '1rem', border: '4px solid var(--border-color)', padding: '1rem', backgroundColor: 'var(--bg-color)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', fontWeight: 800 }}>
                  <span>RESOLUTION CONSENSUS</span>
                  <span>{Array.isArray(report.resolvedBy) ? report.resolvedBy.length : 0} / 3 REQUIRED</span>
                </div>
                <div style={{ width: '100%', height: '10px', backgroundColor: 'white', border: '2px solid black', marginBottom: '1rem' }}>
                  <div style={{ height: '100%', backgroundColor: 'var(--primary-color)', width: `${Math.min(((Array.isArray(report.resolvedBy) ? report.resolvedBy.length : 0) / 3) * 100, 100)}%` }}></div>
                </div>
                <button 
                  onClick={handleConfirmResolution} 
                  disabled={user && Array.isArray(report.resolvedBy) && report.resolvedBy.includes(user.id)}
                  className="btn-primary" 
                  style={{ width: '100%', padding: '1rem', backgroundColor: 'var(--text-color)', border: '4px solid var(--border-color)', color: 'white', fontWeight: 800, fontSize: '1.2rem', cursor: 'pointer', opacity: (user && Array.isArray(report.resolvedBy) && report.resolvedBy.includes(user.id)) ? 0.5 : 1 }}
                >
                  {(user && Array.isArray(report.resolvedBy) && report.resolvedBy.includes(user.id)) ? 'RESOLUTION VOTE CAST' : 'VOTE TO RESOLVE ISSUE'}
                </button>
              </div>
            )}

            {user && (
              <button onClick={handleSubscribe} className="btn-secondary" style={{ marginTop: '1rem', width: '100%', padding: '0.75rem', backgroundColor: 'transparent', border: '3px solid var(--border-color)', color: 'var(--text-color)', fontWeight: 800, fontSize: '1rem', cursor: 'pointer', opacity: (Array.isArray(report.subscribers) && report.subscribers.includes(user.id)) ? 0.5 : 1 }}>
                {(Array.isArray(report.subscribers) && report.subscribers.includes(user.id)) ? 'SUBSCRIBED TO UPDATES' : 'SUBSCRIBE TO UPDATES'}
              </button>
            )}

            {user && report.userId === user.id && (
              <button onClick={() => { setIsUpdatingLocation(true); setNewPosition([report.lat, report.lng]); }} className="btn-secondary" style={{ marginTop: '1rem', width: '100%', padding: '0.75rem', backgroundColor: 'transparent', border: '3px dashed var(--primary-color)', color: 'var(--primary-color)', fontWeight: 800, fontSize: '1rem', cursor: 'pointer' }}>
                CORRECT GPS LOCATION
              </button>
            )}
          </div>
          
          {/* AUDIT TIMELINE */}
          {report.history && report.history.length > 0 && (
            <div style={{ marginTop: '2rem', padding: '1rem', backgroundColor: 'white', border: '4px solid var(--border-color)' }}>
              <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.2rem', textTransform: 'uppercase' }}>AUDIT TIMELINE</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {report.history.map((event: any, idx: number) => (
                  <div key={idx} style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: event.type === 'RESOLVED' ? 'var(--primary-color)' : 'black' }}></div>
                    <div style={{ flexGrow: 1 }}>
                      <div style={{ fontWeight: 800 }}>{event.type}</div>
                      <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#666' }}>{new Date(event.timestamp).toLocaleString()}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: DISCUSSION */}
        <div style={{ height: '100%', maxHeight: 'calc(100vh - 150px)' }}>
          <DiscussionBoard reportId={report.id} user={user} />
        </div>
      </div>

      {isUpdatingLocation && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 9999, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '1rem' }}>
          <div className="brutalist-panel" style={{ width: '100%', maxWidth: '600px', backgroundColor: 'var(--bg-color)', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '4px solid var(--border-color)', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
              <h2 style={{ margin: 0, fontSize: '1.5rem', textTransform: 'uppercase' }}>UPDATE LOCATION</h2>
              <button onClick={() => setIsUpdatingLocation(false)} style={{ fontWeight: 800, fontSize: '1.5rem', background: 'none', border: 'none', cursor: 'pointer' }}>X</button>
            </div>
            <p style={{ fontWeight: 600, marginBottom: '1rem' }}>Drag the map to correct the GPS coordinates for this issue.</p>
            <div style={{ marginBottom: '1rem', border: '4px solid var(--border-color)' }}>
              <MapPicker position={newPosition} setPosition={setNewPosition} />
            </div>
            <button 
              onClick={handleUpdateLocation}
              className="btn-primary" 
              style={{ width: '100%', padding: '1rem', fontSize: '1.2rem' }}>
              SAVE NEW LOCATION
            </button>
          </div>
        </div>
      )}

      {/* Hidden Share Card for html2canvas */}
      <div style={{ position: 'fixed', left: '-9999px', top: 0 }}>
        <div ref={shareCardRef} style={{ width: '600px', backgroundColor: 'var(--bg-color)', padding: '2rem', border: '8px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '1rem', fontFamily: '"Space Grotesk", sans-serif' }}>
          <div style={{ backgroundColor: 'var(--primary-color)', color: 'white', padding: '1rem', border: '4px solid var(--border-color)', textAlign: 'center', fontWeight: 900, fontSize: '2.5rem', textTransform: 'uppercase' }}>
            CIVIC BOUNTY: {report.severity}
          </div>
          <h2 style={{ fontSize: '2rem', margin: 0, textTransform: 'uppercase' }}>{report.category}</h2>
          <p style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: 'var(--primary-color)' }}>
            REPORTED BY CIVIC HERO: {report.userName || 'ANONYMOUS'}
          </p>
          {report.imageUrl && <img src={report.imageUrl} alt="Issue" crossOrigin="anonymous" style={{ width: '100%', height: '300px', objectFit: 'cover', border: '4px solid var(--border-color)' }} />}
          <p style={{ fontSize: '1.2rem', fontWeight: 600, borderLeft: '8px solid var(--primary-color)', paddingLeft: '1rem' }}>{report.description}</p>
          <div style={{ padding: '0.5rem', backgroundColor: '#eee', border: '2px solid var(--border-color)', fontWeight: 700, textAlign: 'center' }}>
            📍 GPS: {report.lat.toFixed(6)}, {report.lng.toFixed(6)}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '4px solid var(--border-color)', paddingTop: '1rem', marginTop: '1rem' }}>
            <span style={{ fontWeight: 800, fontSize: '1.2rem' }}>VERIFICATIONS: {Array.isArray(report.verifiedBy) ? report.verifiedBy.length : (typeof report.verifiedBy === 'string' ? (JSON.parse(report.verifiedBy || '[]').length) : 0)}</span>
            <span style={{ fontWeight: 800, fontSize: '1.2rem' }}>CIVIC WATCH HUB</span>
          </div>
        </div>
      </div>
    </main>
  );
}
