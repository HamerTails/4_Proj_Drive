import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { authService } from './services/api';
import Login from './components/Login';
import Register from './components/Register';
import Dashboard from './components/Dashboard';
import PublicView from './components/PublicView';
import Trash from './components/Trash';

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

// ─── Layout principal ──────────────────────────────────────────
function AppLayout({ children, activeView, onNavigate, onLogout, theme, toggleTheme }) {
  const user = authService.getCurrentUser();
  const initial = user?.email?.[0]?.toUpperCase() || '?';

  return (
    <div className="app-layout">
      {/* SIDEBAR */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">S</div>
          <span className="sidebar-logo-text">SUPFile</span>
        </div>

        <div className="sidebar-section">
          <div className="sidebar-section-label">Navigation</div>

          <button
            className={`sidebar-item ${activeView === 'files' ? 'active' : ''}`}
            onClick={() => onNavigate('files')}
          >
            <Icon name="files" size={15} /> Mes fichiers
          </button>

          <button
            className={`sidebar-item ${activeView === 'shared' ? 'active' : ''}`}
            onClick={() => onNavigate('shared')}
          >
            <Icon name="shared" size={15} /> Partagés avec moi
          </button>

          <button
            className={`sidebar-item ${activeView === 'trash' ? 'active' : ''}`}
            onClick={() => onNavigate('trash')}
          >
            <Icon name="trash" size={15} /> Corbeille
          </button>
        </div>

        <div className="sidebar-section">
          <div className="sidebar-section-label">Compte</div>
          <button
            className={`sidebar-item ${activeView === 'settings' ? 'active' : ''}`}
            onClick={() => onNavigate('settings')}
          >
            <Icon name="settings" size={15} /> Paramètres
          </button>
        </div>

        <div className="sidebar-bottom">
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
  const [activeView, setActiveView] = useState('files');
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
      case 'files':    return <Dashboard theme={theme} />;
      case 'trash':    return <Trash />;
      case 'shared':   return <Dashboard theme={theme} sharedOnly />;
      case 'settings': return <div className="page-content"><div className="empty-state"><div className="empty-state-icon">⚙️</div><div className="empty-state-title">Paramètres</div><div className="empty-state-desc">Bientôt disponible</div></div></div>;
      default:         return <Dashboard theme={theme} />;
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
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}

export { Icon };
