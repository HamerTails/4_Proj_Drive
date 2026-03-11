import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { authService } from '../services/api';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export default function Login({ onLogin }) {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    if (token) {
      localStorage.setItem('token', token);
      onLogin();
    }
  }, [onLogin]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await authService.login(email, password);
      onLogin();
    } catch (err) {
      setError(err.response?.data?.error || 'Identifiants incorrects');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        {/* Logo */}
        <div style={styles.logoWrap}>
          <div style={styles.logoIcon}>S</div>
          <span style={styles.logoText}>SUPFile</span>
        </div>

        <h1 style={styles.title}>Bon retour 👋</h1>
        <p style={styles.subtitle}>Connectez-vous à votre espace de stockage</p>

        {error && (
          <div style={styles.errorBox}>
            <span style={{ fontSize: 14 }}>⚠️</span> {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.formGroup}>
            <label style={styles.label}>Adresse email</label>
            <input
              style={styles.input}
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="vous@example.com"
              required
              disabled={loading}
              autoFocus
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Mot de passe</label>
            <input
              style={styles.input}
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              disabled={loading}
            />
          </div>

          <button type="submit" style={{ ...styles.btn, ...styles.btnPrimary }} disabled={loading}>
            {loading ? (
              <span style={styles.loadingDots}>Connexion<span className="dots">…</span></span>
            ) : 'Se connecter'}
          </button>
        </form>

        <div style={styles.divider}>
          <span style={styles.dividerLine} />
          <span style={styles.dividerText}>ou</span>
          <span style={styles.dividerLine} />
        </div>

        <button
          type="button"
          style={{ ...styles.btn, ...styles.btnGoogle }}
          onClick={() => { window.location.href = `${API_URL}/api/auth/google`; }}
          disabled={loading}
        >
          <svg width="16" height="16" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Continuer avec Google
        </button>

        <p style={styles.switchText}>
          Pas encore de compte ?{' '}
          <Link to="/register" style={styles.link}>S'inscrire</Link>
        </p>
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'var(--bg-secondary)',
    padding: '20px',
  },
  card: {
    background: 'var(--bg-primary)',
    border: '1px solid var(--border)',
    borderRadius: '16px',
    padding: '40px',
    width: '100%',
    maxWidth: '400px',
    boxShadow: 'var(--shadow-lg)',
  },
  logoWrap: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '28px',
  },
  logoIcon: {
    width: '32px',
    height: '32px',
    background: 'var(--accent)',
    borderRadius: '9px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'white',
    fontSize: '16px',
    fontWeight: '700',
  },
  logoText: {
    fontSize: '17px',
    fontWeight: '600',
    color: 'var(--text-primary)',
    letterSpacing: '-0.3px',
  },
  title: {
    fontSize: '22px',
    fontWeight: '700',
    color: 'var(--text-primary)',
    marginBottom: '6px',
    letterSpacing: '-0.4px',
  },
  subtitle: {
    fontSize: '13.5px',
    color: 'var(--text-secondary)',
    marginBottom: '28px',
  },
  errorBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    background: 'var(--danger-light)',
    color: 'var(--danger)',
    border: '1px solid var(--danger)',
    borderRadius: '8px',
    padding: '10px 14px',
    fontSize: '13px',
    marginBottom: '20px',
  },
  form: { display: 'flex', flexDirection: 'column', gap: '0px' },
  formGroup: { marginBottom: '16px' },
  label: {
    display: 'block',
    fontSize: '13px',
    fontWeight: '500',
    color: 'var(--text-secondary)',
    marginBottom: '6px',
  },
  input: {
    width: '100%',
    height: '38px',
    background: 'var(--bg-secondary)',
    border: '1px solid var(--border)',
    borderRadius: '8px',
    padding: '0 12px',
    fontSize: '13.5px',
    color: 'var(--text-primary)',
    fontFamily: 'inherit',
    outline: 'none',
    boxSizing: 'border-box',
    transition: 'border-color 150ms, box-shadow 150ms',
  },
  btn: {
    width: '100%',
    height: '40px',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '500',
    fontFamily: 'inherit',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    border: 'none',
    transition: 'all 150ms',
  },
  btnPrimary: {
    background: 'var(--accent)',
    color: 'white',
    marginBottom: '16px',
  },
  btnGoogle: {
    background: 'var(--bg-secondary)',
    color: 'var(--text-primary)',
    border: '1px solid var(--border)',
    marginBottom: '20px',
  },
  divider: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    margin: '4px 0 16px',
  },
  dividerLine: {
    flex: 1,
    height: '1px',
    background: 'var(--border)',
  },
  dividerText: {
    fontSize: '12px',
    color: 'var(--text-tertiary)',
  },
  switchText: {
    textAlign: 'center',
    fontSize: '13px',
    color: 'var(--text-secondary)',
    margin: 0,
  },
  link: {
    color: 'var(--accent-text)',
    textDecoration: 'none',
    fontWeight: '500',
  },
};
