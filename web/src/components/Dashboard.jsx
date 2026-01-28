import { useState, useEffect, useRef } from 'react';
import { authService, fileService } from '../services/api';

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
  
  const user = authService.getCurrentUser();

  useEffect(() => {
    loadNodes();
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

  const handleNodeClick = (node) => {
    if (node.type === 'folder') {
      setCurrentFolder(node.id);
    } else {
      window.open(fileService.downloadFile(node.id), '_blank');
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '-';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
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
          <input
            ref={fileInputRef}
            type="file"
            className="upload-input"
            onChange={handleFileUpload}
          />
        </div>

        {uploadProgress !== null && (
          <div className="upload-progress">
            Upload en cours: {uploadProgress}%
          </div>
        )}

        <div className="breadcrumb">
          <a href="#" onClick={(e) => { e.preventDefault(); setCurrentFolder(null); }}>
            Accueil
          </a>
          {path.map((item, index) => (
            <span key={item.id}>
              <span> / </span>
              {index === path.length - 1 ? (
                <span>{item.name}</span>
              ) : (
                <a href="#" onClick={(e) => { e.preventDefault(); setCurrentFolder(item.id); }}>
                  {item.name}
                </a>
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
                    {node.type === 'folder' ? '📁' : '📄'}
                  </div>
                  <div className="file-info" onClick={() => handleNodeClick(node)}>
                    <div className="file-name">{node.name}</div>
                    <div className="file-meta">
                      {node.type === 'file' && formatFileSize(node.size)}
                    </div>
                  </div>
                  <div className="file-actions">
                    <button onClick={() => { setShowRename(node.id); setRenameName(node.name); }}>
                      Renommer
                    </button>
                    <button className="danger" onClick={() => handleDelete(node.id, node.name)}>
                      Supprimer
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showNewFolder && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>Nouveau dossier</h3>
            <form onSubmit={handleCreateFolder}>
              <div className="form-group">
                <label>Nom du dossier</label>
                <input
                  type="text"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  autoFocus
                  required
                />
              </div>
              <div className="modal-actions">
                <button type="button" onClick={() => { setShowNewFolder(false); setNewFolderName(''); }}>
                  Annuler
                </button>
                <button type="submit" className="btn">Créer</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showRename && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>Renommer</h3>
            <form onSubmit={handleRename}>
              <div className="form-group">
                <label>Nouveau nom</label>
                <input
                  type="text"
                  value={renameName}
                  onChange={(e) => setRenameName(e.target.value)}
                  autoFocus
                  required
                />
              </div>
              <div className="modal-actions">
                <button type="button" onClick={() => { setShowRename(null); setRenameName(''); }}>
                  Annuler
                </button>
                <button type="submit" className="btn">Renommer</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Dashboard;
