'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/ToastProvider';
import { compressImage } from '@/lib/image';

export default function ResolveModal({ report, onClose, onResolved, user }: { report: any, onClose: () => void, onResolved: () => void, user: any }) {
  const [image, setImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [result, setResult] = useState<{ isResolved: boolean, reasoning: string } | null>(null);
  const { showToast } = useToast();

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      try {
        const compressedFile = await compressImage(file);
        setImage(compressedFile);
        setPreviewUrl(URL.createObjectURL(compressedFile));
      } catch (err) {
        setImage(file);
        setPreviewUrl(URL.createObjectURL(file));
      }
      setResult(null);
    }
  };

  const handleVerify = async () => {
    if (!user) {
      showToast("PLEASE LOGIN TO VERIFY A RESOLUTION.", 'warning');
      return;
    }
    if (!image) return;
    setVerifying(true);
    setResult(null);

    const formData = new FormData();
    formData.append('image', image);
    formData.append('category', report.category);
    formData.append('description', report.description);

    try {
      const res = await fetch('/api/verify-resolution', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (res.ok) {
        setResult(data);
        if (data.isResolved) {
          const newHistory = [...(report.history || []), { type: "RESOLVED", timestamp: new Date().toISOString(), user: user.id }];
          const { error } = await supabase.from('reports').update({ status: 'RESOLVED', history: newHistory }).eq('id', report.id);
          if (error) throw error;
          showToast("ISSUE OFFICIALLY RESOLVED!", 'success');
          setTimeout(() => {
            onResolved();
            onClose();
          }, 2000);
        } else {
          showToast("AI rejected the resolution. Issue remains OPEN.", 'warning');
        }
      } else {
        throw new Error(data.error || "Unknown error");
      }
    } catch (err: any) {
      showToast("Verification failed: " + err.message, 'error');
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 9999, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '1rem' }}>
      <div className="brutalist-panel" style={{ width: '100%', maxWidth: '500px', backgroundColor: 'var(--bg-color)', display: 'flex', flexDirection: 'column' }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '4px solid var(--border-color)', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
          <h2 style={{ margin: 0, fontSize: '1.5rem', textTransform: 'uppercase' }}>MARK AS RESOLVED</h2>
          <button onClick={onClose} style={{ fontWeight: 800, fontSize: '1.5rem', background: 'none', border: 'none', cursor: 'pointer' }}>X</button>
        </div>

        <p style={{ fontWeight: 600, marginBottom: '1rem' }}>Upload a photo showing that this {report.category} has been fixed. Gemini AI will verify the visual evidence.</p>

        <input 
          type="file" 
          accept="image/*" 
          onChange={handleImageUpload} 
          style={{ padding: '1rem', border: '2px solid var(--border-color)', width: '100%', cursor: 'pointer', backgroundColor: '#f0f0f0', fontWeight: 600, marginBottom: '1rem' }} 
        />
        
        {previewUrl && (
          <img src={previewUrl} alt="Preview" style={{ width: '100%', height: '200px', objectFit: 'cover', border: '2px solid var(--border-color)', marginBottom: '1rem' }} />
        )}

        {result && (
          <div style={{ padding: '1rem', backgroundColor: result.isResolved ? 'white' : 'var(--primary-color)', color: result.isResolved ? 'var(--text-color)' : 'white', fontWeight: 800, marginBottom: '1rem', border: '4px solid var(--border-color)' }}>
            <div style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>{result.isResolved ? '[ VERIFIED FIXED ]' : '[ REJECTED ]'}</div>
            <div style={{ fontWeight: 600 }}>{result.reasoning}</div>
          </div>
        )}

        <button 
          onClick={handleVerify} 
          disabled={!image || verifying || result?.isResolved}
          className="btn-primary" 
          style={{ width: '100%', padding: '1rem', fontSize: '1.2rem', opacity: (!image || verifying || result?.isResolved) ? 0.5 : 1 }}>
          {verifying ? 'AI IS VERIFYING...' : 'SUBMIT FOR AI VERIFICATION'}
        </button>

      </div>
    </div>
  );
}
