'use client';
import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/ToastProvider';
import { compressImage } from '@/lib/image';
import { useAuth } from '@/lib/hooks';
import exifr from 'exifr';
import TriagePanel from '@/components/TriagePanel';

const MapPicker = dynamic(() => import('@/components/MapPicker'), { ssr: false, loading: () => <div style={{ height: '400px', border: '2px solid black', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>LOADING MAP...</div> });

export default function ReportPage() {
  const [image, setImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<{ category: string, severity: string, description: string } | null>(null);
  const [position, setPosition] = useState<[number, number] | null>(null);
  const [exifLocation, setExifLocation] = useState<[number, number] | null>(null);
  const [triaging, setTriaging] = useState(false);
  const [triageResult, setTriageResult] = useState<any>(null);
  const { user } = useAuth();
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
      
      // Extract EXIF location
      try {
        const gps = await exifr.gps(file);
        if (gps && gps.latitude && gps.longitude) {
          setExifLocation([gps.latitude, gps.longitude]);
          showToast("Geotag found! Updating map location.", "success");
        } else {
          setExifLocation(null);
        }
      } catch (err) {
        setExifLocation(null);
      }

      try {
        const compressedFile = await compressImage(file);
        setImage(compressedFile);
        setPreviewUrl(URL.createObjectURL(compressedFile));
      } catch (err) {
        console.error("Compression failed:", err);
        setImage(file);
        setPreviewUrl(URL.createObjectURL(file));
      }
      setAnalysis(null);
    }
  };

  const handleAnalyzeImage = async () => {
    if (!image) return;
    setAnalyzing(true);
    const formData = new FormData();
    formData.append('image', image);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const res = await fetch('/api/analyze-image', {
        method: 'POST',
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
        body: formData,
      });
      const data = await res.json();
      if (res.ok) {
        setAnalysis(data);
      } else if (res.status === 429) {
        showToast("The AI is experiencing high traffic. Please wait 30 seconds and try again.", 'warning');
      } else {
        console.error("===== ANALYSIS API FAILED =====");
        console.error("HTTP Status:", res.status);
        console.error("Response Data:", data);
        showToast("AI analysis couldn't complete. Please try uploading the image again.", 'error');
      }
    } catch (err: any) {
      console.error("===== NETWORK/CLIENT ERROR =====");
      console.error("Error calling API:", err);
      showToast("Network issue connecting to our AI server. Please check your connection.", 'error');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleRunTriage = async () => {
    if (!analysis || !position) return;
    setTriaging(true);
    setTriageResult(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      
      const res = await fetch('/api/triage-report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          category: analysis.category,
          severity: analysis.severity,
          description: analysis.description,
          lat: position[0],
          lng: position[1]
        })
      });

      if (!res.ok) {
        if (res.status === 429) {
          throw new Error("The AI is experiencing high traffic. Please wait 30 seconds and try again.");
        }
        throw new Error("Failed to run triage");
      }
      const data = await res.json();
      setTriageResult(data);
    } catch (err: any) {
      console.error(err);
      showToast(err.message || "Triage failed.", "error");
    } finally {
      setTriaging(false);
    }
  };

  const handleSubmit = async (e?: React.FormEvent, isOverride = false) => {
    if (e) e.preventDefault();
    if (!user) {
      showToast("YOU MUST BE LOGGED IN TO SUBMIT A REPORT.", 'warning');
      return;
    }
    if (!image || !analysis || !position || !triageResult) {
      showToast("PLEASE COMPLETE ALL STEPS INCLUDING TRIAGE.", 'warning');
      return;
    }
    
    let uploadedFileName = '';
    try {
      // 1. Upload to Supabase Storage
      uploadedFileName = `${Date.now()}_${image.name}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('reports')
        .upload(uploadedFileName, image);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('reports')
        .getPublicUrl(uploadedFileName);

      // 2. Save via Trusted API
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const res = await fetch('/api/create-report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          imageUrl: publicUrl,
          category: analysis.category,
          severity: analysis.severity,
          description: analysis.description,
          lat: position[0],
          lng: position[1],
          ...triageResult,
          userOverride: isOverride
        })
      });

      if (!res.ok) throw new Error("Failed to create report");

      showToast("REPORT SUBMITTED SUCCESSFULLY!", 'success');
      
      // Reset form
      setImage(null);
      setPreviewUrl(null);
      setAnalysis(null);
      setPosition(null);
      setTriageResult(null);
    } catch (error: any) {
      console.error("Error submitting report:", error);
      if (uploadedFileName) {
        console.log("Cleaning up orphaned image:", uploadedFileName);
        supabase.storage.from('reports').remove([uploadedFileName]).catch(e => console.error("Cleanup failed", e));
      }
      showToast("We couldn't save your report this time. Please try again.", 'error');
    }
  };

  return (
    <main className="container" style={{ padding: '4rem 2rem' }}>
      <h1 style={{ fontSize: '4rem', marginBottom: '3rem' }}>REPORT NEW ISSUE</h1>
      
      {!user && (
        <div style={{ padding: '2rem', backgroundColor: 'var(--text-color)', color: 'white', border: '2px solid var(--border-color)', marginBottom: '2rem', textAlign: 'center' }}>
          <h2 style={{ color: 'var(--primary-color)' }}>AUTHENTICATION REQUIRED</h2>
          <p style={{ fontWeight: 600, marginTop: '0.5rem' }}>Please login using the Google button in the header to submit a civic report.</p>
        </div>
      )}
      
      <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '3rem', opacity: user ? 1 : 0.5, pointerEvents: user ? 'auto' : 'none' }}>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <div className="brutalist-panel">
            <h3 style={{ marginBottom: '1.5rem', fontSize: '1.5rem' }}>1 / UPLOAD PHOTO</h3>
            <input 
              type="file" 
              accept="image/*" 
              onChange={handleImageUpload} 
              style={{ padding: '1rem', border: '2px solid var(--border-color)', width: '100%', cursor: 'pointer', backgroundColor: '#f0f0f0', fontWeight: 600 }} 
            />
            {previewUrl && (
              <>
                <img src={previewUrl} alt="Preview" style={{ width: '100%', height: 'auto', marginTop: '1.5rem', border: '2px solid var(--border-color)' }} />
                <button 
                  type="button" 
                  onClick={handleAnalyzeImage} 
                  disabled={analyzing}
                  className="btn-secondary" 
                  style={{ width: '100%', marginTop: '1rem', padding: '1rem', fontSize: '1rem', border: '2px solid var(--border-color)', boxShadow: '4px 4px 0px 0px #111111' }}>
                  {analyzing ? 'ANALYZING...' : 'RUN AI ANALYSIS'}
                </button>
              </>
            )}
          </div>

          <div className="brutalist-panel" style={{ backgroundColor: 'var(--text-color)', color: 'white' }}>
            <h3 style={{ marginBottom: '1.5rem', color: 'var(--primary-color)', fontSize: '1.5rem' }}>2 / AI ANALYSIS</h3>
            {analyzing ? (
              <p style={{ color: '#f0f0f0' }}>GEMINI VISION IS ANALYZING THE IMAGE...</p>
            ) : analysis ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div>
                  <strong style={{ display: 'block', textTransform: 'uppercase', color: '#888', marginBottom: '0.25rem' }}>CATEGORY:</strong>
                  <span style={{ fontSize: '1.5rem', fontWeight: 700 }}>{analysis.category}</span>
                </div>
                <div>
                  <strong style={{ display: 'block', textTransform: 'uppercase', color: '#888', marginBottom: '0.25rem' }}>SEVERITY:</strong>
                  <span style={{ fontSize: '1.5rem', fontWeight: 700, color: analysis.severity.toUpperCase() === 'CRITICAL' || analysis.severity.toUpperCase() === 'HIGH' ? 'var(--primary-color)' : 'white' }}>{analysis.severity}</span>
                </div>
                <div>
                  <strong style={{ display: 'block', textTransform: 'uppercase', color: '#888', marginBottom: '0.25rem' }}>DESCRIPTION:</strong>
                  <p style={{ fontWeight: 400, color: '#f0f0f0' }}>{analysis.description}</p>
                </div>
              </div>
            ) : (
              <p style={{ color: '#888', fontWeight: 400 }}>UPLOAD AN IMAGE TO AUTO-GENERATE DETAILS.</p>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <div className="brutalist-panel" style={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
            <h3 style={{ marginBottom: '1.5rem', fontSize: '1.5rem' }}>3 / PIN LOCATION</h3>
            <p style={{ marginBottom: '1.5rem', fontWeight: 600 }}>CLICK ON THE MAP TO MARK THE EXACT LOCATION OF THE ISSUE.</p>
            <div style={{ flexGrow: 1 }}>
               <MapPicker position={position} setPosition={setPosition} suggestedLocation={exifLocation} />
            </div>
            {position && (
              <div style={{ marginTop: '1.5rem', padding: '1rem', backgroundColor: 'var(--bg-color)', border: '2px solid var(--border-color)' }}>
                <strong>SELECTED COORDINATES:</strong> <br/>
                LAT: {position[0].toFixed(5)}, LNG: {position[1].toFixed(5)}
              </div>
            )}
          </div>

          <button type="button" onClick={handleRunTriage} disabled={!analysis || !position || triaging} className="btn-primary" style={{ width: '100%', padding: '1.5rem', fontSize: '1.5rem', opacity: (!analysis || !position) ? 0.5 : 1 }}>
            {triaging ? 'RUNNING TRIAGE...' : '4 / RUN INCIDENT TRIAGE'}
          </button>
          
          {triageResult && (
            <div style={{ marginTop: '1rem' }}>
              <TriagePanel 
                triage={triageResult} 
                variant="report" 
                onSubmitAnyway={() => handleSubmit(undefined, true)} 
              />
              {triageResult.classification !== 'LIKELY_DUPLICATE' && (
                <button type="submit" className="btn-primary" style={{ width: '100%', padding: '1.5rem', fontSize: '1.5rem', marginTop: '1rem' }}>
                  SUBMIT CIVIC REPORT
                </button>
              )}
            </div>
          )}
        </div>

      </form>
    </main>
  );
}
