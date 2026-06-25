import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { User } from '@supabase/supabase-js';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  return { user, loading };
}

export function useImpactScore(userId: string | undefined) {
  const [scoreData, setScoreData] = useState({ score: 0, level: 1, title: 'BYSTANDER' });

  useEffect(() => {
    if (!userId) return;

    async function fetchScore() {
      // Fetch user's own reports
      const { data: myData } = await supabase
        .from('reports')
        .select('triageClassification')
        .eq('userId', userId);
      
      const myReportsScore = (myData || []).reduce((acc, r) => acc + (r.triageClassification === 'LIKELY_DUPLICATE' ? 2 : 10), 0);

      // Fetch user's verified reports
      const { data: verifiedData } = await supabase
        .from('reports')
        .select('id')
        .contains('verifiedBy', [userId]);
      
      const verificationsScore = (verifiedData || []).length * 2;
      
      const impactScore = myReportsScore + verificationsScore;

      let heroLevel = 1;
      let heroTitle = "BYSTANDER";
      if (impactScore >= 100) { heroLevel = 5; heroTitle = "CIVIC VIGILANTE"; }
      else if (impactScore >= 50) { heroLevel = 4; heroTitle = "URBAN HERO"; }
      else if (impactScore >= 20) { heroLevel = 3; heroTitle = "NEIGHBORHOOD WATCH"; }
      else if (impactScore >= 10) { heroLevel = 2; heroTitle = "ACTIVE CITIZEN"; }

      setScoreData({ score: impactScore, level: heroLevel, title: heroTitle });
    }

    fetchScore();
  }, [userId]);

  return scoreData;
}
