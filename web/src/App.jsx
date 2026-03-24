import { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
const QUOTA_MAX = 30 * 1024 ** 3; // 30 Go en bytes
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { authService } from './services/api';
import Login from './components/Login';
import Register from './components/Register';
import Dashboard from './components/Dashboard';
import PublicView from './components/PublicView';
import Trash from './components/Trash';
import Settings from './components/Settings';
import DashboardHome from './components/DashboardHome';
import ToastContainer from './components/Toast';

// ─── Icônes SVG inline légères ────────────────────────────────
const Icon = ({ name, size = 16 }) => {
  const icons = {
    files:    <><rect x="3" y="3" width="8" height="10" rx="1.5"/><rect x="9" y="1" width="8" height="10" rx="1.5" opacity=".4"/></>,
    trash:    <><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></>,
    shared:   <><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></>,
    settings: <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"/></>,
    logout:   <><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></>,
    sun:      <><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></>,
    moon:     <><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></>,
    dashboard:<><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></>,
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {icons[name]}
    </svg>
  );
};

const SIDEBAR_MIN = 180;
const SIDEBAR_MAX = 420;
const SIDEBAR_DEFAULT = 240;

// ─── Layout principal ──────────────────────────────────────────
function AppLayout({ children, activeView, onNavigate, onLogout, theme, toggleTheme }) {
  const user = authService.getCurrentUser();
  const initial = user?.email?.[0]?.toUpperCase() || '?';

  const [quota, setQuota] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    axios.get(API_URL + '/api/storage/usage', { headers: { Authorization: 'Bearer ' + token } })
      .then(r => setQuota(r.data))
      .catch(() => {});
  }, []);

  const [sidebarWidth, setSidebarWidth] = useState(
    () => parseInt(localStorage.getItem('sidebarWidth')) || SIDEBAR_DEFAULT
  );
  const isDragging = useRef(false);

  const onMouseDown = useCallback((e) => {
    e.preventDefault();
    isDragging.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, []);

  const onMouseMove = useCallback((e) => {
    if (!isDragging.current) return;
    const newWidth = Math.min(Math.max(e.clientX, SIDEBAR_MIN), SIDEBAR_MAX);
    setSidebarWidth(newWidth);
  }, []);

  const onMouseUp = useCallback(() => {
    if (!isDragging.current) return;
    isDragging.current = false;
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
    setSidebarWidth(w => { localStorage.setItem('sidebarWidth', w); return w; });
  }, []);

  useEffect(() => {
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [onMouseMove, onMouseUp]);

  return (
    <div className="app-layout">
      {/* SIDEBAR */}
      <aside className="sidebar" style={{ width: sidebarWidth, minWidth: sidebarWidth, position: "relative" }}>
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">S</div>
          <span className="sidebar-logo-text">SUPFile</span>
        </div>

        <div className="sidebar-section">
          <div className="sidebar-section-label">Navigation</div>

          <button
            className={'sidebar-item' + (activeView === 'dashboard' ? ' active' : '')}
            onClick={() => onNavigate('dashboard')}
          >
            <Icon name="dashboard" size={15} /> Tableau de bord
          </button>

          <button
            className={'sidebar-item' + (activeView === 'files' ? ' active' : '')}
            onClick={() => onNavigate('files')}
          >
            <Icon name="files" size={15} /> Mes fichiers
          </button>

          <button
            className={'sidebar-item' + (activeView === 'shared' ? ' active' : '')}
            onClick={() => onNavigate('shared')}
          >
            <Icon name="shared" size={15} /> Partagés avec moi
          </button>

          <button
            className={'sidebar-item' + (activeView === 'trash' ? ' active' : '')}
            onClick={() => onNavigate('trash')}
          >
            <Icon name="trash" size={15} /> Corbeille
          </button>
        </div>

        <div className="sidebar-section">
          <div className="sidebar-section-label">Compte</div>
          <button
            className={'sidebar-item' + (activeView === 'settings' ? ' active' : '')}
            onClick={() => onNavigate('settings')}
          >
            <Icon name="settings" size={15} /> Paramètres
          </button>
        </div>

        <div className="sidebar-bottom">
          {/* ── Jauge quota ── */}
          {quota !== null && (() => {
            const used = quota.storage_used || 0;
            const pct  = Math.min((used / QUOTA_MAX) * 100, 100);
            const color = pct > 90 ? 'var(--danger)' : pct > 70 ? 'var(--warning)' : 'var(--accent)';
            const fmt = (b) => b < 1024**3 ? (b/1024**2).toFixed(0)+' Mo' : (b/1024**3).toFixed(1)+' Go';
            return (
              <div style={{ padding: '6px 12px 10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 5 }}>
                  <span>{fmt(used)} utilisés</span>
                  <span>30 Go</span>
                </div>
                <div style={{ height: 5, background: 'var(--bg-tertiary)', borderRadius: 99, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: pct + '%', background: color, borderRadius: 99, transition: 'width 800ms ease' }} />
                </div>
                <div style={{ fontSize: 11, color: pct > 90 ? 'var(--danger)' : 'var(--text-tertiary)', marginTop: 4 }}>
                  {pct.toFixed(1)}% — {fmt(QUOTA_MAX - used)} disponible
                </div>
              </div>
            );
          })()}
          {/* Toggle thème */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 10px 8px' }}>
            <span style={{ fontSize: 11.5, color: 'var(--text-tertiary)' }}>
              {theme === 'dark' ? 'Thème sombre' : 'Thème clair'}
            </span>
            <button className="theme-toggle" onClick={toggleTheme} title="Changer le thème">
              <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={15} />
            </button>
          </div>

          {/* User */}
          <div className="sidebar-user" onClick={onLogout} title="Se déconnecter">
            <div className="sidebar-avatar">{initial}</div>
            <div className="sidebar-user-info">
              <div className="sidebar-user-email">{user?.email}</div>
            </div>
            <Icon name="logout" size={14} />
          </div>
        </div>
        {/* ── Poignée de redimensionnement ── */}
        <div
          style={{ position: 'absolute', top: 0, right: 0, width: 5, height: '100%', cursor: 'col-resize', zIndex: 10 }}
          onMouseDown={onMouseDown}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(37,99,235,0.35)'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        />
      </aside>

      {/* CONTENU */}
      <main className="main-content">
        {children}
      </main>
    </div>
  );
}

// ─── App principale ────────────────────────────────────────────
function AppContent() {
  const [isAuth, setIsAuth] = useState(authService.isAuthenticated());
  const [activeView, setActiveView] = useState('dashboard');
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('theme') || 'light';
  });

  // Appliquer le thème au document
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(t => t === 'light' ? 'dark' : 'light');

  const handleLogout = () => {
    authService.logout();
    setIsAuth(false);
    setActiveView('files');
  };

  const handleLogin = () => {
    setIsAuth(true);
  };

  if (!isAuth) {
    return (
      <Routes>
        <Route path="/login"    element={<Login    onLogin={handleLogin} />} />
        <Route path="/register" element={<Register onRegister={handleLogin} />} />
        <Route path="/public/:token" element={<PublicView />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  const renderView = () => {
    switch (activeView) {
      case 'dashboard': return <DashboardHome onNavigateFiles={() => setActiveView('files')} />;
      case 'files':    return <Dashboard theme={theme} />;
      case 'trash':    return <Trash />;
      case 'shared':   return <Dashboard theme={theme} sharedOnly />;
      case 'settings': return <Settings theme={theme} toggleTheme={toggleTheme} />;
      default:         return <DashboardHome onNavigateFiles={() => setActiveView('files')} />;
    }
  };

  return (
    <Routes>
      <Route path="/public/:token" element={<PublicView />} />
      <Route path="*" element={
        <AppLayout
          activeView={activeView}
          onNavigate={setActiveView}
          onLogout={handleLogout}
          theme={theme}
          toggleTheme={toggleTheme}
        >
          {renderView()}
        </AppLayout>
      } />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <ToastContainer />
      <AppContent />
    </BrowserRouter>
  );
}

export { Icon };