'use client';
import { useRouter } from 'next/navigation';

export default function TriagePanel({ 
  triage, 
  variant, 
  onViewPrimary, 
  onSubmitAnyway 
}: { 
  triage: any, 
  variant: 'report' | 'issue',
  onViewPrimary?: () => void,
  onSubmitAnyway?: () => void
}) {
  const router = useRouter();

  if (!triage) return null;

  const getClassificationColor = () => {
    switch(triage.classification) {
      case 'NEW_INCIDENT': return 'var(--primary-color)';
      case 'LIKELY_DUPLICATE': return '#ef4444';
      case 'RELATED_CLUSTER': return '#f59e0b';
      default: return '#fff';
    }
  };

  const isDuplicate = triage.classification === 'LIKELY_DUPLICATE';

  return (
    <div style={{
      border: `2px solid ${getClassificationColor()}`,
      backgroundColor: '#111',
      padding: '1.5rem',
      marginBottom: '2rem',
      boxShadow: `4px 4px 0px ${getClassificationColor()}`
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
        <div>
          <span style={{ 
            backgroundColor: getClassificationColor(), 
            color: '#fff', 
            padding: '0.2rem 0.5rem', 
            fontWeight: 800,
            fontSize: '0.8rem',
            marginRight: '0.5rem'
          }}>
            {triage.classification.replace('_', ' ')}
          </span>
          {triage.priorityBand && (
            <span style={{ 
              backgroundColor: triage.priorityBand === 'CRITICAL' ? '#7f1d1d' : '#333', 
              color: '#fff', 
              padding: '0.2rem 0.5rem', 
              fontWeight: 800,
              fontSize: '0.8rem'
            }}>
              PRIORITY: {triage.priorityBand} ({triage.priorityScore})
            </span>
          )}
        </div>
      </div>

      <h3 style={{ marginTop: 0, marginBottom: '0.5rem', color: '#fff' }}>{triage.caseBrief?.headline || 'Incident Triage'}</h3>
      <p style={{ color: '#ccc', marginBottom: '1rem', lineHeight: '1.5' }}>{triage.caseBrief?.summary}</p>
      
      <div style={{ padding: '1rem', backgroundColor: '#222', borderLeft: '4px solid #444', marginBottom: '1.5rem' }}>
        <p style={{ margin: '0 0 0.5rem 0', color: '#fff' }}><strong>Why it matters:</strong> {triage.caseBrief?.whyItMatters}</p>
        <p style={{ margin: '0 0 0.5rem 0', color: '#fff' }}><strong>Community Signal:</strong> {triage.caseBrief?.communitySignal}</p>
        <p style={{ margin: 0, color: '#fff' }}><strong>Next Step:</strong> {triage.caseBrief?.nextStep}</p>
      </div>

      {variant === 'report' && isDuplicate && (
        <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem', flexWrap: 'wrap' }}>
          <button 
            onClick={() => {
              if (onViewPrimary) onViewPrimary();
              else if (triage.primaryReportId) router.push(`/issue/${triage.primaryReportId}`);
            }}
            style={{
              padding: '0.75rem 1rem',
              backgroundColor: 'var(--primary-color)',
              color: '#fff',
              border: 'none',
              fontWeight: 'bold',
              cursor: 'pointer',
              flex: 1
            }}
          >
            VERIFY PRIMARY INCIDENT
          </button>
          
          <button 
            onClick={onSubmitAnyway}
            style={{
              padding: '0.75rem 1rem',
              backgroundColor: 'transparent',
              color: '#888',
              border: '2px solid #444',
              fontWeight: 'bold',
              cursor: 'pointer',
              flex: 1
            }}
          >
            SUBMIT AS NEW (OVERRIDE)
          </button>
        </div>
      )}

      {variant === 'issue' && triage.primaryReportId && triage.classification === 'LIKELY_DUPLICATE' && (
        <button 
          onClick={() => router.push(`/issue/${triage.primaryReportId}`)}
          style={{
            padding: '0.75rem 1rem',
            backgroundColor: 'var(--primary-color)',
            color: '#fff',
            border: 'none',
            fontWeight: 'bold',
            cursor: 'pointer',
            width: '100%',
            marginTop: '1rem'
          }}
        >
          VIEW PRIMARY INCIDENT
        </button>
      )}

      {triage.classification === 'RELATED_CLUSTER' && triage.relatedReportIds && triage.relatedReportIds.length > 0 && (
        <div style={{ marginTop: '1rem', borderTop: '2px dashed #444', paddingTop: '1rem' }}>
          <p style={{ margin: '0 0 0.5rem 0', color: '#f59e0b', fontWeight: 'bold', fontSize: '0.9rem' }}>INCIDENTS IN THIS HOTSPOT:</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {triage.relatedReportIds.map((rid: string) => (
              <button 
                key={rid}
                onClick={() => router.push(`/issue/${rid}`)}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: 'transparent',
                  color: '#fff',
                  border: '2px solid #666',
                  cursor: 'pointer',
                  textAlign: 'left',
                  fontWeight: 'bold',
                  display: 'flex',
                  justifyContent: 'space-between'
                }}
              >
                <span>VIEW RELATED ISSUE</span>
                <span style={{ color: '#888' }}>{rid.substring(0, 8)}...</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
