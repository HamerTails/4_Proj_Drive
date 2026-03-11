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

export default function Trash() {
  const [items, setItems]   = useState([]);
  const [loading, setLoading] = useState(true);
  const token = localStorage.getItem('token');
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

  const restore = async (id) => {
    try {
      await axios.put(`${API_URL}/api/trash/${id}/restore`, {}, { headers });
      load();
    } catch (e) { alert('Erreur : ' + (e.response?.data?.error || e.message)); }
  };

  const deletePermanent = async (id, name) => {
    if (!confirm(`Supprimer définitivement "${name}" ? Cette action est irréversible.`)) return;
    try {
      await axios.delete(`${API_URL}/api/trash/${id}/permanent`, { headers });
      load();
    } catch (e) { alert('Erreur : ' + (e.response?.data?.error || e.message)); }
  };

  const emptyTrash = async () => {
    if (!confirm(`Vider la corbeille ? Tous les éléments seront supprimés définitivement.`)) return;
    try {
      await Promise.all(items.map(i => axios.delete(`${API_URL}/api/trash/${i.id}/permanent`, { headers })));
      load();
    } catch (e) { alert('Erreur lors du vidage'); }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Topbar */}
      <div className="topbar">
        <span className="topbar-title">Corbeille</span>
        {items.length > 0 && (
          <div className="topbar-actions">
            <button className="btn btn-danger" onClick={emptyTrash}>
              🗑 Vider la corbeille
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
                    <button className="btn btn-secondary" style={{ height: 28, fontSize: 12 }} onClick={() => restore(item.id)}>
                      ↩ Restaurer
                    </button>
                    <button className="btn btn-danger" style={{ height: 28, fontSize: 12 }} onClick={() => deletePermanent(item.id, item.name)}>
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
