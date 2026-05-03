// Icônes centralisées depuis web/icone/ (copiées dans mobile/assets/icons/)
export const Icons = {
  folder:    require('./assets/icons/folder.svg'),
  image:     require('./assets/icons/image.svg'),
  audio:     require('./assets/icons/audio.svg'),
  video:     require('./assets/icons/video.svg'),
  pdf:       require('./assets/icons/pdf.svg'),
  text:      require('./assets/icons/text.svg'),
  other:     require('./assets/icons/other.svg'),
  google:    require('./assets/icons/google.svg'),
  logo:      require('./assets/icons/logo.svg'),
  logout:    require('./assets/icons/logout.svg'),
  moon:      require('./assets/icons/moon.svg'),
  sun:       require('./assets/icons/sun.svg'),
  settings:  require('./assets/icons/settings.svg'),
  shared:    require('./assets/icons/shared.svg'),
  trash:     require('./assets/icons/trash.svg'),
  dashboard: require('./assets/icons/dashboard.svg'),
  files:     require('./assets/icons/files.svg'),
};

export function getFileIcon(node: any) {
  if (node.type === 'folder') return Icons.folder;
  const m = node.mime_type || '';
  const n = node.name || '';
  if (m.startsWith('image/'))  return Icons.image;
  if (m.startsWith('video/'))  return Icons.video;
  if (m.startsWith('audio/'))  return Icons.audio;
  if (m === 'application/pdf') return Icons.pdf;
  if (m.startsWith('text/') || n.endsWith('.md') || n.endsWith('.csv')) return Icons.text;
  return Icons.other;
}
