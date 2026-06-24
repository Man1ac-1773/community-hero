'use client';
import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import DiscussionBoard from '@/components/DiscussionBoard';
import ResolveModal from '@/components/ResolveModal';
import html2canvas from 'html2canvas';
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
  const { user } = useAuth();
  const [resolving, setResolving] = useState(false);
  const { showToast } = useToast();
  const shareCardRef = useRef<HTMLDivElement>(null);

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
    try {
      let currentVerified: string[] = [];
      if (typeof report.verifiedBy === 'string') {
        try { currentVerified = JSON.parse(report.verifiedBy); } catch(e){}
      } else if (Array.isArray(report.verifiedBy)) {
        currentVerified = report.verifiedBy;
      }
      
      const newVerifiedBy = [...currentVerified, user.id];
      const newHistory = [...(report.history || []), { type: "VERIFIED", timestamp: new Date().toISOString(), user: user.id }];
      
      const { error } = await supabase
        .from('reports')
        .update({ verifiedBy: newVerifiedBy, history: newHistory })
        .eq('id', report.id);
        
      if (error) throw error;
      
      setReport({ ...report, verifiedBy: newVerifiedBy, history: newHistory });
      showToast("Verification added!", 'success');
    } catch (err: any) {
      showToast("Unable to log your verification at the moment.", 'error');
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
      const currentSubscribers = Array.isArray(report.subscribers) ? report.subscribers : [];
      if (currentSubscribers.includes(user.id)) {
        showToast("You are already subscribed to this issue.", "warning");
        return;
      }
      const newSubscribers = [...currentSubscribers, user.id];
      const { error } = await supabase.from('reports').update({ subscribers: newSubscribers }).eq('id', report.id);
      if (error) throw error;
      setReport({ ...report, subscribers: newSubscribers });
      showToast("Subscribed! You will be notified when this is resolved.", "success");
    } catch (err) {
      showToast("Failed to subscribe.", "error");
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
            {user && (
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                {!hasVerified && (
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
              <button onClick={() => setResolving(true)} className="btn-primary" style={{ marginTop: '1rem', width: '100%', padding: '1rem', backgroundColor: 'var(--text-color)', border: '4px solid var(--border-color)', color: 'white', fontWeight: 800, fontSize: '1.2rem', cursor: 'pointer' }}>
                MARK AS RESOLVED
              </button>
            )}

            {user && (
              <button onClick={handleSubscribe} className="btn-secondary" style={{ marginTop: '1rem', width: '100%', padding: '0.75rem', backgroundColor: 'transparent', border: '3px solid var(--border-color)', color: 'var(--text-color)', fontWeight: 800, fontSize: '1rem', cursor: 'pointer', opacity: (Array.isArray(report.subscribers) && report.subscribers.includes(user.id)) ? 0.5 : 1 }}>
                {(Array.isArray(report.subscribers) && report.subscribers.includes(user.id)) ? 'SUBSCRIBED TO UPDATES' : 'SUBSCRIBE TO UPDATES'}
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

      {resolving && (
        <ResolveModal 
          report={report}
          user={user}
          onClose={() => setResolving(false)}
          onResolved={() => {
            setReport({ ...report, status: 'RESOLVED' });
          }}
        />
      )}

      {/* Hidden Share Card for html2canvas */}
      <div style={{ position: 'fixed', left: '-9999px', top: 0 }}>
        <div ref={shareCardRef} style={{ width: '600px', backgroundColor: 'var(--bg-color)', padding: '2rem', border: '8px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '1rem', fontFamily: '"Space Grotesk", sans-serif' }}>
          <div style={{ backgroundColor: 'var(--primary-color)', color: 'white', padding: '1rem', border: '4px solid var(--border-color)', textAlign: 'center', fontWeight: 900, fontSize: '2.5rem', textTransform: 'uppercase' }}>
            CIVIC BOUNTY: {report.severity}
          </div>
          <h2 style={{ fontSize: '2rem', margin: 0, textTransform: 'uppercase' }}>{report.category}</h2>
          {report.imageUrl && <img src={report.imageUrl} alt="Issue" crossOrigin="anonymous" style={{ width: '100%', height: '300px', objectFit: 'cover', border: '4px solid var(--border-color)' }} />}
          <p style={{ fontSize: '1.2rem', fontWeight: 600, borderLeft: '8px solid var(--primary-color)', paddingLeft: '1rem' }}>{report.description}</p>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '4px solid var(--border-color)', paddingTop: '1rem', marginTop: '1rem' }}>
            <span style={{ fontWeight: 800, fontSize: '1.2rem' }}>VERIFICATIONS: {Array.isArray(report.verifiedBy) ? report.verifiedBy.length : (typeof report.verifiedBy === 'string' ? (JSON.parse(report.verifiedBy || '[]').length) : 0)}</span>
            <span style={{ fontWeight: 800, fontSize: '1.2rem' }}>CIVIC WATCH HUB</span>
          </div>
        </div>
      </div>
    </main>
  );
}
