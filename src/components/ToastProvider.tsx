'use client';
import React, { createContext, useContext, useState, ReactNode } from 'react';

type ToastType = 'success' | 'error' | 'warning';

interface ToastMessage {
  id: number;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  showToast: (message: string, type: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = (message: string, type: ToastType) => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div style={{ position: 'fixed', bottom: '2rem', right: '2rem', zIndex: 9999, display: 'flex', flexDirection: 'column', gap: '1rem', pointerEvents: 'none' }}>
        {toasts.map((toast) => (
          <div key={toast.id} style={{
            padding: '1.25rem 1.5rem',
            border: '3px solid black',
            backgroundColor: toast.type === 'error' ? 'var(--primary-color)' : toast.type === 'success' ? '#00E676' : '#FFEA00',
            color: 'white',
            fontWeight: 800,
            boxShadow: '6px 6px 0px 0px #111111',
            textTransform: 'uppercase',
            animation: 'slideIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
            maxWidth: '350px',
            pointerEvents: 'auto',
            fontFamily: '"Space Grotesk", sans-serif',
            textShadow: '1px 1px 0px black'
          }}>
            {toast.message}
          </div>
        ))}
      </div>
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes slideIn {
          from { transform: translateX(120%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within ToastProvider');
  return context;
}
