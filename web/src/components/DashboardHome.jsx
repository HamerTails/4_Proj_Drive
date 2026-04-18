import { useState, useEffect } from 'react';
import { storageService } from '../services/api';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

import iconOther    from '../../icone/other.svg';
import iconImage    from '../../icone/image.svg';
import iconPdf      from '../../icone/pdf.svg';
import iconAudio    from '../../icone/audio.svg';
import iconVideo    from '../../icone/video.svg';
import iconText     from '../../icone/text.svg';

var QUOTA_MAX_BYTES = 30 * 1024 ** 3;

var fmt = (b) => {
  if (!b || b === 0) return '0 o';
  if (b < 1024 ** 2)  return (b / 1024).toFixed(0) + ' Ko';
  if (b < 1024 ** 3)  return (b / 1024 ** 2).toFixed(1) + ' Mo';
  return (b / 1024 ** 3).toFixed(2) + ' Go';
};

var fmtDate = (iso) =>
  iso
    ? new Date(iso).toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
    : '—';

var COLORS = {
  Images:    'purple',
  'Vidéos':  'lightblue',
  Audio:     'lightgreen',
  Documents: 'lightcoral',
  Texte:     'green',
  Autres:    'lightgray',
};

var mimeToCategory = (m) => {
  if (!m)                        return 'Autres';
  if (m.startsWith('image/'))    return 'Images';
  if (m.startsWith('video/'))    return 'Vidéos';
  if (m.startsWith('audio/'))    return 'Audio';
  if (m === 'application/pdf')   return 'Documents';
  if (m.startsWith('text/'))     return 'Texte';
  return 'Autres';
};

var mimeToIcon = (m) => {
  if (!m)                        return iconOther;
  if (m.startsWith('image/'))    return iconImage;
  if (m === 'application/pdf')   return iconPdf;
  if (m.startsWith('audio/'))    return iconAudio;
  if (m.startsWith('video/'))    return iconVideo;
  if (m.startsWith('text/'))     return iconText;
  return iconOther;
};

function CamembertChart({ data }) {
  var chartData = (data || []).filter((d) => Number(d.value) > 0);
  if (chartData.length === 0) return null;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap', minHeight: 200 }}>
      <div style={{ width: 180, height: 180, flexShrink: 0, display: 'flex' }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={70}
              paddingAngle={1}
              stroke="none"
            >
              {chartData.map((entry) => (
                <Cell key={entry.name} fill={COLORS[entry.name] || '#D1D5DB'} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value) => fmt(Number(value))}
              contentStyle={{
                borderRadius: 8,
                border: '1px solid var(--border)',
                background: 'var(--bg-primary)',
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {chartData.map((s) => (
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

var Card = ({ children, style }) => (
  <div style={{
    background:   'var(--bg-primary)',
    border:       '1px solid var(--border)',
    borderRadius: 'var(--radius-lg)',
    padding:      '20px 24px',
    boxShadow:    'var(--shadow-sm)',
    transition:   'all 0.3s ease',
    ...style,
  }}
  onMouseEnter={(e) => {
    e.currentTarget.style.transform = 'translateY(-2px)';
    e.currentTarget.style.boxShadow = '0 6px 18px rgba(0,0,0,0.08)';
  }}
  onMouseLeave={(e) => {
    e.currentTarget.style.transform = 'translateY(0)';
    e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
  }}>
    {children}
  </div>
);

var SectionLabel = ({ children }) => (
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
  var [usage,     setUsage]     = useState(null);
  var [recent,    setRecent]    = useState([]);
  var [breakdown, setBreakdown] = useState([]);
  var [loading,   setLoading]   = useState(true);

  useEffect(() => {
    load();
  }, []);

  var load = async () => {
    setLoading(true);

    var [u, r, b] = await Promise.allSettled([
      storageService.getUsage(),
      storageService.getRecent(5),
      storageService.getBreakdown(),
    ]);

    if (u.status === 'fulfilled') setUsage(u.value);
    if (r.status === 'fulfilled') setRecent(u.value?.files || r.value.files || []);

    if (b.status === 'fulfilled') {
      var raw     = b.value.breakdown || [];
      var grouped = {};

      for (var row of raw) {
        var category = row.category || mimeToCategory(row.mime_type);
        var size = Number(row.total_size || 0);
        grouped[category] = (grouped[category] || 0) + size;
      }

      setBreakdown(
        Object.entries(grouped)
          .map(function(entry) { return { name: entry[0], value: entry[1] }; })
          .filter(function(d) { return d.value > 0; })
          .sort(function(a, b) { return b.value - a.value; })
      );
    }

    setLoading(false);
  };

  var used  = usage?.storage_used || 0;
  var pct   = Math.min((used / QUOTA_MAX_BYTES) * 100, 100);
  var gauge =
    pct > 90 ? 'var(--danger)' :
    pct > 70 ? 'var(--warning)' :
    'var(--accent)';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="topbar">
        <span
          className="topbar-title"
          style={{
            fontSize: 20,
            fontWeight: 700,
            letterSpacing: '0.3px',
          }}
        >
          Tableau de bord
        </span>
        <div className="topbar-actions">
          <button
            className="btn btn-primary"
            onClick={onNavigateFiles}
            style={{
              transition: 'all 0.2s ease',
              boxShadow: '0 2px 8px rgba(37, 99, 235, 0.2)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 6px 14px rgba(37, 99, 235, 0.25)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 2px 8px rgba(37, 99, 235, 0.2)';
            }}
          >
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
                height:       10,
                background:   'var(--bg-tertiary)',
                borderRadius: 999,
                overflow:     'hidden',
                marginBottom: 8,
              }}>
                <div style={{
                  height:       '100%',
                  width:        pct + '%',
                  background:   gauge,
                  borderRadius: 999,
                  transition:   'width 0.8s ease',
                  boxShadow:    '0 2px 6px rgba(0,0,0,0.1)',
                }} />
              </div>

              <div style={{
                fontSize:     12,
                color:        pct > 90 ? 'var(--danger)' : 'var(--text-tertiary)',
                marginBottom: 18,
              }}>
                {pct.toFixed(1)}% — {fmt(QUOTA_MAX_BYTES - used)} disponible
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {[
                  { label: 'Fichiers', value: usage?.file_count ?? '—' },
                  { label: 'Dossiers', value: usage?.folder_count ?? '—' },
                ].map(function(item) {
                  return (
                    <div key={item.label} style={{
                      background:   'var(--bg-secondary)',
                      borderRadius: 8,
                      padding:      '10px 14px',
                    }}>
                      <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)' }}>
                        {item.value}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{item.label}</div>
                    </div>
                  );
                })}
              </div>
            </Card>

            <Card style={{ minHeight: 260 }}>
              <SectionLabel>Répartition par type</SectionLabel>
              {breakdown.length === 0 ? (
                <div style={{ color: 'var(--text-tertiary)', fontSize: 13, textAlign: 'center', paddingTop: 40 }}>
                  Aucun fichier pour le moment — ajoutez des fichiers pour voir la répartition
                </div>
              ) : (
                <CamembertChart data={breakdown} />
              )}
            </Card>

            <Card style={{ gridColumn: '1 / -1' }}>
              <SectionLabel>Fichiers récents</SectionLabel>
              {recent.length === 0 ? (
                <div style={{
                  textAlign: 'center',
                  color: 'var(--text-tertiary)',
                  fontSize: 13,
                  paddingTop: 20,
                }}>
                  <div style={{ fontSize: 24, marginBottom: 8 }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ opacity: 0.5 }}>
                      <path d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7z"/>
                    </svg>
                  </div>
                  Aucun fichier récent — vos derniers fichiers apparaîtront ici
                </div>
              ) : (
                recent.map(function(file) {
                  return (
                    <div
                      key={file.id}
                      onClick={onNavigateFiles}
                      style={{
                        display:      'flex',
                        alignItems:   'center',
                        gap:          12,
                        padding:      '7px 10px',
                        borderRadius: 8,
                        cursor:       'pointer',
                        transition:   'background 120ms',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'var(--bg-secondary)';
                        e.currentTarget.style.transform = 'translateX(4px)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'transparent';
                        e.currentTarget.style.transform = 'translateX(0)';
                      }}
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
                  );
                })
              )}
            </Card>

          </div>
        )}
      </div>
    </div>
  );
}