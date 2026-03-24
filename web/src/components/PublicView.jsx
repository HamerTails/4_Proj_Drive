import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import folderIcon from '../../icone/folder.svg';
import otherIcon  from '../../icone/other.svg';

function PublicView() {
  const { token } = useParams();
  const publicBaseUrl = `${import.meta.env.VITE_API_URL || 'http://localhost:3000/api'}/shares/public`;

  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState('');
  const [folder,      setFolder]      = useState(null);
  const [children,    setChildren]    = useState([]);
  const [previewFile, setPreviewFile] = useState(null);
  const [password, setPassword]       = useState('');
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
          setError(data.error || `Erreur ${res.status}`);
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

  useEffect(() => {
    fetchShareData();
  }, [token]);

  const handlePasswordSubmit = (e) => {
    e.preventDefault();
    fetchShareData(password);
  };

  const handlePreview = (child) => {
    let url = `${publicBaseUrl}/${token}?file=${child.id}`;
    if (password) url += `&password=${encodeURIComponent(password)}`;
    window.open(url, '_blank');
  };

  if (loading) return <div className="container">Chargement...</div>;
  
  if (needsPassword) {
    return (
      <div className="container">
        <h2>Accès au partage</h2>
        <p>Ce partage est protégé par un mot de passe.</p>
        <form onSubmit={handlePasswordSubmit} style={{ maxWidth: '300px', margin: '20px auto' }}>
          <input
            type="password"
            placeholder="Mot de passe"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{
              width: '100%',
              padding: '10px',
              marginBottom: '10px',
              borderRadius: '4px',
              border: '1px solid var(--border)',
              background: 'var(--bg-secondary)',
              color: 'var(--text-primary)',
            }}
          />
          <button
            type="submit"
            style={{
              width: '100%',
              padding: '10px',
              borderRadius: '4px',
              border: 'none',
              background: 'var(--accent)',
              color: 'white',
              cursor: 'pointer',
            }}
          >
            Accéder au partage
          </button>
        </form>
      </div>
    );
  }

  if (error)   return <div className="container error">{error}</div>;

  return (
    <div className="container">
      <h2>Partage public : {folder?.name || 'Fichier'}</h2>

      {children.length === 0 ? (
        <div>Aucun fichier ou dossier partagé.</div>
      ) : (
        <div className="files-list">
          {children.map((child) => (
            <div key={child.id} className="file-item">
              <div className="file-icon" onClick={() => handlePreview(child)}>
                {child.type === 'folder' ? <img src={folderIcon} alt="dossier" /> : <img src={otherIcon} alt="fichier" />}
              </div>
              <div className="file-info" onClick={() => handlePreview(child)}>
                <div className="file-name">{child.name}</div>
                <div className="file-meta">{child.mime_type}</div>
              </div>
              <div className="file-actions">
                <button onClick={() => handlePreview(child)}>Ouvrir</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default PublicView;
