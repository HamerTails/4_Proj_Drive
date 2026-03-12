// Composants skeleton loader (F1-20)
const pulse = {
  background: 'linear-gradient(90deg, var(--bg-tertiary) 25%, var(--bg-secondary) 50%, var(--bg-tertiary) 75%)',
  backgroundSize: '200% 100%',
  animation: 'skeleton-pulse 1.4s ease infinite',
  borderRadius: 6,
};

export function SkeletonLine({ width = '100%', height = 13, style }) {
  return <div style={{ ...pulse, width, height, ...style }} />;
}

export function SkeletonFileRow() {
  return (
    <div className="file-row" style={{ cursor: 'default', pointerEvents: 'none' }}>
      <div className="file-name-cell">
        <div style={{ ...pulse, width: 32, height: 32, borderRadius: 8, flexShrink: 0 }} />
        <SkeletonLine width="55%" height={14} style={{ marginLeft: 4 }} />
      </div>
      <SkeletonLine width={40} height={12} />
      <SkeletonLine width={80} height={12} />
      <SkeletonLine width={70} height={12} />
    </div>
  );
}

export function SkeletonFileCard() {
  return (
    <div className="file-card" style={{ cursor: 'default', pointerEvents: 'none', display: 'flex', flexDirection: 'column', gap: 8, padding: 12 }}>
      <div style={{ ...pulse, width: 48, height: 48, borderRadius: 8, margin: '0 auto 4px' }} />
      <SkeletonLine width="80%" height={13} style={{ margin: '0 auto' }} />
      <SkeletonLine width="50%" height={11} style={{ margin: '0 auto' }} />
    </div>
  );
}
