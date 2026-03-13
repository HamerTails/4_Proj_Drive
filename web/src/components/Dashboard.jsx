import { useState, useEffect, useRef } from 'react';
import { fileService } from '../services/api';
import { Icon } from '../App';
import axios from 'axios';
import { SkeletonFileRow, SkeletonFileCard } from './Skeleton';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// fonctions utilitaires pour détecter le type MIME
const isImage = (m) => m?.startsWith('image/');
const isPdf   = (m) => m === 'application/pdf';
const isText  = (m, n) => m?.startsWith('text/') || n?.endsWith('.md') || n?.endsWith('.csv');
const isAudio = (m) => m?.startsWith('audio/');
const isVideo = (m) => m?.startsWith('video/');

// renvoie une catégorie à partir d'un noeud
const getFileCategory = (node) => {
  if (node.type === 'folder')            return 'folder';
  if (isImage(node.mime_type))           return 'image';
  if (isPdf(node.mime_type))             return 'pdf';
  if (isAudio(node.mime_type))           return 'audio';
  if (isVideo(node.mime_type))           return 'video';
  if (isText(node.mime_type, node.name)) return 'text';
  return 'other';
};

const FILE_ICONS = {
  folder: '../icone/folder.svg',
  image:  '../icone/image.svg',
  pdf:    '../icone/pdf.svg',
  audio:  '../icone/audio.svg',
  video:  '../icone/video.svg',
  text:   '../icone/text.svg',
  other:  '../icone/other.svg',
};

const FileIcon = ({ category, size = 32 }) => (
  <img
    src={FILE_ICONS[category]}
    alt={category}
    width={size}
    height={size}
    style={{ display: 'block', flexShrink: 0 }}
  />
);

const formatSize = (bytes) => {
  if (!bytes)           return '—';
  if (bytes < 1024)     return bytes + ' o';
  if (bytes < 1024 ** 2) return (bytes / 1024).toFixed(1) + ' Ko';
  if (bytes < 1024 ** 3) return (bytes / 1024 ** 2).toFixed(1) + ' Mo';
  return (bytes / 1024 ** 3).toFixed(2) + ' Go';
};

const formatDate = (iso) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const IconList = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="8" y1="6" x2="21" y2="6"/>
    <line x1="8" y1="12" x2="21" y2="12"/>
    <line x1="8" y1="18" x2="21" y2="18"/>
    <line x1="3" y1="6" x2="3.01" y2="6"/>
    <line x1="3" y1="12" x2="3.01" y2="12"/>
    <line x1="3" y1="18" x2="3.01" y2="18"/>
  </svg>
);

const IconGrid = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="3" width="7" height="7"/>
    <rect x="14" y="3" width="7" height="7"/>
    <rect x="3" y="14" width="7" height="7"/>
    <rect x="14" y="14" width="7" height="7"/>
  </svg>
);

export default function Dashboard({ sharedOnly = false }) {
  const [nodes, setNodes]                   = useState([]);
  const [currentFolder, setCurrentFolder]   = useState(null);
  const [breadcrumb, setBreadcrumb]         = useState([]);
  const [loading, setLoading]               = useState(true);
  const [uploadProgress, setUploadProgress] = useState(null);
  const [dragging, setDragging]             = useState(false);
  const [search, setSearch]                 = useState('');
  const [viewMode, setViewMode]             = useState(
    () => localStorage.getItem('viewMode') || 'list'
  );

  // drag & drop pour les fichiers/dossiers
  const [draggedNode, setDraggedNode]         = useState(null);  // le noeud qu'on déplace
  const [dropTarget, setDropTarget]           = useState(null);  // le dossier survolé
  const [isDraggingActive, setIsDraggingActive] = useState(false); // pour le curseur grabbing

  // états des différentes modales
  const [previewFile, setPreviewFile]     = useState(null);
  const [previewText, setPreviewText]     = useState('');
  const [detailNode, setDetailNode]       = useState(null);
  const [shareNode, setShareNode]         = useState(null);
  const [renameNode, setRenameNode]       = useState(null);
  const [renameName, setRenameName]       = useState('');
  const [newFolderOpen, setNewFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  // états liés au partage
  const [shareLink, setShareLink]         = useState('');
  const [shareMode, setShareMode]         = useState('public');
  const [shareEmail, setShareEmail]       = useState('');
  const [shareStatus, setShareStatus]     = useState('');
  const [shareLoading, setShareLoading]   = useState(false);
  const [shareExpires, setShareExpires]   = useState('');
  const [sharePassword, setSharePassword] = useState('');
  const [sharedWithMe, setSharedWithMe]   = useState([]);

  const [selectedIds, setSelectedIds] = useState([]);

  const fileInputRef = useRef();
  const token = localStorage.getItem('token');

  useEffect(() => {
    if (sharedOnly) {
      loadSharedWithMe();
      return;
    }
    loadNodes();
  }, [currentFolder, sharedOnly]);

  const toggleView = (mode) => {
    setViewMode(mode);
    localStorage.setItem('viewMode', mode);
  };

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
      const res = await axios.get(API_URL + '/api/shares/internal', {
        headers: { Authorization: 'Bearer ' + token },
      });
      setSharedWithMe(res.data.shared || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // --- Drag & Drop ---

  const handleDragStart = (e, node) => {
    setDraggedNode(node);
    setIsDraggingActive(true);
    e.dataTransfer.effectAllowed = 'move';
    setTimeout(() => (e.target.style.opacity = '0.4'), 0);
  };

  const handleDragEnd = (e) => {
    e.target.style.opacity = '1';
    setDraggedNode(null);
    setDropTarget(null);
    setIsDraggingActive(false);
  };

  const handleDragOverFolder = (e, folderId) => {
    e.preventDefault();
    e.stopPropagation();
    if (draggedNode && draggedNode.id !== folderId) {
      e.dataTransfer.dropEffect = 'move';
      setDropTarget(folderId);
    }
  };

  const handleDragLeaveFolder = () => {
    setDropTarget(null);
  };

  const handleDropOnFolder = async (e, targetFolder) => {
    e.preventDefault();
    e.stopPropagation();
    setDropTarget(null);

    if (!draggedNode || draggedNode.id === targetFolder.id) return;

    try {
      await axios.put(
        API_URL + '/api/nodes/' + draggedNode.id + '/move',
        { parent_id: targetFolder.id },
        { headers: { Authorization: 'Bearer ' + token } }
      );
      loadNodes();
    } catch (err) {
      alert('Impossible de déplacer : ' + (err.response?.data?.error || err.message));
    }
  };

  // drop sur le Accueil pour aller à la racine
  const handleDropOnRoot = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDropTarget(null);

    if (!draggedNode) return;

    try {
      await axios.put(
        API_URL + '/api/nodes/' + draggedNode.id + '/move',
        { parent_id: null },
        { headers: { Authorization: 'Bearer ' + token } }
      );
      loadNodes();
    } catch (err) {
      alert('Impossible de déplacer : ' + (err.response?.data?.error || err.message));
    }
  };

  // --- Upload ---

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

  const onDrop = (e) => {
    e.preventDefault();
    setDragging(false);

    // si on est en train de déplacer un noeud, on laisse le drag&drop gérer
    if (draggedNode) return;

    handleUpload([...e.dataTransfer.files]);
  };

  // --- Clic sur un noeud ---

  const handleNodeClick = async (node) => {
    if (node.type === 'folder') {
      setCurrentFolder(node.id);
      return;
    }

    if (isText(node.mime_type, node.name)) {
      const res = await fetch(API_URL + '/api/files/' + node.id + '/preview?token=' + token);
      setPreviewText(await res.text());
      setPreviewFile(node);
      return;
    }

    if (
      isImage(node.mime_type) ||
      isPdf(node.mime_type) ||
      isAudio(node.mime_type) ||
      isVideo(node.mime_type)
    ) {
      setPreviewText('');
      setPreviewFile(node);
      return;
    }

    window.open(fileService.downloadFile(node.id), '_blank');
  };

  // --- Créer un dossier ---

  const handleCreateFolder = async (e) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;
    try {
      await fileService.createFolder(newFolderName, currentFolder);
      setNewFolderName('');
      setNewFolderOpen(false);
      loadNodes();
    } catch (e) {
      alert('Erreur : ' + (e.response?.data?.error || e.message));
    }
  };

  // --- Renommer ---

  const handleRename = async (e) => {
    e.preventDefault();
    if (!renameName.trim() || !renameNode) return;
    try {
      await fileService.renameNode(renameNode.id, renameName);
      setRenameNode(null);
      setRenameName('');
      loadNodes();
    } catch (e) {
      alert('Erreur : ' + (e.response?.data?.error || e.message));
    }
  };

  // --- Supprimer ---

  const handleDelete = async (node) => {
    try {
      await fileService.deleteNode(node.id);
      loadNodes();
    } catch (e) {
      window.__toastError?.('Erreur : ' + (e.response?.data?.error || e.message));
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.length === 0) return;
    for (const id of selectedIds) {
      try {
        await fileService.deleteNode(id);
      } catch (e) {}
    }
    setSelectedIds([]);
    loadNodes();
  };

  // --- Sélection multiple ---

  const toggleSelect = (id, e) => {
    e.stopPropagation();
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = (e) => {
    e.stopPropagation();
    if (selectedIds.length === displayNodes.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(displayNodes.map((n) => n.id));
    }
  };

  // --- Partage public ---

  const generateLink = async () => {
    setShareLoading(true);
    try {
      const body = { node_id: shareNode.id };
      if (sharePassword) body.password = sharePassword;
      if (shareExpires)  body.expires_at = shareExpires;

      const res = await axios.post(API_URL + '/api/shares', body, {
        headers: { Authorization: 'Bearer ' + token },
      });

      const t = res.data.link.split('/').pop();
      setShareLink(window.location.origin + '/public/' + t);
    } catch {
      setShareLink('Erreur génération lien');
    } finally {
      setShareLoading(false);
    }
  };

  // --- Partage interne (par email) ---

  const handleInternalShare = async (e) => {
    e.preventDefault();
    setShareStatus('Envoi...');
    try {
      await axios.post(
        API_URL + '/api/shares/internal',
        { node_id: shareNode.id, email: shareEmail },
        { headers: { Authorization: 'Bearer ' + token } }
      );
      setShareStatus('✓ Partagé avec succès !');
      setShareEmail('');
    } catch (e) {
      setShareStatus(e.response?.data?.error || 'Erreur');
    }
  };

  // liste filtrée selon la recherche
  const baseNodes    = sharedOnly ? sharedWithMe : nodes;
  const displayNodes = search.trim()
    ? baseNodes.filter((n) =>
        n.name.toLowerCase().includes(search.trim().toLowerCase())
      )
    : baseNodes;

  // Style quand un dossier est survolé pendant un drag
  const rowStyle = (node) => ({
    outline:    dropTarget === node.id ? '2px solid var(--accent)' : 'none',
    background: dropTarget === node.id ? 'var(--accent-light)' : undefined,
    transition: 'all 150ms',
  });

  return (
    <div
      className={'drop-zone' + (dragging ? ' dragging' : '')}
      style={{ display: 'flex', flexDirection: 'column', height: '100%' }}
      onDragOver={(e) => {
        e.preventDefault();
        if (!draggedNode) setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
    >
      <div className="topbar">
        <span className="topbar-title">
          {sharedOnly ? 'Partagés avec moi' : 'Mes fichiers'}
        </span>

        {!sharedOnly && (
          <div className="search-bar">
            <span className="search-bar-icon">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"/>
                <line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
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
            <div style={{
              display: 'flex',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)',
              overflow: 'hidden',
            }}>
              <button
                className="btn-icon"
                title="Vue liste"
                style={{
                  borderRadius: 0,
                  background: viewMode === 'list' ? 'var(--bg-tertiary)' : 'transparent',
                  color: viewMode === 'list' ? 'var(--text-primary)' : 'var(--text-tertiary)',
                }}
                onClick={() => toggleView('list')}
              >
                <IconList />
              </button>
              <button
                className="btn-icon"
                title="Vue grille"
                style={{
                  borderRadius: 0,
                  background: viewMode === 'grid' ? 'var(--bg-tertiary)' : 'transparent',
                  color: viewMode === 'grid' ? 'var(--text-primary)' : 'var(--text-tertiary)',
                }}
                onClick={() => toggleView('grid')}
              >
                <IconGrid />
              </button>
            </div>

            <button className="btn btn-secondary" onClick={() => setNewFolderOpen(true)}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/>
                <line x1="12" y1="11" x2="12" y2="17"/>
                <line x1="9" y1="14" x2="15" y2="14"/>
              </svg>
              Nouveau dossier
            </button>

            <button className="btn btn-primary" onClick={() => fileInputRef.current?.click()}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="16 16 12 12 8 16"/>
                <line x1="12" y1="12" x2="12" y2="21"/>
                <path d="M20.39 18.39A5 5 0 0018 9h-1.26A8 8 0 103 16.3"/>
              </svg>
              Uploader
            </button>

            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="upload-input"
              onChange={(e) => handleUpload([...e.target.files])}
            />
          </div>
        )}
      </div>

      {/* Contenu principal */}
      <div className="page-content">

        {!sharedOnly && (
          <div className="breadcrumb">
            <button
              className="breadcrumb-item"
              onClick={() => setCurrentFolder(null)}
              onDragOver={(e) => {
                if (draggedNode) {
                  e.preventDefault();
                  setDropTarget('root');
                }
              }}
              onDragLeave={() => setDropTarget(null)}
              onDrop={(e) => {
                setDropTarget(null);
                handleDropOnRoot(e);
              }}
              style={{
                outline:    dropTarget === 'root' ? '2px solid var(--accent)' : 'none',
                background: dropTarget === 'root' ? 'var(--accent-light)' : 'transparent',
                borderRadius: 4,
                transition: 'all 150ms',
              }}
            >
              Accueil
            </button>

            {breadcrumb.map((item, i) => (
              <span key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span className="breadcrumb-sep">/</span>
                <button
                  className={'breadcrumb-item ' + (i === breadcrumb.length - 1 ? 'current' : '')}
                  onClick={() => i < breadcrumb.length - 1 && setCurrentFolder(item.id)}
                >
                  {item.name}
                </button>
              </span>
            ))}
          </div>
        )}

        {/* Badge de recherche */}
        {search.trim() && (
          <div style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="badge badge-blue">
              {displayNodes.length} résultat{displayNodes.length !== 1 ? 's' : ''} pour « {search} »
            </span>
            <button
              className="btn btn-ghost"
              style={{ height: 26, fontSize: 12 }}
              onClick={() => setSearch('')}
            >
              Effacer
            </button>
          </div>
        )}

        {/* États : chargement / vide / liste / grille */}
        {loading ? (
          <div className="empty-state">
            <div style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>Chargement…</div>
          </div>

        ) : displayNodes.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">
              {search.trim() ? '🔍' : sharedOnly ? '📥' : '📂'}
            </div>
            <div className="empty-state-title">
              {search.trim() ? 'Aucun fichier trouvé' : sharedOnly ? 'Aucun partage' : 'Dossier vide'}
            </div>
            <div className="empty-state-desc">
              {search.trim()
                ? 'Aucun fichier ne correspond à « ' + search + ' »'
                : sharedOnly
                  ? 'Personne ne vous a partagé de fichier.'
                  : 'Glissez des fichiers ici ou cliquez sur "Uploader".'}
            </div>
          </div>

        ) : viewMode === 'list' ? (

          /* ── Vue liste ── */
          <div className="files-table">
            <div className="files-table-header">
              <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <input
                  type="checkbox"
                  style={{ cursor: 'pointer', width: 15, height: 15, flexShrink: 0 }}
                  checked={displayNodes.length > 0 && selectedIds.length === displayNodes.length}
                  ref={(el) => {
                    if (el) el.indeterminate = selectedIds.length > 0 && selectedIds.length < displayNodes.length;
                  }}
                  onChange={toggleSelectAll}
                  onClick={(e) => e.stopPropagation()}
                />
                Nom
              </span>
              <span>Taille</span>
              <span>Type</span>
              <span>Date</span>
              <span style={{ display: 'flex', justifyContent: 'flex-end' }}>
                {selectedIds.length > 0 && (
                  <button
                    className="btn btn-danger"
                    style={{ height: 28, fontSize: 12 }}
                    onClick={handleDeleteSelected}
                  >
                    Supprimer ({selectedIds.length})
                  </button>
                )}
              </span>
            </div>

            {displayNodes.map((node) => {
              const cat      = getFileCategory(node);
              const isFolder = node.type === 'folder';
              const isDrop   = dropTarget === node.id;

              return (
                <div
                  key={node.id}
                  className="file-row"
                  style={{
                    outline:    isDrop ? '2px solid var(--accent)' : 'none',
                    background: isDrop ? 'var(--accent-light)' : undefined,
                    cursor:     isDraggingActive ? 'grabbing' : 'default',
                  }}
                  draggable={!sharedOnly}
                  onDragStart={(e) => handleDragStart(e, node)}
                  onDragEnd={handleDragEnd}
                  onDragOver={isFolder
                    ? (e) => handleDragOverFolder(e, node.id)
                    : (e) => e.preventDefault()
                  }
                  onDragLeave={isFolder ? handleDragLeaveFolder : undefined}
                  onDrop={isFolder ? (e) => handleDropOnFolder(e, node) : undefined}
                  onClick={() => handleNodeClick(node)}
                >
                  <div className="file-name-cell">
                    <input
                      type="checkbox"
                      style={{ cursor: 'pointer', width: 15, height: 15, flexShrink: 0 }}
                      checked={selectedIds.includes(node.id)}
                      onChange={(e) => toggleSelect(node.id, e)}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <FileIcon category={cat} size={28} />
                    <span className="file-name">{node.name}</span>
                  </div>

                  <span className="file-size">
                    {node.type === 'file' ? formatSize(node.size) : '—'}
                  </span>

                  <span className="file-type-label" title={node.mime_type || 'dossier'}>
                    {node.mime_type ? node.mime_type.split('/').pop() : 'dossier'}
                  </span>

                  <span className="file-date">{formatDate(node.created_at)}</span>

                  <div className="file-actions" onClick={(e) => e.stopPropagation()}>
                    {node.type === 'file' && (
                      <a href={fileService.downloadFile(node.id)} download title="Télécharger">
                        <button className="btn-icon">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
                            <polyline points="7 10 12 15 17 10"/>
                            <line x1="12" y1="15" x2="12" y2="3"/>
                          </svg>
                        </button>
                      </a>
                    )}

                    {node.type === 'folder' && (
                      <a href={fileService.downloadFolderUrl(node.id)} title="Télécharger ZIP">
                        <button className="btn-icon">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
                            <polyline points="7 10 12 15 17 10"/>
                            <line x1="12" y1="15" x2="12" y2="3"/>
                          </svg>
                        </button>
                      </a>
                    )}

                    {!sharedOnly && (
                      <button className="btn-icon" title="Détails" onClick={() => setDetailNode(node)}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="12" cy="12" r="10"/>
                          <line x1="12" y1="8" x2="12" y2="12"/>
                          <line x1="12" y1="16" x2="12.01" y2="16"/>
                        </svg>
                      </button>
                    )}

                    {!sharedOnly && (
                      <button
                        className="btn-icon"
                        title="Partager"
                        onClick={() => {
                          setShareNode(node);
                          setShareLink('');
                          setShareMode('public');
                          setShareEmail('');
                          setShareStatus('');
                          setSharePassword('');
                          setShareExpires('');
                        }}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="18" cy="5" r="3"/>
                          <circle cx="6" cy="12" r="3"/>
                          <circle cx="18" cy="19" r="3"/>
                          <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
                          <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
                        </svg>
                      </button>
                    )}

                    {!sharedOnly && (
                      <button
                        className="btn-icon"
                        title="Renommer"
                        onClick={() => {
                          setRenameNode(node);
                          setRenameName(node.name);
                        }}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                          <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                        </svg>
                      </button>
                    )}

                    {!sharedOnly && (
                      <button
                        className="btn-icon"
                        title="Supprimer"
                        style={{ color: 'var(--danger)' }}
                        onClick={() => handleDelete(node)}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="3 6 5 6 21 6"/>
                          <path d="M19 6l-1 14H6L5 6"/>
                          <path d="M10 11v6M14 11v6"/>
                          <path d="M9 6V4h6v2"/>
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

        ) : (

          /* Vue grille */
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
            gap: 12,
          }}>
            {displayNodes.map((node) => {
              const cat      = getFileCategory(node);
              const isFolder = node.type === 'folder';
              const isDrop   = dropTarget === node.id;

              return (
                <div
                  key={node.id}
                  draggable={!sharedOnly}
                  onDragStart={(e) => handleDragStart(e, node)}
                  onDragEnd={handleDragEnd}
                  onDragOver={isFolder
                    ? (e) => handleDragOverFolder(e, node.id)
                    : (e) => e.preventDefault()
                  }
                  onDragLeave={isFolder ? handleDragLeaveFolder : undefined}
                  onDrop={isFolder ? (e) => handleDropOnFolder(e, node) : undefined}
                  onClick={() => handleNodeClick(node)}
                  style={{
                    background:  isDrop ? 'var(--accent-light)' : 'var(--bg-primary)',
                    border:      '1px solid ' + (isDrop ? 'var(--accent)' : 'var(--border)'),
                    borderRadius: 'var(--radius-md)',
                    padding:     '16px 12px 12px',
                    cursor:      isDraggingActive ? 'grabbing' : 'default',
                    display:     'flex',
                    flexDirection: 'column',
                    alignItems:  'center',
                    gap:         8,
                    transition:  'all 150ms',
                    position:    'relative',
                  }}
                  onMouseEnter={(e) => {
                    if (!isDrop) {
                      e.currentTarget.style.borderColor = 'var(--accent)';
                      e.currentTarget.style.boxShadow  = 'var(--shadow-md)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isDrop) {
                      e.currentTarget.style.borderColor = 'var(--border)';
                      e.currentTarget.style.boxShadow  = 'none';
                    }
                  }}
                >
                  {!sharedOnly && (
                    <div
                      className="grid-actions"
                      style={{ position: 'absolute', top: 6, right: 6, display: 'flex', gap: 2, opacity: 0 }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        className="btn-icon"
                        style={{ width: 26, height: 26 }}
                        title="Renommer"
                        onClick={() => {
                          setRenameNode(node);
                          setRenameName(node.name);
                        }}
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                          <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                        </svg>
                      </button>
                      <button
                        className="btn-icon"
                        style={{ width: 26, height: 26, color: 'var(--danger)' }}
                        title="Supprimer"
                        onClick={() => handleDelete(node)}
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="3 6 5 6 21 6"/>
                          <path d="M19 6l-1 14H6L5 6"/>
                        </svg>
                      </button>
                    </div>
                  )}

                  <FileIcon category={cat} size={48} />

                  <span style={{
                    fontSize:   13,
                    fontWeight: 500,
                    color:      'var(--text-primary)',
                    textAlign:  'center',
                    wordBreak:  'break-word',
                    lineHeight: 1.3,
                    maxWidth:   '100%',
                  }}>
                    {node.name}
                  </span>

                  <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
                    {node.type === 'file' ? formatSize(node.size) : 'dossier'}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Barre de progression upload */}
      {uploadProgress !== null && (
        <div className="upload-toast">
          <div className="upload-toast-label">Upload en cours… {uploadProgress}%</div>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: uploadProgress + '%' }} />
          </div>
        </div>
      )}

      {/* Modale - Nouveau dossier */}
      {newFolderOpen && (
        <div className="modal-overlay" onClick={() => setNewFolderOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">Nouveau dossier</span>
              <button className="btn-icon" onClick={() => setNewFolderOpen(false)}>✕</button>
            </div>
            <form onSubmit={handleCreateFolder}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Nom du dossier</label>
                  <input
                    className="form-input"
                    type="text"
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    autoFocus
                    required
                    placeholder="Mon dossier"
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setNewFolderOpen(false)}>
                  Annuler
                </button>
                <button type="submit" className="btn btn-primary">Créer</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modale - Renommer */}
      {renameNode && (
        <div className="modal-overlay" onClick={() => setRenameNode(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">Renommer</span>
              <button className="btn-icon" onClick={() => setRenameNode(null)}>✕</button>
            </div>
            <form onSubmit={handleRename}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Nouveau nom</label>
                  <input
                    className="form-input"
                    type="text"
                    value={renameName}
                    onChange={(e) => setRenameName(e.target.value)}
                    autoFocus
                    required
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setRenameNode(null)}>
                  Annuler
                </button>
                <button type="submit" className="btn btn-primary">Renommer</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modale - Prévisualisation */}
      {previewFile && (
        <div
          className="modal-overlay"
          onClick={() => {
            setPreviewFile(null);
            setPreviewText('');
          }}
        >
          <div
            className="modal modal-preview"
            style={{ maxWidth: '96vw', width: '96vw' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <span className="modal-title">{previewFile.name}</span>
              <div style={{ display: 'flex', gap: 6 }}>
                <a href={fileService.downloadFile(previewFile.id)} download>
                  <button className="btn btn-secondary" style={{ height: 30, fontSize: 12 }}>
                    Télécharger
                  </button>
                </a>
                <button
                  className="btn-icon"
                  onClick={() => {
                    setPreviewFile(null);
                    setPreviewText('');
                  }}
                >
                  ✕
                </button>
              </div>
            </div>
            <div className="modal-body">
              {isImage(previewFile.mime_type) && (
                <img
                  src={API_URL + '/api/files/' + previewFile.id + '/preview?token=' + token}
                  alt={previewFile.name}
                  style={{ maxWidth: '100%', maxHeight: '85vh', borderRadius: 8 }}
                />
              )}
              {isPdf(previewFile.mime_type) && (
                <iframe
                  src={API_URL + '/api/files/' + previewFile.id + '/preview?token=' + token}
                  title={previewFile.name}
                  style={{ width: '92vw', height: '85vh', border: 'none', borderRadius: 8 }}
                />
              )}
              {isText(previewFile.mime_type, previewFile.name) && (
                <pre className="preview-text">{previewText || 'Chargement…'}</pre>
              )}
              {isAudio(previewFile.mime_type) && (
                <audio
                  controls
                  autoPlay
                  style={{ width: '100%', marginTop: 20 }}
                  src={API_URL + '/api/files/' + previewFile.id + '/stream?token=' + token}
                />
              )}
              {isVideo(previewFile.mime_type) && (
                <video
                  controls
                  autoPlay
                  style={{ maxWidth: '100%', maxHeight: '82vh', borderRadius: 8 }}
                  src={API_URL + '/api/files/' + previewFile.id + '/stream?token=' + token}
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modale - Détails du fichier */}
      {detailNode && (
        <div className="modal-overlay" onClick={() => setDetailNode(null)}>
          <div className="modal" style={{ maxWidth: 420 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">Détails — {detailNode.name}</span>
              <button className="btn-icon" onClick={() => setDetailNode(null)}>✕</button>
            </div>
            <div className="modal-body">
              {[
                { label: 'Nom',         value: detailNode.name },
                { label: 'Type',        value: detailNode.type === 'folder' ? 'Dossier' : (detailNode.mime_type || '—') },
                { label: 'Taille',      value: detailNode.size
                    ? detailNode.size < 1024 ** 2
                      ? (detailNode.size / 1024).toFixed(1) + ' Ko'
                      : (detailNode.size / 1024 ** 2).toFixed(1) + ' Mo'
                    : '—'
                },
                { label: 'Créé le',     value: detailNode.created_at ? new Date(detailNode.created_at).toLocaleString('fr-FR') : '—' },
                { label: 'Modifié le',  value: detailNode.updated_at ? new Date(detailNode.updated_at).toLocaleString('fr-FR') : '—' },
                { label: 'Identifiant', value: '#' + detailNode.id },
              ].map(({ label, value }) => (
                <div
                  key={label}
                  style={{
                    display:      'flex',
                    justifyContent: 'space-between',
                    padding:      '8px 0',
                    borderBottom: '1px solid var(--border)',
                    fontSize:     13,
                  }}
                >
                  <span style={{ color: 'var(--text-tertiary)', fontWeight: 500 }}>{label}</span>
                  <span style={{ color: 'var(--text-primary)', maxWidth: '60%', textAlign: 'right', wordBreak: 'break-all' }}>
                    {value}
                  </span>
                </div>
              ))}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setDetailNode(null)}>Fermer</button>
            </div>
          </div>
        </div>
      )}

      {/* Modale - Partage */}
      {shareNode && (
        <div className="modal-overlay" onClick={() => setShareNode(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">Partager — {shareNode.name}</span>
              <button className="btn-icon" onClick={() => setShareNode(null)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="tab-bar">
                <button
                  className={'tab-btn ' + (shareMode === 'public' ? 'active' : '')}
                  onClick={() => setShareMode('public')}
                >
                  Lien public
                </button>
                <button
                  className={'tab-btn ' + (shareMode === 'private' ? 'active' : '')}
                  onClick={() => setShareMode('private')}
                >
                  Utilisateur
                </button>
              </div>

              {shareMode === 'public' ? (
                <div>
                  <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>
                    Générez un lien accessible sans compte.
                  </p>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>
                        Mot de passe (optionnel)
                      </label>
                      <input
                        className="form-input"
                        type="password"
                        placeholder="Laisser vide pour aucun"
                        value={sharePassword}
                        onChange={(e) => setSharePassword(e.target.value)}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>
                        Expiration (optionnel)
                      </label>
                      <input
                        className="form-input"
                        type="datetime-local"
                        value={shareExpires}
                        onChange={(e) => setShareExpires(e.target.value)}
                        style={{ colorScheme: 'dark light' }}
                      />
                    </div>
                  </div>

                  {shareLoading ? (
                    <div style={{ color: 'var(--text-tertiary)', fontSize: 13 }}>Génération…</div>
                  ) : shareLink ? (
                    <div>
                      <input
                        className="form-input"
                        value={shareLink}
                        readOnly
                        onFocus={(e) => e.target.select()}
                        style={{ marginBottom: 10 }}
                      />
                      <a
                        href={shareLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-secondary"
                        style={{ fontSize: 12, height: 30 }}
                      >
                        Ouvrir ↗
                      </a>
                    </div>
                  ) : (
                    <button className="btn btn-primary" onClick={generateLink}>
                      Générer le lien
                    </button>
                  )}
                </div>
              ) : (
                <form onSubmit={handleInternalShare}>
                  <div className="form-group">
                    <label className="form-label">Email de l'utilisateur</label>
                    <input
                      className="form-input"
                      type="email"
                      value={shareEmail}
                      onChange={(e) => setShareEmail(e.target.value)}
                      placeholder="utilisateur@example.com"
                      required
                      autoFocus
                    />
                  </div>
                  {shareStatus && (
                    <div style={{
                      marginBottom: 12,
                      fontSize: 13,
                      color: shareStatus.includes('✓') ? 'var(--success)' : 'var(--danger)',
                    }}>
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
