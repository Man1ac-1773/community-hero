'use client';

interface Report {
  id: string;
  category: string;
  severity: string;
  verifiedBy?: string[];
  triageClassification?: string;
  clusterKey?: string;
}

export default function ImpactDashboard({ reports }: { reports: Report[] }) {
  const total = reports.length;
  const critical = reports.filter(r => r.severity && (r.severity.toUpperCase() === 'CRITICAL' || r.severity.toUpperCase() === 'HIGH')).length;
  const verified = reports.filter(r => r.verifiedBy && r.verifiedBy.length > 0).length;
  const duplicates = reports.filter(r => r.triageClassification === 'LIKELY_DUPLICATE').length;
  
  // Count unique clusters
  const clusters = new Set();
  reports.forEach(r => {
    if (r.triageClassification === 'RELATED_CLUSTER' && r.clusterKey) {
      clusters.add(r.clusterKey);
    }
  });
  const hotspotCount = clusters.size;

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
      <div className="brutalist-panel" style={{ backgroundColor: '#f59e0b', color: 'white' }}>
        <p style={{ fontSize: '0.9rem', fontWeight: 600, color: '#333' }}>HOTSPOTS MAPPED</p>
        <p style={{ fontSize: '3rem', fontWeight: 700 }}>{hotspotCount}</p>
      </div>
      <div className="brutalist-panel" style={{ backgroundColor: '#222', color: 'white' }}>
        <p style={{ fontSize: '0.9rem', fontWeight: 600, color: '#888' }}>DUPLICATES DETECTED</p>
        <p style={{ fontSize: '3rem', fontWeight: 700 }}>{duplicates}</p>
      </div>
    </div>
  );
}
