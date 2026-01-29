import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';

function PublicView() {
  const { token } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [folder, setFolder] = useState(null);
  const [children, setChildren] = useState([]);
  const [previewFile, setPreviewFile] = useState(null);

  useEffect(() => {
    setLoading(true);
    setError('');
    fetch(`http://localhost:3000/api/public/${token}`)
      .then(async (res) => {
        if (res.headers.get('content-type')?.includes('application/json')) {
          const data = await res.json();
          if (data.folder) {
            setFolder(data.folder);
            setChildren(data.children);
          } else {
            setError(data.error || 'Erreur');
          }
        } else {
          // C'est un fichier direct (image/pdf ou autre)
          window.location.href = `http://localhost:3000/api/public/${token}`;
        }
      })
      .catch(() => setError('Erreur réseau'))
      .finally(() => setLoading(false));
  }, [token]);

  const handlePreview = (child) => {
    if (child.mime_type && (child.mime_type.startsWith('image/') || child.mime_type === 'application/pdf')) {
      // Ouvre directement l'image ou le PDF dans un nouvel onglet
      window.open(`http://localhost:3000/api/public/${token}?file=${child.id}`, '_blank');
    } else {
      window.open(`http://localhost:3000/api/public/${token}?file=${child.id}`, '_blank');
    }
  };

  if (loading) return <div className="container">Chargement...</div>;
  if (error) return <div className="container error">{error}</div>;
  return (
    <div className="container">
      <h2>Partage public : {folder?.name || 'Fichier'}</h2>
      {children.length === 0 ? (
        <div>Aucun fichier ou dossier partagé.</div>
      ) : (
        <div className="files-list">
          {children.map(child => (
            <div key={child.id} className="file-item">
              <div className="file-icon" onClick={() => handlePreview(child)}>
                {child.type === 'folder' ? '📁' : '📄'}
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
