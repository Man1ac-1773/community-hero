'use client';
import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { supabase } from '@/lib/supabase';
import { User } from '@supabase/supabase-js';
import { useToast } from '@/components/ToastProvider';

const MapPicker = dynamic(() => import('@/components/MapPicker'), { ssr: false, loading: () => <div style={{ height: '400px', border: '2px solid black', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>LOADING MAP...</div> });

export default function ReportPage() {
  const [image, setImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<{ category: string, severity: string, description: string } | null>(null);
  const [position, setPosition] = useState<[number, number] | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const { showToast } = useToast();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const compressImage = (file: File): Promise<File> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 800;
          const MAX_HEIGHT = 800;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          canvas.toBlob((blob) => {
            if (blob) {
              resolve(new File([blob], file.name, { type: 'image/jpeg' }));
            } else {
              reject(new Error('Canvas to Blob failed'));
            }
          }, 'image/jpeg', 0.7);
        };
      };
      reader.onerror = (error) => reject(error);
    });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
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
      const res = await fetch('/api/analyze-image', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (res.ok) {
        setAnalysis(data);
      } else {
        console.error("===== ANALYSIS API FAILED =====");
        console.error("HTTP Status:", res.status);
        console.error("Response Data:", data);
        showToast("Failed to analyze image: " + (data.error || "Unknown error"), 'error');
      }
    } catch (err: any) {
      console.error("===== NETWORK/CLIENT ERROR =====");
      console.error("Error calling API:", err);
      showToast("Error calling API: " + err.message, 'error');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      showToast("YOU MUST BE LOGGED IN TO SUBMIT A REPORT.", 'warning');
      return;
    }
    if (!image || !analysis || !position) {
      showToast("PLEASE COMPLETE ALL STEPS: UPLOAD IMAGE, WAIT FOR AI ANALYSIS, AND PICK A LOCATION.", 'warning');
      return;
    }
    
    try {
      // 1. Upload to Supabase Storage
      const fileName = `${Date.now()}_${image.name}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('reports')
        .upload(fileName, image);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('reports')
        .getPublicUrl(fileName);

      // 2. Save to Supabase DB
      const { error: dbError } = await supabase
        .from('reports')
        .insert([
          {
            imageUrl: publicUrl,
            category: analysis.category,
            severity: analysis.severity,
            description: analysis.description,
            lat: position[0],
            lng: position[1],
            status: 'OPEN',
            userId: user.id,
            userName: user.user_metadata?.full_name || 'Anonymous',
            verifiedBy: []
          }
        ]);

      if (dbError) throw dbError;

      showToast("REPORT SUBMITTED SUCCESSFULLY!", 'success');
      
      // Reset form
      setImage(null);
      setPreviewUrl(null);
      setAnalysis(null);
      setPosition(null);
    } catch (error: any) {
      console.error("Error submitting report:", error);
      showToast("FAILED TO SUBMIT REPORT: " + error.message, 'error');
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
               <MapPicker position={position} setPosition={setPosition} />
            </div>
            {position && (
              <div style={{ marginTop: '1.5rem', padding: '1rem', backgroundColor: 'var(--bg-color)', border: '2px solid var(--border-color)' }}>
                <strong>SELECTED COORDINATES:</strong> <br/>
                LAT: {position[0].toFixed(5)}, LNG: {position[1].toFixed(5)}
              </div>
            )}
          </div>

          <button type="submit" className="btn-primary" style={{ width: '100%', padding: '1.5rem', fontSize: '1.5rem' }}>
            SUBMIT CIVIC REPORT
          </button>
        </div>

      </form>
    </main>
  );
}
