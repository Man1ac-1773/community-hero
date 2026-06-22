'use client';
import { useState, useEffect } from 'react';
import { auth } from '@/lib/firebase';
import { signInWithPopup, GoogleAuthProvider, signOut, User } from 'firebase/auth';

export default function AuthNav() {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((u) => {
      setUser(u);
    });
    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Login failed:", error);
    }
  };

  const handleLogout = () => {
    signOut(auth);
  };

  if (user) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <span style={{ fontWeight: 700, fontSize: '0.9rem', textTransform: 'uppercase', color: 'var(--primary-color)' }}>{user.displayName}</span>
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
