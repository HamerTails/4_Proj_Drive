// composant Toast global — monté une seule fois dans App.jsx
// usage depuis n'importe où : window.__toast('message') ou window.__toastError('message')
import { useState, useEffect, useCallback } from 'react';

let _addToast = null;

export function toast(message, type = 'info') {
  _addToast?.({ message, type, id: Date.now() + Math.random() });
}

export function toastError(message) { toast(message, 'error'); }
export function toastSuccess(message) { toast(message, 'success'); }

export default function ToastContainer() {
  const [toasts, setToasts] = useState([]);

  const add = useCallback((t) => {
    setToasts(prev => [...prev, t]);
    setTimeout(() => setToasts(prev => prev.filter(x => x.id !== t.id)), 4000);
  }, []);

  useEffect(() => {
    _addToast = add;
    window.__toast      = (msg) => add({ message: msg, type: 'info',    id: Date.now() + Math.random() });
    window.__toastError = (msg) => add({ message: msg, type: 'error',   id: Date.now() + Math.random() });
    window.__toastSuccess=(msg) => add({ message: msg, type: 'success', id: Date.now() + Math.random() });
    return () => { _addToast = null; };
  }, [add]);

  if (toasts.length === 0) return null;

  return (
    <div style={{ position: 'fixed', bottom: 24, right: 24, display: 'flex', flexDirection: 'column', gap: 8, zIndex: 9999 }}>
      {toasts.map(t => (
        <div key={t.id} style={{
          background: t.type === 'error' ? 'var(--danger)' : t.type === 'success' ? 'var(--success)' : 'var(--bg-primary)',
          color: t.type === 'error' || t.type === 'success' ? 'white' : 'var(--text-primary)',
          border: t.type === 'info' ? '1px solid var(--border)' : 'none',
          borderRadius: 'var(--radius-md)',
          padding: '12px 16px',
          boxShadow: 'var(--shadow-lg)',
          fontSize: 13.5,
          fontWeight: 500,
          minWidth: 260,
          maxWidth: 380,
          animation: 'slideUp 200ms ease',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
        }}>
          {t.type === 'error'   && <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>}
          {t.type === 'success' && <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>}
          {t.message}
        </div>
      ))}
    </div>
  );
}
