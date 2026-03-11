import { useState } from 'react';
import { Link } from 'react-router-dom';
import { authService } from '../services/api';

export default function Register({ onRegister }) {
  const [email, setEmail]                   = useState('');
  const [password, setPassword]             = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError]                   = useState('');
  const [loading, setLoading]               = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas');
      return;
    }
    if (password.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères');
      return;
    }

    setLoading(true);
    try {
      await authService.register(email, password);
      onRegister();
    } catch (err) {
      setError(err.response?.data?.error || "Erreur lors de l'inscription");
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

        <h1 style={styles.title}>Créer un compte</h1>
        <p style={styles.subtitle}>Rejoignez SUPFile et stockez vos fichiers en sécurité</p>

        {error && (
          <div style={styles.errorBox}>
            <span style={{ fontSize: 14 }}>⚠️</span> {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
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
              placeholder="Minimum 10 caractères"
              required
              disabled={loading}
              minLength={10}
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Confirmer le mot de passe</label>
            <input
              style={styles.input}
              type="password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              required
              disabled={loading}
              minLength={10}
            />
            {/* Indicateur correspondance */}
            {confirmPassword && (
              <div style={{ marginTop: 6, fontSize: 12, color: password === confirmPassword ? 'var(--success)' : 'var(--danger)' }}>
                {password === confirmPassword ? '✓ Les mots de passe correspondent' : '✗ Les mots de passe ne correspondent pas'}
              </div>
            )}
          </div>

          <button
            type="submit"
            style={{ ...styles.btn, ...styles.btnPrimary, opacity: loading ? 0.7 : 1 }}
            disabled={loading}
          >
            {loading ? 'Création du compte…' : "S'inscrire"}
          </button>
        </form>

        <p style={styles.switchText}>
          Déjà un compte ?{' '}
          <Link to="/login" style={styles.link}>Se connecter</Link>
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
    marginBottom: '20px',
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
