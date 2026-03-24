import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { authService } from '../services/api';

import googleLogo from '../../icone/google.svg';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export default function Login({ onLogin }) {
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token  = params.get('token');
    const error  = params.get('error');

    // Nettoyer l'URL immédiatement pour éviter la reconnexion au rechargement
    if (token || error) {
      window.history.replaceState({}, '', '/login');
    }

    if (token) {
      localStorage.setItem('token', token);
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        localStorage.setItem('user', JSON.stringify({
          id:       payload.id,
          email:    payload.email,
          provider: payload.provider || null,
        }));
      } catch {}
      onLogin();
    }

    if (error) {
      setError('Connexion Google échouée, réessayez.');
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
              onChange={(e) => setEmail(e.target.value)}
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
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              disabled={loading}
            />
          </div>

          <button
            type="submit"
            style={{ ...styles.btn, ...styles.btnPrimary }}
            disabled={loading}
          >
            {loading ? (
              <span style={styles.loadingDots}>
                Connexion<span className="dots">…</span>
              </span>
            ) : (
              'Se connecter'
            )}
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
          onClick={() => {
            window.location.href = `${API_URL}/api/auth/google`;
          }}
          disabled={loading}
        >
          <img src={googleLogo} width="16" height="16" alt="Google" />
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
    minHeight:      '100vh',
    display:        'flex',
    alignItems:     'center',
    justifyContent: 'center',
    background:     'var(--bg-secondary)',
    padding:        '20px',
  },
  card: {
    background:   'var(--bg-primary)',
    border:       '1px solid var(--border)',
    borderRadius: '16px',
    padding:      '40px',
    width:        '100%',
    maxWidth:     '400px',
    boxShadow:    'var(--shadow-lg)',
  },
  logoWrap: {
    display:     'flex',
    alignItems:  'center',
    gap:         '10px',
    marginBottom: '28px',
  },
  logoIcon: {
    width:          '32px',
    height:         '32px',
    background:     'var(--accent)',
    borderRadius:   '9px',
    display:        'flex',
    alignItems:     'center',
    justifyContent: 'center',
    color:          'white',
    fontSize:       '16px',
    fontWeight:     '700',
  },
  logoText: {
    fontSize:      '17px',
    fontWeight:    '600',
    color:         'var(--text-primary)',
    letterSpacing: '-0.3px',
  },
  title: {
    fontSize:      '22px',
    fontWeight:    '700',
    color:         'var(--text-primary)',
    marginBottom:  '6px',
    letterSpacing: '-0.4px',
  },
  subtitle: {
    fontSize:    '13.5px',
    color:       'var(--text-secondary)',
    marginBottom: '28px',
  },
  errorBox: {
    display:      'flex',
    alignItems:   'center',
    gap:          '8px',
    background:   'var(--danger-light)',
    color:        'var(--danger)',
    border:       '1px solid var(--danger)',
    borderRadius: '8px',
    padding:      '10px 14px',
    fontSize:     '13px',
    marginBottom: '20px',
  },
  form:      { display: 'flex', flexDirection: 'column', gap: '0px' },
  formGroup: { marginBottom: '16px' },
  label: {
    display:      'block',
    fontSize:     '13px',
    fontWeight:   '500',
    color:        'var(--text-secondary)',
    marginBottom: '6px',
  },
  input: {
    width:        '100%',
    height:       '38px',
    background:   'var(--bg-secondary)',
    border:       '1px solid var(--border)',
    borderRadius: '8px',
    padding:      '0 12px',
    fontSize:     '13.5px',
    color:        'var(--text-primary)',
    fontFamily:   'inherit',
    outline:      'none',
    boxSizing:    'border-box',
    transition:   'border-color 150ms, box-shadow 150ms',
  },
  btn: {
    width:          '100%',
    height:         '40px',
    borderRadius:   '8px',
    fontSize:       '14px',
    fontWeight:     '500',
    fontFamily:     'inherit',
    cursor:         'pointer',
    display:        'flex',
    alignItems:     'center',
    justifyContent: 'center',
    gap:            '8px',
    border:         'none',
    transition:     'all 150ms',
  },
  btnPrimary: {
    background:   'var(--accent)',
    color:        'white',
    marginBottom: '16px',
  },
  btnGoogle: {
    background:   'var(--bg-secondary)',
    color:        'var(--text-primary)',
    border:       '1px solid var(--border)',
    marginBottom: '20px',
  },
  divider: {
    display:    'flex',
    alignItems: 'center',
    gap:        '12px',
    margin:     '4px 0 16px',
  },
  dividerLine: {
    flex:       1,
    height:     '1px',
    background: 'var(--border)',
  },
  dividerText: {
    fontSize: '12px',
    color:    'var(--text-tertiary)',
  },
  switchText: {
    textAlign: 'center',
    fontSize:  '13px',
    color:     'var(--text-secondary)',
    margin:    0,
  },
  link: {
    color:          'var(--accent-text)',
    textDecoration: 'none',
    fontWeight:     '500',
  },
};
