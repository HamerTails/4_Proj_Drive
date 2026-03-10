import { useState, useEffect, useRef } from 'react';
import { authService, fileService } from '../services/api';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// Types prévisualisables
const isImage     = (mime) => mime?.startsWith('image/');
const isPdf       = (mime) => mime === 'application/pdf';
const isText      = (mime, name) => mime?.startsWith('text/') || name?.endsWith('.md') || name?.endsWith('.csv');
const isAudio     = (mime) => mime?.startsWith('audio/');
const isVideo     = (mime) => mime?.startsWith('video/');
const isPreviewable = (node) => isImage(node.mime_type) || isPdf(node.mime_type) || isText(node.mime_type, node.name) || isAudio(node.mime_type) || isVideo(node.mime_type);

function Dashboard({ onLogout }) {
  const [nodes, setNodes] = useState([]);
  const [currentFolder, setCurrentFolder] = useState(null);
  const [path, setPath] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [showRename, setShowRename] = useState(null);
  const [renameName, setRenameName] = useState('');
  const [uploadProgress, setUploadProgress] = useState(null);
  const fileInputRef = useRef();
  const [previewFile, setPreviewFile] = useState(null);
  const [previewText, setPreviewText] = useState('');
  const [shareNode, setShareNode] = useState(null);
  const [shareLink, setShareLink] = useState('');
  const [shareLoading, setShareLoading] = useState(false);
  const [shareMode, setShareMode] = useState('public');
  const [internalShareEmail, setInternalShareEmail] = useState('');
  const [internalShareStatus, setInternalShareStatus] = useState('');
  const [sharedWithMe, setSharedWithMe] = useState([]);
  const [sharedWithMeLoading, setSharedWithMeLoading] = useState(false);
  
  const user = authService.getCurrentUser();

  useEffect(() => {
    loadNodes();
    loadSharedWithMe();
  }, [currentFolder]);

  const loadNodes = async () => {
    setLoading(true);
    try {
      const data = await fileService.getNodes(currentFolder);
      setNodes(data);
      if (currentFolder) {
        const pathData = await fileService.getPath(currentFolder);
        setPath(pathData);
      } else {
        setPath([]);
      }
    } catch (error) {
      console.error('Erreur chargement:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadSharedWithMe = async () => {
    setSharedWithMeLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_URL}/api/shares/internal`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSharedWithMe(res.data.shared || []);
    } catch (error) {
      console.error('Erreur chargement partages:', error);
      setSharedWithMe([]);
    } finally {
      setSharedWithMeLoading(false);
    }
  };

  const handleForgetShare = async (shareId) => {
    if (!confirm('Retirer ce fichier de votre espace partagé ?')) return;
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_URL}/api/shares/internal/${shareId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      loadSharedWithMe();
    } catch (error) {
      alert('Erreur: ' + (error.response?.data?.error || error.message));
    }
  };

  const handleLogout = () => {
    authService.logout();
    onLogout();
  };

  const handleCreateFolder = async (e) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;
    try {
      await fileService.createFolder(newFolderName, currentFolder);
      setNewFolderName('');
      setShowNewFolder(false);
      loadNodes();
    } catch (error) {
      alert('Erreur création dossier: ' + (error.response?.data?.error || error.message));
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      setUploadProgress(0);
      await fileService.uploadFile(file, currentFolder, (progress) => {
        setUploadProgress(progress);
      });
      setUploadProgress(null);
      loadNodes();
    } catch (error) {
      setUploadProgress(null);
      alert('Erreur upload: ' + (error.response?.data?.error || error.message));
    }
  };

  const handleRename = async (e) => {
    e.preventDefault();
    if (!renameName.trim() || !showRename) return;
    try {
      await fileService.renameNode(showRename, renameName);
      setShowRename(null);
      setRenameName('');
      loadNodes();
    } catch (error) {
      alert('Erreur renommage: ' + (error.response?.data?.error || error.message));
    }
  };

  const handleDelete = async (nodeId, nodeName) => {
    if (!confirm(`Supprimer "${nodeName}" ?`)) return;
    try {
      await fileService.deleteNode(nodeId);
      loadNodes();
    } catch (error) {
      alert('Erreur suppression: ' + (error.response?.data?.error || error.message));
    }
  };

  const handleShare = async (node) => {
    setShareNode(node);
    setShareLink('');
    setShareMode('public');
    setInternalShareEmail('');
    setInternalShareStatus('');
  };

  const generatePublicLink = async () => {
    setShareLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post(`${API_URL}/api/shares`, { node_id: shareNode.id }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const tokenPart = res.data.link.split('/').pop();
      setShareLink(`${window.location.origin}/public/${tokenPart}`);
    } catch (err) {
      setShareLink('Erreur lors de la génération du lien');
    } finally {
      setShareLoading(false);
    }
  };

  const handleInternalShare = async (e) => {
    e.preventDefault();
    setInternalShareStatus('Envoi...');
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API_URL}/api/shares/internal`, { node_id: shareNode.id, email: internalShareEmail }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setInternalShareStatus('Partagé avec succès !');
      setInternalShareEmail('');
    } catch (err) {
      setInternalShareStatus(err.response?.data?.error || 'Erreur');
    }
  };

  // Gestion du clic sur un fichier — preview selon le type
  const handleNodeClick = async (node) => {
    if (node.type === 'folder') {
      setCurrentFolder(node.id);
      return;
    }

    if (isText(node.mime_type, node.name)) {
      // Charger le contenu texte via fetch
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_URL}/api/files/${node.id}/preview?token=${token}`);
        const text = await res.text();
        setPreviewText(text);
        setPreviewFile(node);
      } catch {
        alert('Impossible de charger le fichier texte');
      }
      return;
    }

    if (isPreviewable(node)) {
      setPreviewText('');
      setPreviewFile(node);
      return;
    }

    // Autres types → téléchargement direct
    window.open(fileService.downloadFile(node.id), '_blank');
  };

  // Téléchargement dossier ZIP
  const handleDownloadFolder = (node, e) => {
    e.stopPropagation();
    window.open(fileService.downloadFolderUrl(node.id), '_blank');
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '-';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  // Icône selon le type MIME
  const getIcon = (node) => {
    if (node.type === 'folder') return '📁';
    if (isImage(node.mime_type)) return '🖼️';
    if (isPdf(node.mime_type)) return '📕';
    if (isAudio(node.mime_type)) return '🎵';
    if (isVideo(node.mime_type)) return '🎬';
    if (isText(node.mime_type, node.name)) return '📝';
    return '📄';
  };

  return (
    <div>
      <nav className="navbar">
        <div className="navbar-content">
          <h1>SUPFILE</h1>
          <div className="navbar-user">
            <span>{user?.email}</span>
            <button onClick={handleLogout}>Déconnexion</button>
          </div>
        </div>
      </nav>

      <div className="container">
        <div className="toolbar">
          <button onClick={() => setShowNewFolder(true)}>Nouveau dossier</button>
          <button onClick={() => fileInputRef.current?.click()}>Upload fichier</button>
          <input ref={fileInputRef} type="file" className="upload-input" onChange={handleFileUpload} />
        </div>

        {uploadProgress !== null && (
          <div className="upload-progress">Upload en cours: {uploadProgress}%</div>
        )}

        <div className="breadcrumb">
          <a href="#" onClick={(e) => { e.preventDefault(); setCurrentFolder(null); }}>Accueil</a>
          {path.map((item, index) => (
            <span key={item.id}>
              <span> / </span>
              {index === path.length - 1 ? (
                <span>{item.name}</span>
              ) : (
                <a href="#" onClick={(e) => { e.preventDefault(); setCurrentFolder(item.id); }}>{item.name}</a>
              )}
            </span>
          ))}
        </div>

        <div className="files-container">
          {loading ? (
            <div className="empty-state">Chargement...</div>
          ) : nodes.length === 0 ? (
            <div className="empty-state">Aucun fichier ou dossier</div>
          ) : (
            <div className="files-list">
              {nodes.map((node) => (
                <div key={node.id} className="file-item">
                  <div className="file-icon" onClick={() => handleNodeClick(node)}>
                    {getIcon(node)}
                  </div>
                  <div className="file-info" onClick={() => handleNodeClick(node)}>
                    <div className="file-name">{node.name}</div>
                    <div className="file-meta">
                      {node.type === 'file' ? formatFileSize(node.size) : 'Dossier'}
                    </div>
                  </div>
                  <div className="file-actions">
                    {/* Bouton télécharger ZIP pour les dossiers */}
                    {node.type === 'folder' && (
                      <button onClick={(e) => handleDownloadFolder(node, e)}>
                        ⬇️ ZIP
                      </button>
                    )}
                    {/* Bouton télécharger pour les fichiers */}
                    {node.type === 'file' && (
                      <a href={fileService.downloadFile(node.id)} download style={{ textDecoration: 'none' }}>
                        <button>⬇️</button>
                      </a>
                    )}
                    <button onClick={() => { setShowRename(node.id); setRenameName(node.name); }}>Renommer</button>
                    <button className="danger" onClick={() => handleDelete(node.id, node.name)}>Supprimer</button>
                    <button onClick={() => handleShare(node)}>Partager</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Section Partagés avec moi */}
        <div style={{ marginTop: 40, paddingTop: 30, borderTop: '2px solid #ccc' }}>
          <h2 style={{ marginBottom: 20 }}>📥 Partagés avec moi</h2>
          {sharedWithMeLoading ? (
            <div className="empty-state">Chargement...</div>
          ) : sharedWithMe.length === 0 ? (
            <div className="empty-state">Aucun fichier partagé avec vous</div>
          ) : (
            <div className="files-list">
              {sharedWithMe.map((item) => (
                <div key={item.share_id} className="file-item">
                  <div className="file-icon" onClick={() => handleNodeClick(item)}>{getIcon(item)}</div>
                  <div className="file-info" onClick={() => handleNodeClick(item)}>
                    <div className="file-name">{item.name}</div>
                    <div className="file-meta">
                      Partagé par {item.owner_email} • {item.type === 'file' && formatFileSize(item.size)}
                    </div>
                  </div>
                  <div className="file-actions">
                    <button onClick={() => handleForgetShare(item.share_id)}>Oublier</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal nouveau dossier */}
      {showNewFolder && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>Nouveau dossier</h3>
            <form onSubmit={handleCreateFolder}>
              <div className="form-group">
                <label>Nom du dossier</label>
                <input type="text" value={newFolderName} onChange={(e) => setNewFolderName(e.target.value)} autoFocus required />
              </div>
              <div className="modal-actions">
                <button type="button" onClick={() => { setShowNewFolder(false); setNewFolderName(''); }}>Annuler</button>
                <button type="submit" className="btn">Créer</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal renommage */}
      {showRename && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>Renommer</h3>
            <form onSubmit={handleRename}>
              <div className="form-group">
                <label>Nouveau nom</label>
                <input type="text" value={renameName} onChange={(e) => setRenameName(e.target.value)} autoFocus required />
              </div>
              <div className="modal-actions">
                <button type="button" onClick={() => { setShowRename(null); setRenameName(''); }}>Annuler</button>
                <button type="submit" className="btn">Renommer</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal prévisualisation — tous types */}
      {previewFile && (
        <div className="modal-overlay" onClick={() => { setPreviewFile(null); setPreviewText(''); }}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '90vw', maxHeight: '90vh', overflow: 'auto' }}>
            <h3>Prévisualisation : {previewFile.name}</h3>

            {/* Image */}
            {isImage(previewFile.mime_type) && (
              <img
                src={`${API_URL}/api/files/${previewFile.id}/preview?token=${localStorage.getItem('token')}`}
                alt={previewFile.name}
                style={{ maxWidth: '100%', maxHeight: '70vh' }}
              />
            )}

            {/* PDF */}
            {isPdf(previewFile.mime_type) && (
              <iframe
                src={`${API_URL}/api/files/${previewFile.id}/preview?token=${localStorage.getItem('token')}`}
                title={previewFile.name}
                style={{ width: '80vw', height: '70vh', border: 'none' }}
              />
            )}

            {/* Texte / Markdown / CSV */}
            {isText(previewFile.mime_type, previewFile.name) && (
              <pre style={{
                background: '#f5f5f5',
                padding: 16,
                borderRadius: 8,
                maxHeight: '65vh',
                overflow: 'auto',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                fontSize: 13,
                textAlign: 'left'
              }}>
                {previewText || 'Chargement...'}
              </pre>
            )}

            {/* Audio */}
            {isAudio(previewFile.mime_type) && (
              <audio
                controls
                autoPlay
                style={{ width: '100%', marginTop: 20 }}
                src={`${API_URL}/api/files/${previewFile.id}/stream?token=${localStorage.getItem('token')}`}
              />
            )}

            {/* Vidéo */}
            {isVideo(previewFile.mime_type) && (
              <video
                controls
                autoPlay
                style={{ maxWidth: '100%', maxHeight: '65vh', marginTop: 10 }}
                src={`${API_URL}/api/files/${previewFile.id}/stream?token=${localStorage.getItem('token')}`}
              />
            )}

            <div className="modal-actions" style={{ marginTop: 16 }}>
              <a href={fileService.downloadFile(previewFile.id)} download>
                <button>⬇️ Télécharger</button>
              </a>
              <button onClick={() => { setPreviewFile(null); setPreviewText(''); }}>Fermer</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal partage */}
      {shareNode && (
        <div className="modal-overlay" onClick={() => { setShareNode(null); setShareLink(''); setInternalShareEmail(''); setInternalShareStatus(''); }}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 500 }}>
            <h3>Partager : {shareNode.name}</h3>
            <div style={{ display: 'flex', gap: 10, marginBottom: 20, borderBottom: '1px solid #ccc' }}>
              <button onClick={() => setShareMode('public')} style={{ padding: '10px 20px', background: shareMode === 'public' ? '#000' : 'transparent', color: shareMode === 'public' ? '#fff' : '#000', border: 'none', cursor: 'pointer' }}>
                Public
              </button>
              <button onClick={() => setShareMode('private')} style={{ padding: '10px 20px', background: shareMode === 'private' ? '#000' : 'transparent', color: shareMode === 'private' ? '#fff' : '#000', border: 'none', cursor: 'pointer' }}>
                Privé
              </button>
            </div>

            {shareMode === 'public' ? (
              <div>
                <p style={{ marginBottom: 15, color: '#666' }}>Générer un lien public accessible sans compte.</p>
                {shareLoading ? <div>Génération du lien...</div>
                  : shareLink ? (
                    <div>
                      <input type="text" value={shareLink} readOnly style={{ width: '100%', padding: 8, marginBottom: 10 }} onFocus={e => e.target.select()} />
                      <a href={shareLink} target="_blank" rel="noopener noreferrer" style={{ color: '#00f', textDecoration: 'underline' }}>Ouvrir le lien</a>
                    </div>
                  ) : <button onClick={generatePublicLink} className="btn">Générer le lien</button>
                }
              </div>
            ) : (
              <div>
                <p style={{ marginBottom: 15, color: '#666' }}>Partager avec un utilisateur inscrit par email.</p>
                <form onSubmit={handleInternalShare}>
                  <div className="form-group">
                    <label>Email de l'utilisateur</label>
                    <input type="email" value={internalShareEmail} onChange={e => setInternalShareEmail(e.target.value)} placeholder="utilisateur@example.com" required autoFocus />
                  </div>
                  {internalShareStatus && (
                    <div style={{ marginBottom: 10, color: internalShareStatus.includes('succès') ? 'green' : 'red' }}>
                      {internalShareStatus}
                    </div>
                  )}
                  <button type="submit" className="btn">Partager</button>
                </form>
              </div>
            )}

            <div className="modal-actions" style={{ marginTop: 20 }}>
              <button onClick={() => { setShareNode(null); setShareLink(''); setInternalShareEmail(''); setInternalShareStatus(''); }}>Fermer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Dashboard;
