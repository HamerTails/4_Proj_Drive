import { useEffect } from 'react';

// Injecte le keyframe une seule fois dans le DOM
var injected = false;
function injectKeyframe() {
  if (injected) return;
  var style = document.createElement('style');
  style.textContent =
    '@keyframes skeleton-pulse { ' +
    '0% { background-position: 200% 0; } ' +
    '100% { background-position: -200% 0; } ' +
    '}';
  document.head.appendChild(style);
  injected = true;
}

var pulse = {
  background:     'linear-gradient(90deg, var(--bg-tertiary) 25%, var(--bg-hover) 50%, var(--bg-tertiary) 75%)',
  backgroundSize: '200% 100%',
  animation:      'skeleton-pulse 1.4s ease infinite',
  borderRadius:   6,
};

export function SkeletonLine({ width, height, style }) {
  useEffect(function() { injectKeyframe(); }, []);
  return <div style={{ ...pulse, width: width || '100%', height: height || 13, ...style }} />;
}

export function SkeletonFileRow() {
  useEffect(function() { injectKeyframe(); }, []);
  return (
    <div className="file-row" style={{ cursor: 'default', pointerEvents: 'none' }}>
      <div className="file-name-cell">
        <div style={{ ...pulse, width: 15, height: 15, borderRadius: 3, flexShrink: 0 }} />
        <div style={{ ...pulse, width: 28, height: 28, borderRadius: 8, flexShrink: 0 }} />
        <SkeletonLine width="55%" height={14} />
      </div>
      <SkeletonLine width={40}  height={12} />
      <SkeletonLine width={80}  height={12} />
      <SkeletonLine width={70}  height={12} />
      <div />
    </div>
  );
}

export function SkeletonFileCard() {
  useEffect(function() { injectKeyframe(); }, []);
  return (
    <div
      style={{
        cursor:        'default',
        pointerEvents: 'none',
        display:       'flex',
        flexDirection: 'column',
        gap:           8,
        padding:       16,
        background:    'var(--bg-primary)',
        border:        '1px solid var(--border)',
        borderRadius:  'var(--radius-md)',
      }}
    >
      <div style={{ ...pulse, width: 48, height: 48, borderRadius: 8, margin: '0 auto 4px' }} />
      <SkeletonLine width="80%" height={13} style={{ margin: '0 auto' }} />
      <SkeletonLine width="50%" height={11} style={{ margin: '0 auto' }} />
    </div>
  );
}