'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

interface LeaderboardEntry {
  userId: string;
  userName: string;
  reportsSubmitted: number;
  reportsVerified: number;
  impactScore: number;
}

export default function LeaderboardPage() {
  const [leaders, setLeaders] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchLeaderboard() {
      // Fetch all reports to aggregate data
      const { data: reports } = await supabase.from('reports').select('*');
      
      if (reports) {
        const userMap = new Map<string, LeaderboardEntry>();

        reports.forEach((report: any) => {
          // Add submission score
          if (report.userId) {
            if (!userMap.has(report.userId)) {
              userMap.set(report.userId, { userId: report.userId, userName: report.userName || 'Anonymous', reportsSubmitted: 0, reportsVerified: 0, impactScore: 0 });
            }
            const entry = userMap.get(report.userId)!;
            entry.reportsSubmitted += 1;
            entry.impactScore += 10;
          }

          // Add verification scores
          if (report.verifiedBy && Array.isArray(report.verifiedBy)) {
            report.verifiedBy.forEach((vUserId: string) => {
              if (!userMap.has(vUserId)) {
                userMap.set(vUserId, { userId: vUserId, userName: 'Citizen ' + vUserId.substring(0,4), reportsSubmitted: 0, reportsVerified: 0, impactScore: 0 });
              }
              const entry = userMap.get(vUserId)!;
              entry.reportsVerified += 1;
              entry.impactScore += 2;
            });
          }
        });

        const sorted = Array.from(userMap.values()).sort((a, b) => b.impactScore - a.impactScore);
        setLeaders(sorted);
      }
      setLoading(false);
    }
    fetchLeaderboard();
  }, []);

  return (
    <main className="container" style={{ padding: '4rem 2rem' }}>
      <h1 style={{ fontSize: '4rem', marginBottom: '1rem', textTransform: 'uppercase', textAlign: 'center' }}>CITY LEADERBOARD</h1>
      <p style={{ textAlign: 'center', fontWeight: 600, fontSize: '1.2rem', marginBottom: '4rem' }}>The most impactful citizens fixing our city.</p>

      {loading ? (
        <h2 style={{ textAlign: 'center' }}>CALCULATING SCORES...</h2>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: '800px', margin: '0 auto' }}>
          {leaders.map((leader, index) => (
            <div key={leader.userId} className="brutalist-panel" style={{ display: 'flex', alignItems: 'center', padding: '1.5rem', backgroundColor: index === 0 ? 'var(--primary-color)' : index === 1 ? 'white' : index === 2 ? 'white' : 'var(--bg-color)', color: index === 0 ? 'white' : 'black' }}>
              <div style={{ fontSize: '2.5rem', fontWeight: 800, width: '60px', textAlign: 'center', borderRight: '4px solid var(--border-color)', marginRight: '1.5rem', paddingRight: '1rem' }}>
                #{index + 1}
              </div>
              <div style={{ flexGrow: 1 }}>
                <h3 style={{ margin: 0, fontSize: '1.5rem', textTransform: 'uppercase' }}>{leader.userName}</h3>
                <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem', fontWeight: 600, color: '#444' }}>
                  <span>{leader.reportsSubmitted} REPORTS</span>
                  <span>{leader.reportsVerified} VERIFICATIONS</span>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '2.5rem', fontWeight: 800, color: index === 0 ? 'white' : index < 3 ? 'black' : 'var(--primary-color)' }}>{leader.impactScore}</div>
                <div style={{ fontWeight: 700, fontSize: '0.8rem', textTransform: 'uppercase' }}>IMPACT SCORE</div>
              </div>
            </div>
          ))}
          {leaders.length === 0 && <p style={{ textAlign: 'center', fontWeight: 600 }}>NO HEROES YET.</p>}
        </div>
      )}
    </main>
  );
}
