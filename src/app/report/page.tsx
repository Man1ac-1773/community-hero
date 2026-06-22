'use client';
import { useState } from 'react';
import dynamic from 'next/dynamic';

// Dynamically import map component to avoid SSR issues with Leaflet
const MapPicker = dynamic(() => import('@/components/MapPicker'), { ssr: false, loading: () => <div style={{ height: '400px', border: '2px solid black', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>LOADING MAP...</div> });

export default function ReportPage() {
  const [image, setImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<{ category: string, severity: string, description: string } | null>(null);
  const [position, setPosition] = useState<[number, number] | null>(null);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImage(file);
      setPreviewUrl(URL.createObjectURL(file));
      
      // Trigger AI Analysis
      setAnalyzing(true);
      const formData = new FormData();
      formData.append('image', file);

      try {
        const res = await fetch('/api/analyze-image', {
          method: 'POST',
          body: formData,
        });
        const data = await res.json();
        if (res.ok) {
          setAnalysis(data);
        } else {
          console.error("Analysis failed:", data);
          alert("Failed to analyze image.");
        }
      } catch (err) {
        console.error("Error calling API:", err);
      } finally {
        setAnalyzing(false);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!image || !analysis || !position) {
      alert("PLEASE COMPLETE ALL STEPS: UPLOAD IMAGE, WAIT FOR AI ANALYSIS, AND PICK A LOCATION.");
      return;
    }
    
    try {
      // Dynamically import to keep it clean on client
      const { db, storage } = await import('@/lib/firebase');
      const { ref, uploadBytes, getDownloadURL } = await import('firebase/storage');
      const { collection, addDoc } = await import('firebase/firestore');

      // 1. Upload to Storage
      const storageRef = ref(storage, `reports/${Date.now()}_${image.name}`);
      await uploadBytes(storageRef, image);
      const downloadURL = await getDownloadURL(storageRef);

      // 2. Save to Firestore
      await addDoc(collection(db, 'reports'), {
        imageUrl: downloadURL,
        category: analysis.category,
        severity: analysis.severity,
        description: analysis.description,
        lat: position[0],
        lng: position[1],
        status: 'OPEN',
        timestamp: new Date().toISOString()
      });

      alert("REPORT SUBMITTED SUCCESSFULLY!");
      
      // Reset form
      setImage(null);
      setPreviewUrl(null);
      setAnalysis(null);
      setPosition(null);
    } catch (error) {
      console.error("Error submitting report:", error);
      alert("FAILED TO SUBMIT REPORT. CHECK CONSOLE.");
    }
  };

  return (
    <main className="container" style={{ padding: '4rem 2rem' }}>
      <h1 style={{ fontSize: '4rem', marginBottom: '3rem' }}>REPORT NEW ISSUE</h1>
      
      <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '3rem' }}>
        
        {/* Left Column: Image & Analysis */}
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
              <img src={previewUrl} alt="Preview" style={{ width: '100%', height: 'auto', marginTop: '1.5rem', border: '2px solid var(--border-color)' }} />
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

        {/* Right Column: Map & Submit */}
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
