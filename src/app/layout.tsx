import type { Metadata } from "next";
import "./globals.css";
import Link from "next/link";

export const metadata: Metadata = {
  title: "CIVIC WATCH - Community Issue Tracker",
  description: "Report and resolve community issues.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <header className="header">
          <div className="container" style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
            <Link href="/" className="logo">
              CIVIC WATCH
            </Link>
            <nav style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <Link href="/report" className="nav-link">Report Issue</Link>
              <Link href="/map" className="nav-link">Live Map</Link>
            </nav>
          </div>
        </header>
        {children}
      </body>
    </html>
  );
}
