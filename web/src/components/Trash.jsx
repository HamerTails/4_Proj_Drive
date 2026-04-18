import { useState, useEffect } from 'react';
import { trashService } from '../services/api';
import folderIcon from '../../icone/folder.svg';
import otherIcon  from '../../icone/other.svg';

const formatSize = (bytes) => {
  if (!bytes)           return '—';
  if (bytes < 1024)     return bytes + ' o';
  if (bytes < 1024 ** 2) return (bytes / 1024).toFixed(1) + ' Ko';
  return (bytes / 1024 ** 2).toFixed(1) + ' Mo';
};

const formatDate = (iso) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

function Dialog({ title, message, type = 'confirm', onConfirm, onClose }) {
  var isConfirm = type === 'confirm';

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 400 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">{title}</span>
          <button className="btn-icon" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            {message}
          </p>
        </div>
        <div className="modal-footer">
          {isConfirm ? (
            <>
              <button className="btn btn-secondary" onClick={onClose}>Annuler</button>
              <button
                className="btn btn-danger"
                onClick={() => {
                  onConfirm();
                  onClose();
                }}
                autoFocus
              >
                Confirmer
              </button>
            </>
          ) : (
            <button className="btn btn-primary" onClick={onClose} autoFocus>OK</button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Trash() {
  var [items,       setItems]       = useState([]);
  var [loading,     setLoading]     = useState(true);
  var [dialog,      setDialog]      = useState(null);
  var [selectedIds, setSelectedIds] = useState([]);

  useEffect(() => {
    load();
  }, []);

  var load = async () => {
    setLoading(true);
    try {
      var data = await trashService.list();
      setItems(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  var confirm = (title, message, onConfirm) => {
    setDialog({ title, message, type: 'confirm', onConfirm });
  };

  var notify = (title, message) => {
    setDialog({ title, message, type: 'info' });
  };

  var restore = async (id) => {
    try {
      await trashService.restore(id);
      load();
    } catch (e) {
      notify('Erreur', e.response?.data?.error || e.message);
    }
  };

  var deletePermanent = (id, name) => {
    confirm(
      'Supprimer définitivement',
      '"' + name + '" sera supprimé définitivement. Cette action est irréversible.',
      async () => {
        try {
          await trashService.deletePermanent(id);
          load();
        } catch (e) {
          notify('Erreur', e.response?.data?.error || e.message);
        }
      }
    );
  };

  var emptyTrash = () => {
    confirm(
      'Vider la corbeille',
      'Les ' + items.length + ' élément' + (items.length > 1 ? 's' : '') + ' seront supprimés définitivement. Cette action est irréversible.',
      async () => {
        var errors = [];
        for (var item of items) {
          try {
            await trashService.deletePermanent(item.id);
          } catch (e) {
            errors.push(item.name);
          }
        }
        load();
        if (errors.length > 0) {
          notify(
            'Suppression partielle',
            "Ces éléments n'ont pas pu être supprimés : " + errors.join(', ')
          );
        }
      }
    );
  };

  var toggleSelect = (id, e) => {
    e.stopPropagation();
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  var toggleSelectAll = (e) => {
    e.stopPropagation();
    if (selectedIds.length === items.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(items.map((n) => n.id));
    }
  };

  var restoreSelected = async () => {
    for (var id of selectedIds) {
      try {
        await trashService.restore(id);
      } catch {}
    }
    setSelectedIds([]);
    load();
  };

  var deleteSelected = () => {
    confirm(
      'Supprimer définitivement',
      selectedIds.length + ' élément(s) seront supprimés définitivement. Cette action est irréversible.',
      async () => {
        for (var id of selectedIds) {
          try {
            await trashService.deletePermanent(id);
          } catch {}
        }
        setSelectedIds([]);
        load();
      }
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

      {dialog && (
        <Dialog
          title={dialog.title}
          message={dialog.message}
          type={dialog.type}
          onConfirm={dialog.onConfirm}
          onClose={() => setDialog(null)}
        />
      )}

      <div className="topbar">
        <span className="topbar-title">Corbeille</span>
        {items.length > 0 && (
          <div className="topbar-actions">
            <button className="btn btn-danger" onClick={emptyTrash}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="3 6 5 6 21 6"/>
                <path d="M19 6l-1 14H6L5 6"/>
                <path d="M10 11v6M14 11v6"/>
                <path d="M9 6V4h6v2"/>
              </svg>
              Vider la corbeille
            </button>
          </div>
        )}
      </div>

      <div className="page-content">
        {loading ? (
          <div className="empty-state">
            <div style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>Chargement…</div>
          </div>

        ) : items.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">
              <svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ opacity: 0.5 }}>
                <polyline points="3 6 5 6 21 6"/>
                <path d="M19 6l-1 14H6L5 6"/>
                <path d="M10 11v6M14 11v6"/>
                <path d="M9 6V4h6v2"/>
              </svg>
            </div>
            <div className="empty-state-title">Corbeille vide</div>
            <div className="empty-state-desc">
              Les éléments supprimés apparaîtront ici pendant 30 jours.
            </div>
          </div>

        ) : (
          <>
            <div style={{ marginBottom: 12 }}>
              <span className="badge badge-red">
                {items.length} élément{items.length > 1 ? 's' : ''}
              </span>
              <span style={{ fontSize: 12, color: 'var(--text-tertiary)', marginLeft: 8 }}>
                Suppression automatique après 30 jours
              </span>
            </div>

            <div className="files-table trash-table">
              <div className="files-table-header">
                <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <input
                    type="checkbox"
                    style={{ cursor: 'pointer', width: 15, height: 15, flexShrink: 0 }}
                    checked={items.length > 0 && selectedIds.length === items.length}
                    ref={(el) => {
                      if (el) el.indeterminate = selectedIds.length > 0 && selectedIds.length < items.length;
                    }}
                    onChange={toggleSelectAll}
                    onClick={(e) => e.stopPropagation()}
                  />
                  Nom
                </span>
                <span>Taille</span>
                <span>Supprimé le</span>
                <span style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
                  {selectedIds.length > 0 ? (
                    <>
                      <button
                        className="btn btn-secondary"
                        style={{ height: 28, fontSize: 12 }}
                        onClick={restoreSelected}
                      >
                        ↩ Restaurer ({selectedIds.length})
                      </button>
                      <button
                        className="btn btn-danger"
                        style={{ height: 28, fontSize: 12 }}
                        onClick={deleteSelected}
                      >
                        Supprimer ({selectedIds.length})
                      </button>
                    </>
                  ) : (
                    <span>Actions</span>
                  )}
                </span>
              </div>

              {items.map((item) => (
                <div key={item.id} className="file-row" style={{ cursor: 'default' }}>
                  <div className="file-name-cell">
                    <input
                      type="checkbox"
                      style={{ cursor: 'pointer', width: 15, height: 15, flexShrink: 0 }}
                      checked={selectedIds.includes(item.id)}
                      onChange={(e) => toggleSelect(item.id, e)}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <div className={'file-icon-wrap ' + (item.type === 'folder' ? 'folder' : 'other')}>
                      <img
                        src={item.type === 'folder' ? folderIcon : otherIcon}
                        alt={item.type === 'folder' ? 'dossier' : 'fichier'}
                        width={18}
                        height={18}
                      />
                    </div>
                    <span className="file-name" style={{ color: 'var(--text-secondary)' }}>
                      {item.name}
                    </span>
                  </div>

                  <span className="file-size">{formatSize(item.size)}</span>
                  <span className="file-date">{formatDate(item.trashed_at)}</span>

                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <button
                      className="btn btn-secondary"
                      style={{ height: 28, fontSize: 12 }}
                      onClick={() => restore(item.id)}
                    >
                      ↩ Restaurer
                    </button>
                    <button
                      className="btn btn-danger"
                      style={{ height: 28, fontSize: 12 }}
                      onClick={() => deletePermanent(item.id, item.name)}
                    >
                      Supprimer
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}