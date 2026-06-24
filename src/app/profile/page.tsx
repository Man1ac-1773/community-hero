'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { User } from '@supabase/supabase-js';
import Link from 'next/link';

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
  created_at: string;
}

export default function ProfilePage() {
  const [user, setUser] = useState<User | null>(null);
  const [myReports, setMyReports] = useState<Report[]>([]);
  const [verifiedReports, setVerifiedReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadProfile() {
      const { data: { session } } = await supabase.auth.getSession();
      const currentUser = session?.user ?? null;
      setUser(currentUser);

      if (currentUser) {
        // Fetch user's own reports
        const { data: myData, error: myError } = await supabase
          .from('reports')
          .select('*')
          .eq('userId', currentUser.id);
        
        if (myData) setMyReports(myData as Report[]);
        if (myError) console.error("My reports error:", myError);

        // Using ilike because verifiedBy is a stringified JSON array
        const { data: verifiedData, error: vError } = await supabase
          .from('reports')
          .select('*')
          .ilike('verifiedBy', `%${currentUser.id}%`);

        if (verifiedData) setVerifiedReports(verifiedData as Report[]);
        if (vError) console.error("Verified reports error:", vError);
      }
      setLoading(false);
    }
    loadProfile();
  }, []);

  if (loading) {
    return (
      <main className="container" style={{ padding: '4rem 2rem', textAlign: 'center' }}>
        <h1 style={{ fontSize: '3rem' }}>LOADING HERO PROFILE...</h1>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="container" style={{ padding: '4rem 2rem' }}>
        <div style={{ padding: '2rem', backgroundColor: 'var(--text-color)', color: 'white', border: '2px solid var(--border-color)', textAlign: 'center' }}>
          <h2 style={{ color: 'var(--primary-color)' }}>AUTHENTICATION REQUIRED</h2>
          <p style={{ fontWeight: 600, marginTop: '0.5rem' }}>Please login to view your Citizen Profile.</p>
        </div>
      </main>
    );
  }

  const totalReports = myReports.length;
  const totalVerifications = verifiedReports.length;
  // Calculate impact score: 10 points per report, 2 points per verification
  const impactScore = (totalReports * 10) + (totalVerifications * 2);
  
  let heroLevel = 1;
  let heroTitle = "BYSTANDER";
  if (impactScore >= 100) { heroLevel = 5; heroTitle = "CIVIC VIGILANTE"; }
  else if (impactScore >= 50) { heroLevel = 4; heroTitle = "URBAN HERO"; }
  else if (impactScore >= 20) { heroLevel = 3; heroTitle = "NEIGHBORHOOD WATCH"; }
  else if (impactScore >= 10) { heroLevel = 2; heroTitle = "ACTIVE CITIZEN"; }

  const ReportGrid = ({ reports }: { reports: Report[] }) => {
    if (reports.length === 0) return <p style={{ fontWeight: 600, color: '#888' }}>NO ISSUES FOUND.</p>;
    
    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '2rem' }}>
        {reports.map(report => (
          <div key={report.id} className="brutalist-panel" style={{ padding: '1rem', display: 'flex', flexDirection: 'column' }}>
            <img src={report.imageUrl} alt={report.category} style={{ width: '100%', height: '150px', objectFit: 'cover', border: '2px solid var(--border-color)', marginBottom: '1rem' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
              <strong style={{ fontSize: '1.2rem', textTransform: 'uppercase', color: 'var(--primary-color)' }}>{report.category}</strong>
              <span style={{ padding: '0.25rem 0.5rem', backgroundColor: 'var(--text-color)', color: 'white', fontWeight: 700, fontSize: '0.7rem' }}>
                {report.status}
              </span>
            </div>
            <p style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.5rem' }}>SEVERITY: {report.severity}</p>
            <p style={{ fontSize: '0.9rem', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', flexGrow: 1 }} title={report.description}>
              {report.description}
            </p>
            <Link href={`/map?issueId=${report.id}`} style={{ marginTop: '1rem', textAlign: 'center', display: 'block', padding: '0.5rem', border: '2px solid var(--border-color)', color: 'var(--text-color)', fontWeight: 700, textDecoration: 'none' }}>
              VIEW ON MAP
            </Link>
          </div>
        ))}
      </div>
    );
  };

  return (
    <main className="container" style={{ padding: '4rem 2rem' }}>
      
      {/* Hero Card Section */}
      <div className="brutalist-panel" style={{ marginBottom: '4rem', display: 'flex', flexWrap: 'wrap', gap: '3rem', alignItems: 'center' }}>
        <div style={{ flex: '1 1 300px' }}>
          <h1 style={{ fontSize: '3.5rem', textTransform: 'uppercase', marginBottom: '0.5rem', wordBreak: 'break-word' }}>
            {user.user_metadata?.full_name || user.email?.split('@')[0]}
          </h1>
          <div style={{ display: 'inline-block', padding: '0.5rem 1rem', backgroundColor: 'var(--primary-color)', color: 'white', fontWeight: 800, fontSize: '1.2rem', textTransform: 'uppercase', marginBottom: '1.5rem', border: '2px solid var(--border-color)', boxShadow: '4px 4px 0px 0px #111111' }}>
            [ LEVEL {heroLevel} : {heroTitle} ]
          </div>
          <p style={{ fontSize: '1.1rem', fontWeight: 600 }}>Your civic impact score is <span style={{ color: 'var(--primary-color)', fontWeight: 800 }}>{impactScore} points</span>.</p>
        </div>
        
        <div style={{ flex: '1 1 300px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div style={{ padding: '1.5rem', border: '2px solid var(--border-color)', backgroundColor: 'var(--bg-color)', textAlign: 'center' }}>
            <div style={{ fontSize: '3rem', fontWeight: 800 }}>{totalReports}</div>
            <div style={{ fontWeight: 700, fontSize: '0.8rem', textTransform: 'uppercase' }}>Issues Reported</div>
          </div>
          <div style={{ padding: '1.5rem', border: '2px solid var(--border-color)', backgroundColor: 'var(--bg-color)', textAlign: 'center' }}>
            <div style={{ fontSize: '3rem', fontWeight: 800 }}>{totalVerifications}</div>
            <div style={{ fontWeight: 700, fontSize: '0.8rem', textTransform: 'uppercase' }}>Verifications</div>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '4rem' }}>
        <section>
          <h2 style={{ fontSize: '2.5rem', marginBottom: '2rem', borderBottom: '4px solid var(--border-color)', paddingBottom: '0.5rem', display: 'inline-block' }}>MY SUBMISSIONS</h2>
          <ReportGrid reports={myReports} />
        </section>

        <section>
          <h2 style={{ fontSize: '2.5rem', marginBottom: '2rem', borderBottom: '4px solid var(--border-color)', paddingBottom: '0.5rem', display: 'inline-block' }}>TRACKED ISSUES</h2>
          <ReportGrid reports={verifiedReports} />
        </section>
      </div>

    </main>
  );
}
