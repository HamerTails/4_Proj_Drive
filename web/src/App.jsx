import { useState, useEffect, useRef, useCallback } from 'react';
import { storageService } from './services/api';
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
const QUOTA_MAX = 30 * 1024 ** 3; // 30 Go en bytes
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { authService } from './services/api';
import Login from './components/Login';
import Register from './components/Register';
import Dashboard from './components/Dashboard';
import PublicView from './components/PublicView';
import Trash from './components/Trash';
import Settings from './components/Settings';
import DashboardHome from './components/DashboardHome';
import ToastContainer from './components/Toast';

import iconFiles     from '../icone/files.svg';
import iconTrash     from '../icone/trash.svg';
import iconShared    from '../icone/shared.svg';
import iconSettings  from '../icone/settings.svg';
import iconLogout    from '../icone/logout.svg';
import iconSun       from '../icone/sun.svg';
import iconMoon      from '../icone/moon.svg';
import iconDashboard from '../icone/dashboard.svg';

const iconMap = {
  files:     iconFiles,
  trash:     iconTrash,
  shared:    iconShared,
  settings:  iconSettings,
  logout:    iconLogout,
  sun:       iconSun,
  moon:      iconMoon,
  dashboard: iconDashboard,
};

const Icon = ({ name, size = 16 }) => (
  <img
    src={iconMap[name]}
    width={size}
    height={size}
    alt={name}
    style={{ display: 'inline-block', verticalAlign: 'middle' }}
  />
);

const SIDEBAR_MIN = 180;
const SIDEBAR_MAX = 420;
const SIDEBAR_DEFAULT = 240;

// -- Layout principal --
function AppLayout({ children, activeView, onNavigate, onLogout, theme, toggleTheme, user }) {
  const initial = user?.email?.[0]?.toUpperCase() || '?';
  const avatarUrl = getAvatarUrl(user);
  const [quota, setQuota] = useState(null);

  useEffect(() => {
    storageService.getUsage()
      .then(function(data) { setQuota(data); })
      .catch(function() {});
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
          {/* -- Jauge quota -- */}
          {quota !== null && (() => {
            const used = quota.storage_used || 0;
            const pct  = Math.min((used / QUOTA_MAX) * 100, 100);
            const color = pct > 90 ? 'var(--danger)' : pct > 70 ? 'var(--warning)' : 'var(--accent)';
            const fmt = (b) => {
              const n = Number(b);
              if (!n || n < 0) return '0 o';
              if (n < 1024)      return n + ' o';
              if (n < 1024 ** 2) return (n / 1024).toFixed(1) + ' Ko';
              if (n < 1024 ** 3) return (n / 1024 ** 2).toFixed(2) + ' Mo';
              return (n / 1024 ** 3).toFixed(2) + ' Go';
            };
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
            <div className="sidebar-avatar">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt="avatar"
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                />
              ) : initial}
            </div>
            <div className="sidebar-user-info">
              <div className="sidebar-user-email">{user?.email}</div>
            </div>
            <Icon name="logout" size={14} />
          </div>
        </div>
        {/* -- Poignée de redimensionnement -- */}
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

// -- App principale --
function AppContent() {
  const navigate = useNavigate();
  const [isAuth, setIsAuth] = useState(authService.isAuthenticated());
  const [activeView, setActiveView] = useState('dashboard');
  const [user, setUser] = useState(authService.getCurrentUser());
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
    setUser(null);
    setActiveView('files');
    navigate('/login', { replace: true });
  };

  const handleLogin = () => {
    setIsAuth(true);
    setUser(authService.getCurrentUser());
    setActiveView('dashboard');
    navigate('/', { replace: true });
  };

  const refreshUser = () => {
    setUser(authService.getCurrentUser());
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
      case 'settings': return <Settings theme={theme} toggleTheme={toggleTheme} user={user} onUserUpdated={refreshUser} />;
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
          user={user}
        >
          {renderView()}
        </AppLayout>
      } />
    </Routes>
  );
}

// -- Url avatar -- 
function getAvatarUrl(user) {
  if (!user?.id || !user?.avatar_path) return null;
  const version = encodeURIComponent(user.avatar_path);
  return `${API_BASE_URL}/api/users/avatar/${user.id}?v=${version}`;
}

export default function App() {
  return (
    <BrowserRouter>
      <ToastContainer />
      <AppContent />
    </BrowserRouter>
  );
}

export { Icon };