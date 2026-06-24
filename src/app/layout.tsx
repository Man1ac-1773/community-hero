import type { Metadata } from "next";
import "./globals.css";
import Link from "next/link";
import AuthNav from "@/components/AuthNav";
import { ToastProvider } from "@/components/ToastProvider";

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
        <ToastProvider>
          <header className="header">
            <div className="container" style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
              <Link href="/" className="logo">
                CIVIC WATCH
              </Link>
              <nav style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <Link href="/report" className="nav-link">Report Issue</Link>
                <Link href="/map" className="nav-link">Live Map</Link>
                <AuthNav />
              </nav>
            </div>
          </header>
          {children}
        </ToastProvider>
      </body>
    </html>
  );
}
