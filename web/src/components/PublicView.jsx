import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import logoIcon   from '../../icone/logo.svg';
import folderIcon from '../../icone/folder.svg';
import pdfIcon    from '../../icone/pdf.svg';
import imageIcon  from '../../icone/image.svg';
import videoIcon  from '../../icone/video.svg';
import audioIcon  from '../../icone/audio.svg';
import textIcon   from '../../icone/text.svg';
import otherIcon  from '../../icone/other.svg';

function iconFor(child) {
  if (child.type === 'folder') return folderIcon;
  const m = child.mime_type || '';
  if (m.startsWith('image/'))  return imageIcon;
  if (m.startsWith('video/'))  return videoIcon;
  if (m.startsWith('audio/'))  return audioIcon;
  if (m === 'application/pdf') return pdfIcon;
  if (m.startsWith('text/'))   return textIcon;
  return otherIcon;
}

function fmtSize(b) {
  const n = Number(b);
  if (!n || n < 0) return '—';
  if (n < 1024)       return n + ' o';
  if (n < 1024 ** 2)  return (n / 1024).toFixed(1) + ' Ko';
  if (n < 1024 ** 3)  return (n / 1024 ** 2).toFixed(2) + ' Mo';
  return (n / 1024 ** 3).toFixed(2) + ' Go';
}

function prettyMime(m) {
  if (!m) return '';
  if (m === 'application/pdf') return 'PDF';
  if (m.startsWith('image/'))  return 'Image ' + m.split('/')[1].toUpperCase();
  if (m.startsWith('video/'))  return 'Vidéo ' + m.split('/')[1].toUpperCase();
  if (m.startsWith('audio/'))  return 'Audio ' + m.split('/')[1].toUpperCase();
  if (m === 'text/plain')      return 'Texte';
  if (m === 'text/csv')        return 'CSV';
  if (m === 'text/markdown')   return 'Markdown';
  if (m.startsWith('text/'))   return 'Texte';
  return m;
}

function PublicView() {
  const { token } = useParams();
  const publicBaseUrl = `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/shares/public`;

  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState('');
  const [folder,        setFolder]        = useState(null);
  const [children,      setChildren]      = useState([]);
  const [password,      setPassword]      = useState('');
  const [needsPassword, setNeedsPassword] = useState(false);

  const fetchShareData = (pwd = '') => {
    setLoading(true);
    setError('');

    let url = `${publicBaseUrl}/${token}`;
    if (pwd) url += `?password=${encodeURIComponent(pwd)}`;

    fetch(url)
      .then(async (res) => {
        const contentType = res.headers.get('content-type');

        if (!res.ok) {
          const data = contentType?.includes('application/json') ? await res.json() : {};
          if (res.status === 403 && data.error?.includes('Mot de passe')) {
            setNeedsPassword(true);
            setError('');
            return;
          }
          setError(data.error || 'Erreur ' + res.status);
          return;
        }

        if (contentType?.includes('application/json')) {
          const data = await res.json();
          if (data.folder) {
            setFolder(data.folder);
            setChildren(data.children);
            setNeedsPassword(false);
          } else {
            setError(data.error || 'Erreur');
          }
        } else {
          window.location.href = url;
        }
      })
      .catch(() => setError('Erreur réseau'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchShareData(); }, [token]);

  const handlePasswordSubmit = (e) => {
    e.preventDefault();
    fetchShareData(password);
  };

  const handleOpen = (child) => {
    let url = `${publicBaseUrl}/${token}?file=${child.id}`;
    if (password) url += '&password=' + encodeURIComponent(password);
    window.open(url, '_blank');
  };

  // -- Layouts --

  const Header = () => (
    <header style={{
      background:     'var(--bg-primary)',
      borderBottom:   '1px solid var(--border)',
      padding:        '14px 24px',
      display:        'flex',
      alignItems:     'center',
      justifyContent: 'space-between',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <img src={logoIcon} alt="SUPFile" style={{ width: 28, height: 28 }} />
        <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>
          SUPFile
        </span>
        <span style={{
          marginLeft: 8, padding: '2px 8px', borderRadius: 99,
          background: 'var(--accent-light)', color: 'var(--accent-text)',
          fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px',
        }}>
          Partage public
        </span>
      </div>
      <a href="/" style={{
        fontSize: 13, color: 'var(--accent-text)', textDecoration: 'none', fontWeight: 500,
      }}>
        Créer un compte →
      </a>
    </header>
  );

  // -- États de rendu --

  if (loading) {
    return (
      <div style={pageStyle}>
        <Header />
        <div style={centerBoxStyle}>
          <div style={{ color: 'var(--text-tertiary)', fontSize: 14 }}>Chargement…</div>
        </div>
      </div>
    );
  }

  if (needsPassword) {
    return (
      <div style={pageStyle}>
        <Header />
        <div style={centerBoxStyle}>
          <div style={cardStyle}>
            <div style={{ fontSize: 48, marginBottom: 8, textAlign: 'center' }}>🔒</div>
            <h2 style={titleStyle}>Partage protégé</h2>
            <p style={{ fontSize: 14, color: 'var(--text-secondary)', textAlign: 'center', marginBottom: 24 }}>
              Le propriétaire a protégé ce partage par un mot de passe.
            </p>
            <form onSubmit={handlePasswordSubmit}>
              <input
                type="password"
                placeholder="Saisissez le mot de passe"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoFocus
                autoComplete="off"
                style={inputStyle}
              />
              <button type="submit" style={primaryButtonStyle}>
                Accéder au partage
              </button>
            </form>
            {error && (
              <div style={errorBoxStyle}>{error}</div>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={pageStyle}>
        <Header />
        <div style={centerBoxStyle}>
          <div style={cardStyle}>
            <div style={{ fontSize: 48, marginBottom: 8, textAlign: 'center' }}>⚠️</div>
            <h2 style={titleStyle}>Partage indisponible</h2>
            <p style={{ fontSize: 14, color: 'var(--text-secondary)', textAlign: 'center', marginBottom: 24 }}>
              {error}
            </p>
            <a href="/" style={{ ...primaryButtonStyle, textDecoration: 'none', display: 'block', textAlign: 'center' }}>
              Retour à l'accueil
            </a>
          </div>
        </div>
      </div>
    );
  }

  // -- Vue principale : liste / fichier unique --

  const isSingleFile = children.length === 1 && children[0].id === folder.id;
  const child = isSingleFile ? children[0] : null;

  return (
    <div style={pageStyle}>
      <Header />

      <main style={{ maxWidth: 900, margin: '40px auto', padding: '0 24px' }}>
        <div style={{
          background:     'var(--bg-primary)',
          border:         '1px solid var(--border)',
          borderRadius:   12,
          padding:        24,
          boxShadow:      '0 1px 3px rgba(0,0,0,0.04)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 6 }}>
            <img src={iconFor(folder)} alt="" style={{ width: 40, height: 40 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <h1 style={{
                fontSize: 20, fontWeight: 700, color: 'var(--text-primary)',
                margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}>
                {folder?.name || 'Fichier partagé'}
              </h1>
              <div style={{ fontSize: 13, color: 'var(--text-tertiary)', marginTop: 4 }}>
                {folder?.type === 'folder'
                  ? children.length + ' élément' + (children.length > 1 ? 's' : '')
                  : prettyMime(child?.mime_type) + (child?.size ? ' · ' + fmtSize(child.size) : '')}
              </div>
            </div>
          </div>
        </div>

        {/* Liste / élément */}
        {children.length === 0 ? (
          <div style={{ ...cardStyle, marginTop: 16, textAlign: 'center' }}>
            <div style={{ fontSize: 40, opacity: 0.3, marginBottom: 8 }}>📁</div>
            <div style={{ color: 'var(--text-tertiary)', fontSize: 14 }}>
              Aucun fichier dans ce partage.
            </div>
          </div>
        ) : (
          <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {children.map((c) => (
              <div
                key={c.id}
                style={{
                  display:      'flex',
                  alignItems:   'center',
                  gap:          14,
                  padding:      '14px 18px',
                  background:   'var(--bg-primary)',
                  border:       '1px solid var(--border)',
                  borderRadius: 10,
                  transition:   'background 120ms, border-color 120ms',
                  cursor:       'pointer',
                }}
                onClick={() => handleOpen(c)}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'var(--bg-secondary)';
                  e.currentTarget.style.borderColor = 'var(--accent)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'var(--bg-primary)';
                  e.currentTarget.style.borderColor = 'var(--border)';
                }}
              >
                <img src={iconFor(c)} alt="" style={{ width: 32, height: 32, flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: 14.5, fontWeight: 600, color: 'var(--text-primary)',
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  }}>
                    {c.name}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 2 }}>
                    {prettyMime(c.mime_type)}
                    {c.size ? ' · ' + fmtSize(c.size) : ''}
                  </div>
                </div>
                <button
                  type="button"
                  style={{
                    padding:      '8px 14px',
                    background:   'var(--accent)',
                    color:        '#fff',
                    border:       'none',
                    borderRadius: 8,
                    fontSize:     13,
                    fontWeight:   600,
                    cursor:       'pointer',
                    flexShrink:   0,
                  }}
                  onClick={(e) => { e.stopPropagation(); handleOpen(c); }}
                >
                  Ouvrir
                </button>
              </div>
            ))}
          </div>
        )}

        <div style={{ marginTop: 28, textAlign: 'center', fontSize: 12, color: 'var(--text-tertiary)' }}>
          Partage généré via <strong>SUPFile</strong> — votre plateforme de stockage cloud
        </div>
      </main>
    </div>
  );
}

// -- Styles partagés --

const pageStyle = {
  minHeight:  '100vh',
  background: 'var(--bg-secondary)',
};

const centerBoxStyle = {
  display:        'flex',
  alignItems:     'center',
  justifyContent: 'center',
  minHeight:      'calc(100vh - 60px)',
  padding:        '40px 20px',
};

const cardStyle = {
  width:        '100%',
  maxWidth:     400,
  background:   'var(--bg-primary)',
  border:       '1px solid var(--border)',
  borderRadius: 14,
  padding:      32,
  boxShadow:    '0 4px 16px rgba(0,0,0,0.06)',
};

const titleStyle = {
  fontSize:    20,
  fontWeight:  700,
  color:       'var(--text-primary)',
  textAlign:   'center',
  margin:      '0 0 8px',
};

const inputStyle = {
  width:        '100%',
  boxSizing:    'border-box',
  padding:      '12px 14px',
  borderRadius: 8,
  border:       '1px solid var(--border)',
  background:   'var(--bg-secondary)',
  color:        'var(--text-primary)',
  fontSize:     14,
  marginBottom: 12,
  fontFamily:   'inherit',
};

const primaryButtonStyle = {
  width:        '100%',
  padding:      '12px',
  background:   'var(--accent)',
  color:        '#fff',
  border:       'none',
  borderRadius: 8,
  fontSize:     14,
  fontWeight:   600,
  cursor:       'pointer',
  transition:   'background 150ms',
};

const errorBoxStyle = {
  marginTop:    14,
  padding:      '10px 14px',
  background:   'var(--danger-light)',
  color:        'var(--danger)',
  borderRadius: 8,
  fontSize:     13,
  textAlign:    'center',
};

export default PublicView;
