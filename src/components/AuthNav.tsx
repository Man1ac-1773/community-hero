'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { User } from '@supabase/supabase-js';

export default function AuthNav() {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogin = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google'
    });
    if (error) {
      console.error("Login failed:", error);
      alert("Login Error: " + error.message);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  if (user) {
    const name = user.user_metadata?.full_name || user.email?.split('@')[0] || 'Citizen';
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
          <span style={{ fontWeight: 700, fontSize: '0.9rem', textTransform: 'uppercase', color: 'var(--primary-color)' }}>{name}</span>
          <span style={{ fontWeight: 600, fontSize: '0.7rem', color: '#888' }}>⭐ HERO LEVEL 3</span>
        </div>
        <button onClick={handleLogout} className="btn-secondary" style={{ padding: '0.5rem 1rem', fontSize: '0.8rem', border: '2px solid var(--border-color)', boxShadow: '2px 2px 0px 0px #111111' }}>
          LOGOUT
        </button>
      </div>
    );
  }

  return (
    <button onClick={handleLogin} className="btn-primary" style={{ padding: '0.5rem 1rem', fontSize: '0.8rem', border: '2px solid var(--border-color)', boxShadow: '2px 2px 0px 0px #111111' }}>
      GOOGLE LOGIN
    </button>
  );
}
