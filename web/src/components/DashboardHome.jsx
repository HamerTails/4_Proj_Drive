import { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
const QUOTA_MAX_BYTES = 30 * 1024 ** 3;

// formatage de taille lisible
const fmt = (b) => {
  if (!b || b === 0) return '0 o';
  if (b < 1024 ** 2)  return (b / 1024).toFixed(0) + ' Ko';
  if (b < 1024 ** 3)  return (b / 1024 ** 2).toFixed(1) + ' Mo';
  return (b / 1024 ** 3).toFixed(2) + ' Go';
};

const fmtDate = (iso) =>
  iso
    ? new Date(iso).toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
    : '—';

const COLORS = {
  Images:    'purple',
  Vidéos:    'lightblue',
  Audio:     'lightgreen',
  Documents: 'lightcoral',
  Texte:     'green',
  Autres:    'lightgray',
};

const mimeToCategory = (m) => {
  if (!m)                        return 'Autres';
  if (m.startsWith('image/'))    return 'Images';
  if (m.startsWith('video/'))    return 'Vidéos';
  if (m.startsWith('audio/'))    return 'Audio';
  if (m === 'application/pdf')   return 'Documents';
  if (m.startsWith('text/'))     return 'Texte';
  return 'Autres';
};

const mimeToIcon = (m) => {
  if (!m)                        return '../icone/other.svg';
  if (m.startsWith('image/'))    return '../icone/image.svg';
  if (m === 'application/pdf')   return '../icone/pdf.svg';
  if (m.startsWith('audio/'))    return '../icone/audio.svg';
  if (m.startsWith('video/'))    return '../icone/video.svg';
  if (m.startsWith('text/'))     return '../icone/text.svg';
  return '../icone/other.svg';
};

// graphique camembert
function CamembertChart({ data }) {
  const size = 180;
  const cx   = size / 2;
  const cy   = size / 2;
  const R    = 70;
  const r    = 45;

  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) return null;

  let angle = -Math.PI / 2;
  const slices = data.map((d) => {
    const sweep = (d.value / total) * 2 * Math.PI;
    const start = angle;
    angle += sweep;
    return { ...d, start, sweep };
  });

  const arc = (cx, cy, R, start, sweep) => {
    const x1    = cx + R * Math.cos(start);
    const y1    = cy + R * Math.sin(start);
    const x2    = cx + R * Math.cos(start + sweep);
    const y2    = cy + R * Math.sin(start + sweep);
    const large = sweep > Math.PI ? 1 : 0;
    return 'M ${x1} ${y1} A ${R} ${R} 0 ${large} 1 ${x2} ${y2}';
  };

  const [hovered, setHovered] = useState(null);

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
      <svg width={size} height={size} style={{ flexShrink: 0 }}>
        {slices.map((s, i) => {
          const outerR = hovered === i ? R + 6 : R;
          const d =
            arc(cx, cy, outerR, s.start, s.sweep - 0.02) +
            ' ' +
            arc(cx, cy, r, s.start + s.sweep - 0.02, -(s.sweep - 0.02)) +
            ' Z';

          return (
            <path
              key={s.name}
              d={d}
              fill={COLORS[s.name] || '#D1D5DB'}
              style={{ cursor: 'pointer', transition: 'all 150ms' }}
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
            />
          );
        })}

        {hovered !== null && (
          <text x={cx} y={cy - 8} textAnchor="middle" fontSize={11} fill="var(--text-tertiary)">
            {slices[hovered].name}
          </text>
        )}
        {hovered !== null && (
          <text x={cx} y={cy + 10} textAnchor="middle" fontSize={13} fontWeight="600" fill="var(--text-primary)">
            {fmt(slices[hovered].value)}
          </text>
        )}
      </svg>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {slices.map((s) => (
          <div key={s.name} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, color: 'var(--text-secondary)' }}>
            <div style={{
              width:        10,
              height:       10,
              borderRadius: 2,
              background:   COLORS[s.name] || '#D1D5DB',
              flexShrink:   0,
            }} />
            <span>{s.name}</span>
            <span style={{ color: 'var(--text-tertiary)', marginLeft: 2 }}>{fmt(s.value)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

const Card = ({ children, style }) => (
  <div style={{
    background:   'var(--bg-primary)',
    border:       '1px solid var(--border)',
    borderRadius: 'var(--radius-lg)',
    padding:      '20px 24px',
    boxShadow:    'var(--shadow-sm)',
    ...style,
  }}>
    {children}
  </div>
);

const SectionLabel = ({ children }) => (
  <div style={{
    fontSize:       11,
    fontWeight:     700,
    color:          'var(--text-tertiary)',
    textTransform:  'uppercase',
    letterSpacing:  '0.6px',
    marginBottom:   16,
  }}>
    {children}
  </div>
);

export default function DashboardHome({ onNavigateFiles }) {
  const [usage,     setUsage]     = useState(null);
  const [recent,    setRecent]    = useState([]);
  const [breakdown, setBreakdown] = useState([]);
  const [loading,   setLoading]   = useState(true);

  const token   = localStorage.getItem('token');
  const headers = { Authorization: 'Bearer ${token}' };

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    setLoading(true);

    const [u, r, b] = await Promise.allSettled([
      axios.get('${API_URL}/api/storage/usage',          { headers }),
      axios.get('${API_URL}/api/storage/recent?limit=5', { headers }),
      axios.get('${API_URL}/api/storage/breakdown',       { headers }),
    ]);

    if (u.status === 'fulfilled') setUsage(u.value.data);
    if (r.status === 'fulfilled') setRecent(r.value.data.files || []);

    if (b.status === 'fulfilled') {
      const raw     = b.value.data.breakdown || [];
      const grouped = {};

      for (const { mime_type, total_size } of raw) {
        const cat = mimeToCategory(mime_type);
        grouped[cat] = (grouped[cat] || 0) + Number(total_size);
      }

      setBreakdown(
        Object.entries(grouped)
          .map(([name, value]) => ({ name, value }))
          .filter((d) => d.value > 0)
          .sort((a, b) => b.value - a.value)
      );
    }

    setLoading(false);
  };

  const used  = usage?.storage_used || 0;
  const pct   = Math.min((used / QUOTA_MAX_BYTES) * 100, 100);
  const gauge =
    pct > 90 ? 'var(--danger)' :
    pct > 70 ? 'var(--warning)' :
    'var(--accent)';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="topbar">
        <span className="topbar-title">Tableau de bord</span>
        <div className="topbar-actions">
          <button className="btn btn-primary" onClick={onNavigateFiles}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7z"/>
            </svg>
            Mes fichiers
          </button>
        </div>
      </div>

      <div className="page-content" style={{ overflowY: 'auto' }}>
        {loading ? (
          <div className="empty-state">
            <div style={{ color: 'var(--text-tertiary)', fontSize: 13 }}>Chargement…</div>
          </div>
        ) : (
          <div style={{
            display:             'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap:                 16,
            maxWidth:            1000,
          }}>

            <Card>
              <SectionLabel>Stockage</SectionLabel>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 8 }}>
                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{fmt(used)}</span>
                <span style={{ color: 'var(--text-tertiary)' }}>30 Go</span>
              </div>

              <div style={{
                height:       8,
                background:   'var(--bg-tertiary)',
                borderRadius: 99,
                overflow:     'hidden',
                marginBottom: 6,
              }}>
                <div style={{
                  height:       '100%',
                  width:        '${pct}%',
                  background:   gauge,
                  borderRadius: 99,
                  transition:   'width 900ms ease',
                }} />
              </div>

              <div style={{
                fontSize:    12,
                color:       pct > 90 ? 'var(--danger)' : 'var(--text-tertiary)',
                marginBottom: 18,
              }}>
                {pct.toFixed(1)}% — {fmt(QUOTA_MAX_BYTES - used)} disponible
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {[
                  { label: 'Fichiers', value: usage?.file_count ?? '—' },
                  { label: 'Dossiers', value: usage?.folder_count ?? '—' },
                ].map(({ label, value }) => (
                  <div key={label} style={{
                    background:   'var(--bg-secondary)',
                    borderRadius: 8,
                    padding:      '10px 14px',
                  }}>
                    <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)' }}>
                      {value}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{label}</div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Répartition par type */}
            <Card style={{ minHeight: 260 }}>
              <SectionLabel>Répartition par type</SectionLabel>
              {breakdown.length === 0 ? (
                <div style={{ color: 'var(--text-tertiary)', fontSize: 13, textAlign: 'center', paddingTop: 40 }}>
                  Aucune donnée
                </div>
              ) : (
                <CamembertChart data={breakdown} />
              )}
            </Card>

            {/* Fichiers récents */}
            <Card style={{ gridColumn: '1 / -1' }}>
              <SectionLabel>Fichiers récents</SectionLabel>
              {recent.length === 0 ? (
                <div style={{ color: 'var(--text-tertiary)', fontSize: 13 }}>Aucun fichier récent</div>
              ) : (
                recent.map((file) => (
                  <div
                    key={file.id}
                    onClick={onNavigateFiles}
                    style={{
                      display:    'flex',
                      alignItems: 'center',
                      gap:        12,
                      padding:    '7px 10px',
                      borderRadius: 8,
                      cursor:     'pointer',
                      transition: 'background 120ms',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-secondary)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <img
                      src={mimeToIcon(file.mime_type)}
                      width={26}
                      height={26}
                      alt=""
                      style={{ flexShrink: 0 }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize:     13.5,
                        fontWeight:   500,
                        color:        'var(--text-primary)',
                        whiteSpace:   'nowrap',
                        overflow:     'hidden',
                        textOverflow: 'ellipsis',
                      }}>
                        {file.name}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
                        {fmt(file.size)}
                      </div>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-tertiary)', flexShrink: 0 }}>
                      {fmtDate(file.created_at)}
                    </div>
                  </div>
                ))
              )}
            </Card>

          </div>
        )}
      </div>
    </div>
  );
}
