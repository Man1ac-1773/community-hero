'use client';

interface Report {
  id: string;
  category: string;
  severity: string;
  verifiedBy?: string[];
}

export default function ImpactDashboard({ reports }: { reports: Report[] }) {
  const total = reports.length;
  const critical = reports.filter(r => r.severity && (r.severity.toUpperCase() === 'CRITICAL' || r.severity.toUpperCase() === 'HIGH')).length;
  const verified = reports.filter(r => r.verifiedBy && r.verifiedBy.length > 0).length;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
      <div className="brutalist-panel" style={{ backgroundColor: 'var(--text-color)', color: 'white' }}>
        <p style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--primary-color)' }}>TOTAL REPORTS</p>
        <p style={{ fontSize: '3rem', fontWeight: 700 }}>{total}</p>
      </div>
      <div className="brutalist-panel">
        <p style={{ fontSize: '0.9rem', fontWeight: 600, color: '#ef4444' }}>CRITICAL HAZARDS</p>
        <p style={{ fontSize: '3rem', fontWeight: 700 }}>{critical}</p>
      </div>
      <div className="brutalist-panel" style={{ backgroundColor: 'var(--primary-color)', color: 'white' }}>
        <p style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--bg-color)' }}>COMMUNITY VERIFIED</p>
        <p style={{ fontSize: '3rem', fontWeight: 700 }}>{verified}</p>
      </div>
    </div>
  );
}
