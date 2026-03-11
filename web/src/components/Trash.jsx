import { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const formatSize = (bytes) => {
  if (!bytes) return '—';
  if (bytes < 1024) return bytes + ' o';
  if (bytes < 1024 ** 2) return (bytes / 1024).toFixed(1) + ' Ko';
  return (bytes / 1024 ** 2).toFixed(1) + ' Mo';
};

const formatDate = (iso) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
};

// modal de confirmation/info réutilisable — plus de confirm() ni alert() natifs
function Dialog({ title, message, type = 'confirm', onConfirm, onClose }) {
  const isConfirm = type === 'confirm';
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 400 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">{title}</span>
          <button className="btn-icon" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{message}</p>
        </div>
        <div className="modal-footer">
          {isConfirm ? (
            <>
              <button className="btn btn-secondary" onClick={onClose}>Annuler</button>
              <button className="btn btn-danger" onClick={() => { onConfirm(); onClose(); }} autoFocus>Confirmer</button>
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
  const [items, setItems]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialog, setDialog]   = useState(null); // { title, message, type, onConfirm }

  const token  = localStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/api/trash`, { headers });
      setItems(res.data.trash || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  // helper pour ouvrir une confirmation
  const confirm = (title, message, onConfirm) => {
    setDialog({ title, message, type: 'confirm', onConfirm });
  };

  // helper pour ouvrir une info/erreur
  const notify = (title, message) => {
    setDialog({ title, message, type: 'info' });
  };

  const restore = async (id) => {
    try {
      await axios.put(`${API_URL}/api/trash/${id}/restore`, {}, { headers });
      load();
    } catch (e) {
      notify('Erreur', e.response?.data?.error || e.message);
    }
  };

  const deletePermanent = (id, name) => {
    confirm(
      'Supprimer définitivement',
      `"${name}" sera supprimé définitivement. Cette action est irréversible.`,
      async () => {
        try {
          await axios.delete(`${API_URL}/api/trash/${id}/permanent`, { headers });
          load();
        } catch (e) {
          notify('Erreur', e.response?.data?.error || e.message);
        }
      }
    );
  };

  const emptyTrash = () => {
    confirm(
      'Vider la corbeille',
      `Les ${items.length} élément${items.length > 1 ? 's' : ''} seront supprimés définitivement. Cette action est irréversible.`,
      async () => {
        const errors = [];
        for (const item of items) {
          try {
            await axios.delete(`${API_URL}/api/trash/${item.id}/permanent`, { headers });
          } catch (e) {
            errors.push(item.name);
          }
        }
        load();
        if (errors.length > 0) {
          notify('Suppression partielle', `Ces éléments n'ont pas pu être supprimés : ${errors.join(', ')}`);
        }
      }
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

      {/* dialog custom */}
      {dialog && (
        <Dialog
          title={dialog.title}
          message={dialog.message}
          type={dialog.type}
          onConfirm={dialog.onConfirm}
          onClose={() => setDialog(null)}
        />
      )}

      {/* topbar */}
      <div className="topbar">
        <span className="topbar-title">Corbeille</span>
        {items.length > 0 && (
          <div className="topbar-actions">
            <button className="btn btn-danger" onClick={emptyTrash}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/>
                <path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/>
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
            <div className="empty-state-icon">🗑️</div>
            <div className="empty-state-title">Corbeille vide</div>
            <div className="empty-state-desc">Les éléments supprimés apparaîtront ici pendant 30 jours.</div>
          </div>
        ) : (
          <>
            <div style={{ marginBottom: 12 }}>
              <span className="badge badge-red">{items.length} élément{items.length > 1 ? 's' : ''}</span>
              <span style={{ fontSize: 12, color: 'var(--text-tertiary)', marginLeft: 8 }}>
                Suppression automatique après 30 jours
              </span>
            </div>

            <div className="files-table">
              <div className="files-table-header">
                <span>Nom</span>
                <span>Taille</span>
                <span>Supprimé le</span>
                <span>Actions</span>
              </div>
              {items.map((item) => (
                <div key={item.id} className="file-row" style={{ cursor: 'default' }}>
                  <div className="file-name-cell">
                    <div className={`file-icon-wrap ${item.type === 'folder' ? 'folder' : 'other'}`}>
                      {item.type === 'folder' ? '📁' : '📄'}
                    </div>
                    <span className="file-name" style={{ color: 'var(--text-secondary)' }}>{item.name}</span>
                  </div>
                  <span className="file-size">{formatSize(item.size)}</span>
                  <span className="file-date">{formatDate(item.trashed_at)}</span>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <button className="btn btn-secondary" style={{ height: 28, fontSize: 12 }}
                      onClick={() => restore(item.id)}>
                      ↩ Restaurer
                    </button>
                    <button className="btn btn-danger" style={{ height: 28, fontSize: 12 }}
                      onClick={() => deletePermanent(item.id, item.name)}>
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
