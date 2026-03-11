import { useState, useEffect, useRef } from 'react';
import { fileService } from '../services/api';
import { Icon } from '../App';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const isImage = (m) => m?.startsWith('image/');
const isPdf   = (m) => m === 'application/pdf';
const isText  = (m, n) => m?.startsWith('text/') || n?.endsWith('.md') || n?.endsWith('.csv');
const isAudio = (m) => m?.startsWith('audio/');
const isVideo = (m) => m?.startsWith('video/');

const getFileCategory = (node) => {
  if (node.type === 'folder')       return 'folder';
  if (isImage(node.mime_type))      return 'image';
  if (isPdf(node.mime_type))        return 'pdf';
  if (isAudio(node.mime_type))      return 'audio';
  if (isVideo(node.mime_type))      return 'video';
  if (isText(node.mime_type, node.name)) return 'text';
  return 'other';
};

const FILE_EMOJIS = { folder: '📁', image: '🖼️', pdf: '📕', audio: '🎵', video: '🎬', text: '📝', other: '📄' };

const formatSize = (bytes) => {
  if (!bytes) return '—';
  if (bytes < 1024)        return bytes + ' o';
  if (bytes < 1024 ** 2)  return (bytes / 1024).toFixed(1) + ' Ko';
  if (bytes < 1024 ** 3)  return (bytes / 1024 ** 2).toFixed(1) + ' Mo';
  return (bytes / 1024 ** 3).toFixed(2) + ' Go';
};

const formatDate = (iso) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
};

// ─── Composant principal ───────────────────────────────────────
export default function Dashboard({ sharedOnly = false }) {
  const [nodes, setNodes]           = useState([]);
  const [currentFolder, setCurrentFolder] = useState(null);
  const [breadcrumb, setBreadcrumb] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [uploadProgress, setUploadProgress] = useState(null);
  const [dragging, setDragging]     = useState(false);
  const [search, setSearch]         = useState('');
  const [searchResults, setSearchResults] = useState(null);

  // Modals
  const [previewFile, setPreviewFile]   = useState(null);
  const [previewText, setPreviewText]   = useState('');
  const [shareNode, setShareNode]       = useState(null);
  const [renameNode, setRenameNode]     = useState(null);
  const [renameName, setRenameName]     = useState('');
  const [newFolderOpen, setNewFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [shareLink, setShareLink]       = useState('');
  const [shareMode, setShareMode]       = useState('public');
  const [shareEmail, setShareEmail]     = useState('');
  const [shareStatus, setShareStatus]   = useState('');
  const [shareLoading, setShareLoading] = useState(false);

  // Shared with me
  const [sharedWithMe, setSharedWithMe] = useState([]);

  const fileInputRef = useRef();

  useEffect(() => {
    if (sharedOnly) { loadSharedWithMe(); return; }
    loadNodes();
  }, [currentFolder, sharedOnly]);

  // Recherche avec debounce
  useEffect(() => {
    if (!search.trim()) { setSearchResults(null); return; }
    const timer = setTimeout(() => runSearch(search), 350);
    return () => clearTimeout(timer);
  }, [search]);

  const loadNodes = async () => {
    setLoading(true);
    try {
      const data = await fileService.getNodes(currentFolder);
      setNodes(data);
      if (currentFolder) {
        const p = await fileService.getPath(currentFolder);
        setBreadcrumb(p);
      } else {
        setBreadcrumb([]);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const loadSharedWithMe = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_URL}/api/shares/internal`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSharedWithMe(res.data.shared || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const runSearch = async (q) => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_URL}/api/search?q=${encodeURIComponent(q)}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSearchResults(res.data.results || []);
    } catch { setSearchResults([]); }
  };

  // Upload
  const handleUpload = async (files) => {
    if (!files?.length) return;
    try {
      setUploadProgress(0);
      for (const file of files) {
        await fileService.uploadFile(file, currentFolder, (p) => setUploadProgress(p));
      }
      setUploadProgress(null);
      loadNodes();
    } catch (e) {
      setUploadProgress(null);
      alert('Erreur upload : ' + (e.response?.data?.error || e.message));
    }
  };

  // Drag & drop upload
  const onDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    handleUpload([...e.dataTransfer.files]);
  };

  // Clic sur un node
  const handleNodeClick = async (node) => {
    if (node.type === 'folder') { setCurrentFolder(node.id); return; }

    if (isText(node.mime_type, node.name)) {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/files/${node.id}/preview?token=${token}`);
      setPreviewText(await res.text());
      setPreviewFile(node);
      return;
    }
    if (isImage(node.mime_type) || isPdf(node.mime_type) || isAudio(node.mime_type) || isVideo(node.mime_type)) {
      setPreviewText('');
      setPreviewFile(node);
      return;
    }
    window.open(fileService.downloadFile(node.id), '_blank');
  };

  // Créer dossier
  const handleCreateFolder = async (e) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;
    try {
      await fileService.createFolder(newFolderName, currentFolder);
      setNewFolderName(''); setNewFolderOpen(false); loadNodes();
    } catch (e) { alert('Erreur : ' + (e.response?.data?.error || e.message)); }
  };

  // Renommer
  const handleRename = async (e) => {
    e.preventDefault();
    if (!renameName.trim() || !renameNode) return;
    try {
      await fileService.renameNode(renameNode.id, renameName);
      setRenameNode(null); setRenameName(''); loadNodes();
    } catch (e) { alert('Erreur : ' + (e.response?.data?.error || e.message)); }
  };

  // Supprimer
  const handleDelete = async (node) => {
    if (!confirm(`Déplacer "${node.name}" vers la corbeille ?`)) return;
    try { await fileService.deleteNode(node.id); loadNodes(); }
    catch (e) { alert('Erreur : ' + (e.response?.data?.error || e.message)); }
  };

  // Générer lien public
  const generateLink = async () => {
    setShareLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post(`${API_URL}/api/shares`, { node_id: shareNode.id }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const t = res.data.link.split('/').pop();
      setShareLink(`${window.location.origin}/public/${t}`);
    } catch { setShareLink('Erreur génération lien'); }
    finally { setShareLoading(false); }
  };

  // Partage interne
  const handleInternalShare = async (e) => {
    e.preventDefault();
    setShareStatus('Envoi...');
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API_URL}/api/shares/internal`, { node_id: shareNode.id, email: shareEmail }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setShareStatus('✓ Partagé avec succès !');
      setShareEmail('');
    } catch (e) { setShareStatus(e.response?.data?.error || 'Erreur'); }
  };

  const displayNodes = searchResults ?? (sharedOnly ? sharedWithMe : nodes);
  const token = localStorage.getItem('token');

  return (
    <div
      className={`drop-zone${dragging ? ' dragging' : ''}`}
      style={{ display: 'flex', flexDirection: 'column', height: '100%' }}
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
    >
      {/* TOPBAR */}
      <div className="topbar">
        <span className="topbar-title">{sharedOnly ? 'Partagés avec moi' : 'Mes fichiers'}</span>

        {!sharedOnly && (
          <div className="search-bar">
            <span className="search-bar-icon">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            </span>
            <input
              type="text"
              placeholder="Rechercher des fichiers..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        )}

        {!sharedOnly && (
          <div className="topbar-actions">
            <button className="btn btn-secondary" onClick={() => setNewFolderOpen(true)}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/><line x1="12" y1="11" x2="12" y2="17"/><line x1="9" y1="14" x2="15" y2="14"/></svg>
              Nouveau dossier
            </button>
            <button className="btn btn-primary" onClick={() => fileInputRef.current?.click()}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.39 18.39A5 5 0 0018 9h-1.26A8 8 0 103 16.3"/></svg>
              Uploader
            </button>
            <input ref={fileInputRef} type="file" multiple className="upload-input"
              onChange={(e) => handleUpload([...e.target.files])} />
          </div>
        )}
      </div>

      {/* PAGE */}
      <div className="page-content">
        {/* Breadcrumb */}
        {!sharedOnly && (
          <div className="breadcrumb">
            <button className="breadcrumb-item" onClick={() => setCurrentFolder(null)}>Accueil</button>
            {breadcrumb.map((item, i) => (
              <span key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span className="breadcrumb-sep">/</span>
                <button
                  className={`breadcrumb-item ${i === breadcrumb.length - 1 ? 'current' : ''}`}
                  onClick={() => i < breadcrumb.length - 1 && setCurrentFolder(item.id)}
                >
                  {item.name}
                </button>
              </span>
            ))}
          </div>
        )}

        {/* Résultats recherche */}
        {searchResults !== null && (
          <div style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="badge badge-blue">{searchResults.length} résultat{searchResults.length !== 1 ? 's' : ''}</span>
            <button className="btn-ghost btn" style={{ height: 26, fontSize: 12 }} onClick={() => { setSearch(''); setSearchResults(null); }}>
              Effacer
            </button>
          </div>
        )}

        {/* Table fichiers */}
        {loading ? (
          <div className="empty-state">
            <div style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>Chargement…</div>
          </div>
        ) : displayNodes.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">{sharedOnly ? '📥' : '📂'}</div>
            <div className="empty-state-title">{sharedOnly ? 'Aucun partage' : 'Dossier vide'}</div>
            <div className="empty-state-desc">
              {sharedOnly ? 'Personne ne vous a partagé de fichier.' : 'Glissez des fichiers ici ou cliquez sur "Uploader".'}
            </div>
          </div>
        ) : (
          <div className="files-table">
            <div className="files-table-header">
              <span>Nom</span>
              <span>Taille</span>
              <span>Type</span>
              <span>Date</span>
            </div>
            {displayNodes.map((node) => {
              const cat = getFileCategory(node);
              return (
                <div key={node.id} className="file-row" onClick={() => handleNodeClick(node)}>
                  <div className="file-name-cell">
                    <div className={`file-icon-wrap ${cat}`}>{FILE_EMOJIS[cat]}</div>
                    <span className="file-name">{node.name}</span>
                  </div>
                  <span className="file-size">{node.type === 'file' ? formatSize(node.size) : '—'}</span>
                  <span className="file-type-label">{node.mime_type || 'dossier'}</span>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span className="file-date">{formatDate(node.created_at)}</span>
                    {/* Actions */}
                    <div className="file-actions" onClick={(e) => e.stopPropagation()}>
                      {/* Télécharger */}
                      {node.type === 'file' && (
                        <a href={fileService.downloadFile(node.id)} download title="Télécharger">
                          <button className="btn-icon">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                          </button>
                        </a>
                      )}
                      {/* ZIP dossier */}
                      {node.type === 'folder' && (
                        <a href={fileService.downloadFolderUrl(node.id)} title="Télécharger ZIP">
                          <button className="btn-icon">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                          </button>
                        </a>
                      )}
                      {/* Partager */}
                      {!sharedOnly && (
                        <button className="btn-icon" title="Partager" onClick={() => { setShareNode(node); setShareLink(''); setShareMode('public'); setShareEmail(''); setShareStatus(''); }}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
                        </button>
                      )}
                      {/* Renommer */}
                      {!sharedOnly && (
                        <button className="btn-icon" title="Renommer" onClick={() => { setRenameNode(node); setRenameName(node.name); }}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                        </button>
                      )}
                      {/* Supprimer */}
                      {!sharedOnly && (
                        <button className="btn-icon" title="Supprimer" style={{ color: 'var(--danger)' }} onClick={() => handleDelete(node)}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Upload progress toast */}
      {uploadProgress !== null && (
        <div className="upload-toast">
          <div className="upload-toast-label">Upload en cours… {uploadProgress}%</div>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${uploadProgress}%` }} />
          </div>
        </div>
      )}

      {/* ── Modal nouveau dossier ── */}
      {newFolderOpen && (
        <div className="modal-overlay" onClick={() => setNewFolderOpen(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">Nouveau dossier</span>
              <button className="btn-icon" onClick={() => setNewFolderOpen(false)}>✕</button>
            </div>
            <form onSubmit={handleCreateFolder}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Nom du dossier</label>
                  <input className="form-input" type="text" value={newFolderName}
                    onChange={e => setNewFolderName(e.target.value)} autoFocus required placeholder="Mon dossier" />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setNewFolderOpen(false)}>Annuler</button>
                <button type="submit" className="btn btn-primary">Créer</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal renommage ── */}
      {renameNode && (
        <div className="modal-overlay" onClick={() => setRenameNode(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">Renommer</span>
              <button className="btn-icon" onClick={() => setRenameNode(null)}>✕</button>
            </div>
            <form onSubmit={handleRename}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Nouveau nom</label>
                  <input className="form-input" type="text" value={renameName}
                    onChange={e => setRenameName(e.target.value)} autoFocus required />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setRenameNode(null)}>Annuler</button>
                <button type="submit" className="btn btn-primary">Renommer</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal prévisualisation ── */}
      {previewFile && (
        <div className="modal-overlay" onClick={() => { setPreviewFile(null); setPreviewText(''); }}>
          <div className="modal modal-preview" style={{ maxWidth: '90vw' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">{previewFile.name}</span>
              <div style={{ display: 'flex', gap: 6 }}>
                <a href={fileService.downloadFile(previewFile.id)} download>
                  <button className="btn btn-secondary" style={{ height: 30, fontSize: 12 }}>⬇ Télécharger</button>
                </a>
                <button className="btn-icon" onClick={() => { setPreviewFile(null); setPreviewText(''); }}>✕</button>
              </div>
            </div>
            <div className="modal-body">
              {isImage(previewFile.mime_type) && (
                <img src={`${API_URL}/api/files/${previewFile.id}/preview?token=${token}`}
                  alt={previewFile.name} style={{ maxWidth: '100%', maxHeight: '75vh', borderRadius: 8 }} />
              )}
              {isPdf(previewFile.mime_type) && (
                <iframe src={`${API_URL}/api/files/${previewFile.id}/preview?token=${token}`}
                  title={previewFile.name} style={{ width: '80vw', height: '75vh', border: 'none', borderRadius: 8 }} />
              )}
              {isText(previewFile.mime_type, previewFile.name) && (
                <pre className="preview-text">{previewText || 'Chargement…'}</pre>
              )}
              {isAudio(previewFile.mime_type) && (
                <audio controls autoPlay style={{ width: '100%', marginTop: 20 }}
                  src={`${API_URL}/api/files/${previewFile.id}/stream?token=${token}`} />
              )}
              {isVideo(previewFile.mime_type) && (
                <video controls autoPlay style={{ maxWidth: '100%', maxHeight: '70vh', borderRadius: 8 }}
                  src={`${API_URL}/api/files/${previewFile.id}/stream?token=${token}`} />
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Modal partage ── */}
      {shareNode && (
        <div className="modal-overlay" onClick={() => setShareNode(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">Partager — {shareNode.name}</span>
              <button className="btn-icon" onClick={() => setShareNode(null)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="tab-bar">
                <button className={`tab-btn ${shareMode === 'public' ? 'active' : ''}`} onClick={() => setShareMode('public')}>Lien public</button>
                <button className={`tab-btn ${shareMode === 'private' ? 'active' : ''}`} onClick={() => setShareMode('private')}>Utilisateur</button>
              </div>

              {shareMode === 'public' ? (
                <div>
                  <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>
                    Générez un lien accessible sans compte.
                  </p>
                  {shareLoading ? (
                    <div style={{ color: 'var(--text-tertiary)', fontSize: 13 }}>Génération…</div>
                  ) : shareLink ? (
                    <div>
                      <input className="form-input" value={shareLink} readOnly onFocus={e => e.target.select()} style={{ marginBottom: 10 }} />
                      <a href={shareLink} target="_blank" rel="noopener noreferrer" className="btn btn-secondary" style={{ fontSize: 12, height: 30 }}>
                        Ouvrir ↗
                      </a>
                    </div>
                  ) : (
                    <button className="btn btn-primary" onClick={generateLink}>Générer le lien</button>
                  )}
                </div>
              ) : (
                <form onSubmit={handleInternalShare}>
                  <div className="form-group">
                    <label className="form-label">Email de l'utilisateur</label>
                    <input className="form-input" type="email" value={shareEmail}
                      onChange={e => setShareEmail(e.target.value)} placeholder="utilisateur@example.com" required autoFocus />
                  </div>
                  {shareStatus && (
                    <div style={{ marginBottom: 12, fontSize: 13, color: shareStatus.includes('✓') ? 'var(--success)' : 'var(--danger)' }}>
                      {shareStatus}
                    </div>
                  )}
                  <button type="submit" className="btn btn-primary">Partager</button>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
