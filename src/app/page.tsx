import Link from 'next/link';

export default function Home() {
  return (
    <main className="container" style={{ paddingTop: '6rem', paddingBottom: '4rem' }}>
      <section style={{ textAlign: 'center', padding: '2rem 0', border: '2px solid var(--border-color)', backgroundColor: 'white', boxShadow: '8px 8px 0px 0px #111111', marginBottom: '4rem' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto', padding: '4rem 2rem' }}>
          <h1 style={{ fontSize: '4.5rem' }}>BE A CIVIC HERO.</h1>
          <p style={{ margin: '0 auto 3rem auto', fontSize: '1.25rem' }}>
            SEE A PROBLEM? REPORT IT INSTANTLY. OUR AI CATEGORIZES THE ISSUE AND PINS IT TO THE LIVE MAP FOR RESOLUTION.
          </p>
          <div style={{ display: 'flex', gap: '1.5rem', justifyContent: 'center' }}>
            <Link href="/report" className="btn-primary">
              REPORT AN ISSUE
            </Link>
            <Link href="/map" className="btn-secondary">
              VIEW LIVE MAP
            </Link>
          </div>
        </div>
      </section>

      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
        <div className="brutalist-panel">
          <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--primary-color)', marginBottom: '0.5rem' }}>01 / SNAP</div>
          <h3 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>TAKE A PHOTO</h3>
          <p style={{ fontWeight: 500 }}>Notice a pothole, broken streetlight, or waste? Just take a quick picture. We handle the manual entry.</p>
        </div>
        <div className="brutalist-panel" style={{ backgroundColor: 'var(--text-color)', color: 'white' }}>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--primary-color)', marginBottom: '0.5rem' }}>02 / AI</div>
          <h3 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>GEMINI ANALYSIS</h3>
          <p style={{ fontWeight: 500, color: '#f0f0f0' }}>Powered by Gemini, our platform analyzes your image to determine the category and severity instantly.</p>
        </div>
        <div className="brutalist-panel">
          <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--primary-color)', marginBottom: '0.5rem' }}>03 / MAP</div>
          <h3 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>LIVE TRACKING</h3>
          <p style={{ fontWeight: 500 }}>Your issue is pinned on the live map where the community and authorities can track its resolution.</p>
        </div>
      </section>
    </main>
  );
}
