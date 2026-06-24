'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import DiscussionBoard from '@/components/DiscussionBoard';
import ResolveModal from '@/components/ResolveModal';
import Link from 'next/link';
import { useToast } from '@/components/ToastProvider';
import { useParams, useRouter } from 'next/navigation';

export default function IssuePage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [resolving, setResolving] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    async function loadIssue() {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);

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

      const { error } = await supabase
        .from('reports')
        .update({ verifiedBy: newVerifiedBy })
        .eq('id', report.id);
        
      if (error) throw error;
      setReport({ ...report, verifiedBy: newVerifiedBy });
      showToast("Verification added!", 'success');
    } catch (err: any) {
      showToast("Unable to log your verification at the moment.", 'error');
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
          <div style={{ padding: '1.5rem', backgroundColor: '#FFEA00', borderBottom: '4px solid var(--border-color)', margin: '-1.5rem -1.5rem 0 -1.5rem' }}>
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
            <div style={{ padding: '0.5rem 1rem', backgroundColor: '#e0e0e0', color: 'black', fontWeight: 800, fontSize: '1rem' }}>
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
            <p style={{ margin: 0, fontWeight: 500, fontSize: '1.2rem', lineHeight: '1.6' }}>{report.description}</p>
          </div>

          <div style={{ marginTop: 'auto', display: 'flex', gap: '1rem' }}>
            {user && report.userId !== user.id && !hasVerified && (
              <button onClick={handleVerify} style={{ flexGrow: 1, padding: '1rem', backgroundColor: 'transparent', border: '4px solid var(--primary-color)', color: 'var(--primary-color)', fontWeight: 800, fontSize: '1.2rem', cursor: 'pointer' }}>
                VERIFY ISSUE
              </button>
            )}
            {report.status === 'OPEN' && (
              <button onClick={() => setResolving(true)} style={{ flexGrow: 1, padding: '1rem', backgroundColor: '#00E676', border: '4px solid var(--border-color)', color: 'black', fontWeight: 800, fontSize: '1.2rem', cursor: 'pointer' }}>
                MARK AS RESOLVED
              </button>
            )}
          </div>
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
    </main>
  );
}
