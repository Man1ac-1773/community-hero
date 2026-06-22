'use client';
import { useState } from 'react';
import dynamic from 'next/dynamic';
import ImpactDashboard from '@/components/ImpactDashboard';

const LiveMap = dynamic(() => import('@/components/LiveMap'), { ssr: false, loading: () => <div style={{ height: '70vh', border: '2px solid black', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '2rem' }}>INITIALIZING MAP DATA...</div> });

export default function MapPage() {
  const [reports, setReports] = useState<any[]>([]);

  return (
    <main className="container" style={{ padding: '4rem 2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '4rem', marginBottom: '0.5rem' }}>CITY DASHBOARD</h1>
          <p style={{ fontWeight: 600, fontSize: '1.25rem' }}>LIVE OVERVIEW OF ALL REPORTED CIVIC ISSUES.</p>
        </div>
      </div>
      
      <ImpactDashboard reports={reports} />
      <LiveMap reports={reports} setReports={setReports} />
    </main>
  );
}
