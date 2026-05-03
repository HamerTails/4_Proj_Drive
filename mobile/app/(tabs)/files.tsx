import { authService, fileService, searchService, API_URL } from '../../constants/api';
import { useTheme } from '@/context/ThemeContext';
import { getFileIcon } from '../../icons';
import { Ionicons } from '@expo/vector-icons';
import { Image as ExpoImage } from 'expo-image';
import * as DocumentPicker from 'expo-document-picker';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator, FlatList, Image, Linking, Modal,
  RefreshControl, ScrollView, SafeAreaView, Text, TextInput,
  TouchableOpacity, View, Pressable,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';

// ─── Helpers ──────────────────────────────────────────────────

function mimeColor(node: any, colors: any) {
  if (node.type === 'folder') return '#f59e0b';
  const m = node.mime_type || '';
  if (m.startsWith('image/'))  return '#3b82f6';
  if (m.startsWith('video/'))  return '#8b5cf6';
  if (m.startsWith('audio/'))  return '#ec4899';
  if (m === 'application/pdf') return '#ef4444';
  if (m.startsWith('text/'))   return '#10b981';
  return colors.textMuted;
}

function mimeIcon(node: any): any {
  if (node.type === 'folder') return 'folder';
  const m = node.mime_type || '';
  if (m.startsWith('image/'))  return 'image';
  if (m.startsWith('video/'))  return 'videocam';
  if (m.startsWith('audio/'))  return 'musical-notes';
  if (m === 'application/pdf') return 'document-text';
  if (m.startsWith('text/'))   return 'document';
  return 'document';
}

function fmt(b: number | null) {
  if (!b) return '—';
  if (b < 1024) return b + ' o';
  if (b < 1024 ** 2) return (b / 1024).toFixed(1) + ' Ko';
  return (b / 1024 ** 2).toFixed(1) + ' Mo';
}

function fmtDate(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
}

const isImage = (mime: string) => !!mime?.startsWith('image/');
const isText  = (mime: string, name: string) =>
  !!mime?.startsWith('text/') || name?.endsWith('.md') || name?.endsWith('.csv');

// ─── Composant Menu contextuel custom ─────────────────────────

function ContextMenu({
  visible, node, onClose, colors,
  onRename, onDelete, onDownload, onShare, onMove,
}: any) {
  if (!visible || !node) return null;

  const actions = [
    { icon: 'pencil',           label: 'Renommer',              onPress: onRename },
    { icon: 'move',             label: 'Déplacer',              onPress: onMove },
    { icon: 'download-outline', label: node?.type === 'folder' ? 'Télécharger ZIP' : 'Télécharger', onPress: onDownload },
    { icon: 'share-outline',    label: 'Partager',              onPress: onShare },
    { icon: 'trash-outline',    label: 'Supprimer',             onPress: onDelete, danger: true },
  ];

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }} onPress={onClose} />
      <View style={{
        backgroundColor: colors.card,
        borderTopLeftRadius: 20, borderTopRightRadius: 20,
        paddingBottom: 32, paddingTop: 8,
        borderTopWidth: 1, borderTopColor: colors.border,
      }}>
        {/* Poignée */}
        <View style={{ width: 40, height: 4, backgroundColor: colors.border, borderRadius: 2, alignSelf: 'center', marginBottom: 12 }} />

        {/* Titre */}
        <View style={{ paddingHorizontal: 20, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: colors.border }}>
          <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text }} numberOfLines={1}>{node?.name}</Text>
          <Text style={{ fontSize: 13, color: colors.textMuted, marginTop: 2 }}>
            {node?.type === 'folder' ? 'Dossier' : fmt(node?.size)}
          </Text>
        </View>

        {/* Actions */}
        {actions.map((action) => (
          <TouchableOpacity
            key={action.label}
            style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, gap: 14 }}
            onPress={() => { onClose(); setTimeout(() => action.onPress(), 100); }}
          >
            <Ionicons
              name={action.icon as any}
              size={22}
              color={action.danger ? colors.danger : colors.text}
            />
            <Text style={{ fontSize: 16, color: action.danger ? colors.danger : colors.text, fontWeight: '500' }}>
              {action.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </Modal>
  );
}

// ─── Composant sélecteur de dossier ───────────────────────────

function FolderPicker({ visible, onClose, onSelect, colors, excludeId }: any) {
  const [folders,  setFolders]  = useState<any[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [currentPicker, setCurrentPicker] = useState<string | null>(null);
  const [breadcrumb, setBreadcrumb] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    if (visible) { setCurrentPicker(null); setBreadcrumb([]); loadFolders(null); }
  }, [visible]);

  const loadFolders = async (parentId: string | null) => {
    setLoading(true);
    try {
      const data = await fileService.getNodes(parentId);
      setFolders((data || []).filter((n: any) => n.type === 'folder' && String(n.id) !== String(excludeId)));
    } catch {}
    setLoading(false);
  };

  const openPickerFolder = (folder: any) => {
    setBreadcrumb((p) => [...p, { id: String(folder.id), name: folder.name }]);
    setCurrentPicker(String(folder.id));
    loadFolders(String(folder.id));
  };

  const goBackPicker = () => {
    const next = breadcrumb.slice(0, -1);
    setBreadcrumb(next);
    const parentId = next.length > 0 ? next[next.length - 1].id : null;
    setCurrentPicker(parentId);
    loadFolders(parentId);
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: colors.headerBg, borderBottomWidth: 1, borderBottomColor: colors.border }}>
          {currentPicker ? (
            <TouchableOpacity onPress={goBackPicker} style={{ marginRight: 10 }}>
              <Ionicons name="arrow-back" size={22} color={colors.primary} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={onClose} style={{ marginRight: 10 }}>
              <Ionicons name="close" size={22} color={colors.text} />
            </TouchableOpacity>
          )}
          <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text, flex: 1 }}>
            {breadcrumb.length > 0 ? breadcrumb[breadcrumb.length - 1].name : 'Choisir un dossier'}
          </Text>
        </View>

        {/* Bouton Déplacer ici (racine ou dossier courant) */}
        <TouchableOpacity
          style={{ margin: 12, padding: 14, backgroundColor: colors.primary, borderRadius: 12, alignItems: 'center' }}
          onPress={() => onSelect(currentPicker)}
        >
          <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>
            Déplacer ici {currentPicker ? '(dans ' + (breadcrumb[breadcrumb.length - 1]?.name || '') + ')' : '(à la racine)'}
          </Text>
        </TouchableOpacity>

        {loading ? (
          <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
        ) : folders.length === 0 ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', gap: 10 }}>
            <Ionicons name="folder-open-outline" size={48} color={colors.border} />
            <Text style={{ color: colors.textMuted }}>Aucun sous-dossier</Text>
          </View>
        ) : (
          <FlatList
            data={folders}
            keyExtractor={(item) => String(item.id)}
            contentContainerStyle={{ padding: 12 }}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, padding: 14, borderRadius: 12, marginBottom: 8, borderWidth: 1, borderColor: colors.border }}
                onPress={() => openPickerFolder(item)}
              >
                <Ionicons name="folder" size={26} color="#f59e0b" style={{ marginRight: 12 }} />
                <Text style={{ fontSize: 15, color: colors.text, flex: 1 }}>{item.name}</Text>
                <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
              </TouchableOpacity>
            )}
          />
        )}
      </SafeAreaView>
    </Modal>
  );
}

// ─── Composant principal ───────────────────────────────────────

export default function FilesScreen() {
  const router = useRouter();
  const { colors } = useTheme();

  const [nodes,         setNodes]         = useState<any[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [uploading,     setUploading]     = useState(false);
  const [uploadPct,     setUploadPct]     = useState(0);
  const [currentFolder, setCurrentFolder] = useState<string | null>(null);
  const [breadcrumb,    setBreadcrumb]    = useState<{ id: string; name: string }[]>([]);
  const [viewMode,      setViewMode]      = useState<'list' | 'grid'>('list');

  // Menu contextuel
  const [menuNode,      setMenuNode]      = useState<any>(null);
  const [menuVisible,   setMenuVisible]   = useState(false);

  // Drag & drop par appui long
  const [dragNode,      setDragNode]      = useState<any>(null);

  // Modales
  const [showNewFolder,  setShowNewFolder]  = useState(false);
  const [newFolderName,  setNewFolderName]  = useState('');
  const [renameNode,     setRenameNode]     = useState<any>(null);
  const [renameName,     setRenameName]     = useState('');
  const [showMove,       setShowMove]       = useState(false);
  const [nodeToMove,     setNodeToMove]      = useState<any>(null);

  // Recherche
  const [searchMode,    setSearchMode]    = useState(false);
  const [searchQuery,   setSearchQuery]   = useState('');
  const [searchType,    setSearchType]    = useState('');
  const [searchDate,    setSearchDate]    = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching,     setSearching]     = useState(false);

  // Preview
  const [previewNode,  setPreviewNode]  = useState<any>(null);
  const [previewText,  setPreviewText]  = useState('');
  const [loadingText,  setLoadingText]  = useState(false);
  const [previewToken, setPreviewToken] = useState('');

  const searchTimer = useRef<any>(null);

  useEffect(() => {
    authService.getToken().then((t) => setPreviewToken(t || ''));
  }, []);

  useFocusEffect(useCallback(() => {
    if (!searchMode) loadNodes(currentFolder);
  }, [currentFolder, searchMode]));

  const loadNodes = async (parentId: string | null) => {
    setLoading(true);
    try {
      const data = await fileService.getNodes(parentId);
      setNodes(data || []);
    } catch {}
    setLoading(false);
  };

  // ─── Navigation ──────────────────────────────────────────────

  const openFolder = (node: any) => {
    // Si un fichier est en mode "drag", déplacer dans ce dossier
    if (dragNode) {
      setNodeToMove(dragNode);
      setDragNode(null);
      doMoveToFolder(dragNode, String(node.id));
      return;
    }
    setBreadcrumb((p) => [...p, { id: String(node.id), name: node.name }]);
    setCurrentFolder(String(node.id));
  };

  const doMoveToFolder = async (node: any, targetId: string) => {
    try {
      await fileService.moveNode(String(node.id), targetId);
      await loadNodes(currentFolder);
    } catch {}
  };

  const goBack = () => {
    const next = breadcrumb.slice(0, -1);
    setBreadcrumb(next);
    setCurrentFolder(next.length > 0 ? next[next.length - 1].id : null);
  };

  const goToRoot = () => { setBreadcrumb([]); setCurrentFolder(null); };

  const handleLogout = async () => {
    await authService.logout();
    router.replace('/');
  };

  // ─── Preview ─────────────────────────────────────────────────

  const openPreview = async (node: any) => {
    if (node.type === 'folder') { openFolder(node); return; }

    if (isImage(node.mime_type)) {
      const token = await authService.getToken();
      setPreviewToken(token || '');
      setPreviewNode(node);
      return;
    }

    if (isText(node.mime_type, node.name)) {
      setPreviewNode(node);
      setLoadingText(true);
      try {
        const token = await authService.getToken();
        const res   = await fetch(API_URL + '/api/files/' + node.id + '/preview?token=' + token);
        setPreviewText(await res.text());
      } catch { setPreviewText('Impossible de charger.'); }
      setLoadingText(false);
      return;
    }

    const token = await authService.getToken();
    Linking.openURL(API_URL + '/api/files/' + node.id + '/preview?token=' + token);
  };

  // ─── Téléchargement ──────────────────────────────────────────

  const download = async (node: any) => {
    const token = await authService.getToken();
    if (node.type === 'folder') {
      Linking.openURL(API_URL + '/api/files/folder/' + node.id + '/download?token=' + token);
    } else {
      Linking.openURL(API_URL + '/api/files/' + node.id + '/download?token=' + token);
    }
  };

  // ─── Upload ──────────────────────────────────────────────────

  const uploadFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true });
      if (result.canceled) return;
      const file = result.assets[0];
      setUploading(true);
      setUploadPct(0);
      await fileService.uploadFile(
        file.uri, file.name,
        file.mimeType || 'application/octet-stream',
        currentFolder,
        (pct) => setUploadPct(pct),
      );
      setUploadPct(100);
      await loadNodes(currentFolder);
    } catch (e: any) {
      console.error('Upload error:', e);
    } finally {
      setUploading(false);
      setUploadPct(0);
    }
  };

  // ─── CRUD ────────────────────────────────────────────────────

  const createFolder = async () => {
    if (!newFolderName.trim()) return;
    try {
      await fileService.createFolder(newFolderName.trim(), currentFolder);
      setShowNewFolder(false); setNewFolderName('');
      await loadNodes(currentFolder);
    } catch {}
  };

  const doRename = async () => {
    if (!renameNode || !renameName.trim()) return;
    try {
      await fileService.renameNode(String(renameNode.id), renameName.trim());
      setRenameNode(null); setRenameName('');
      await loadNodes(currentFolder);
    } catch {}
  };

  const deleteNode = async (node: any) => {
    try {
      await fileService.deleteNode(String(node.id));
      await loadNodes(currentFolder);
    } catch {}
  };

  const doMove = async (targetFolderId: string | null) => {
    if (!nodeToMove) return;
    try {
      await fileService.moveNode(String(nodeToMove.id), targetFolderId);
      setShowMove(false); setNodeToMove(null);
      await loadNodes(currentFolder);
    } catch {}
  };

  // ─── Menu contextuel ─────────────────────────────────────────

  const openMenu = (node: any) => {
    setMenuNode(node);
    setMenuVisible(true);
  };

  // ─── Recherche ───────────────────────────────────────────────

  const applyLocalFilter = (q: string, type: string, date: string) => {
    // Si pas de query ET pas de filtre, on retourne tout
    if (!q.trim() && !type && !date) return [...nodes];

    // Construire la source : si query, filtrer par nom ; sinon tous les nodes
    const source = q.trim() ? nodes.filter((n) => {
      const nameQ = q.trim().toLowerCase();
      return q.startsWith('.')
        ? n.name.toLowerCase().endsWith(nameQ)
        : n.name.toLowerCase().includes(nameQ);
    }) : [...nodes];

    return source.filter((n) => {
      if (type) {
        const m = n.mime_type || '';
        if (type === 'image'    && !m.startsWith('image/'))  return false;
        if (type === 'video'    && !m.startsWith('video/'))  return false;
        if (type === 'audio'    && !m.startsWith('audio/'))  return false;
        if (type === 'pdf'      && m !== 'application/pdf')  return false;
        if (type === 'text'     && !m.startsWith('text/'))   return false;
        if (type === 'document' && !(
          m === 'application/pdf' || m.startsWith('text/') ||
          m.includes('wordprocessing') || m.includes('spreadsheet') || m.includes('msword')
        )) return false;
      }
      if (date && n.created_at) {
        const created = new Date(n.created_at);
        const now     = new Date();
        if (date === 'today' && created.toDateString() !== now.toDateString()) return false;
        if (date === 'week'  && created < new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)) return false;
        if (date === 'month' && (created.getMonth() !== now.getMonth() || created.getFullYear() !== now.getFullYear())) return false;
      }
      return true;
    });
  };

  const doApiSearch = (q: string, type: string, date: string) => {
    if (!q.trim()) return; // API nécessite un terme de recherche
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(async () => {
      setSearching(true);
      try {
        const query = q.startsWith('.') ? q.slice(1) : q;
        const results = await searchService.search(query, type || undefined, date || undefined);
        setSearchResults(results);
      } catch {}
      setSearching(false);
    }, 400);
  };

  const onSearchChange = (text: string) => {
    setSearchQuery(text);
    const filtered = applyLocalFilter(text, searchType, searchDate);
    setSearchResults(filtered);
    doApiSearch(text, searchType, searchDate);
  };

  const onFilterChange = (type: string, date: string) => {
    setSearchType(type);
    setSearchDate(date);
    // Filtre local immédiat — fonctionne avec ou sans texte
    setSearchResults(applyLocalFilter(searchQuery, type, date));
    // API search seulement si un terme est tapé
    doApiSearch(searchQuery, type, date);
  };

  const exitSearch = () => {
    clearTimeout(searchTimer.current);
    setSearchMode(false); setSearchQuery('');
    setSearchType(''); setSearchDate(''); setSearchResults([]);
  };

  const displayNodes = searchMode ? searchResults : nodes;

  // ─── Render items ─────────────────────────────────────────────

  const renderRow = ({ item }: { item: any }) => {
    const isDragging = dragNode?.id === item.id;
    const isDropTarget = dragNode && item.type === 'folder' && dragNode.id !== item.id;

    return (
      <TouchableOpacity
        style={{
          flexDirection: 'row', alignItems: 'center',
          backgroundColor: isDragging ? colors.primary + '33' : isDropTarget ? colors.primary + '22' : colors.card,
          paddingHorizontal: 16, paddingVertical: 14,
          marginHorizontal: 12, marginVertical: 4,
          borderRadius: 12,
          borderWidth: isDragging ? 2 : isDropTarget ? 2 : 1,
          borderColor: isDragging ? colors.primary : isDropTarget ? colors.primary : colors.border,
          opacity: isDragging ? 0.7 : 1,
        }}
        onPress={() => {
          if (dragNode) {
            if (item.type === 'folder' && item.id !== dragNode.id) {
              doMoveToFolder(dragNode, String(item.id));
              setDragNode(null);
            } else if (item.id === dragNode.id) {
              setDragNode(null); // désélectionner
            }
            return;
          }
          openPreview(item);
        }}
        onLongPress={() => {
          if (item.type === 'file') setDragNode(item);
        }}
        activeOpacity={0.7}
      >
        <View style={{ width: 44, alignItems: 'center' }}>
          <ExpoImage source={getFileIcon(item)} style={{ width: 32, height: 32 }} contentFit="contain" />
        </View>
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: 2 }} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={{ fontSize: 12, color: colors.textMuted }}>
            {item.type === 'folder' ? (isDropTarget ? '👆 Déposer ici' : 'Dossier') : fmt(item.size)} · {fmtDate(item.created_at)}
          </Text>
        </View>
        {!dragNode && (
          <TouchableOpacity
            onPress={() => openMenu(item)}
            style={{ padding: 8, marginLeft: 4 }}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="ellipsis-vertical" size={20} color={colors.text} />
          </TouchableOpacity>
        )}
        {isDragging && (
          <Ionicons name="move" size={20} color={colors.primary} style={{ marginLeft: 8 }} />
        )}
      </TouchableOpacity>
    );
  };

  const renderGrid = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={{ flex: 1, margin: 6, backgroundColor: colors.card, borderRadius: 14, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: colors.border, minHeight: 110 }}
      onPress={() => openPreview(item)}
      activeOpacity={0.7}
    >
      {isImage(item.mime_type) ? (
        <Image
          source={{ uri: API_URL + '/api/files/' + item.id + '/preview?token=' + previewToken }}
          style={{ width: 56, height: 56, borderRadius: 8, marginBottom: 8 }}
          resizeMode="cover"
        />
      ) : (
        <View style={{ width: 56, height: 56, borderRadius: 12, backgroundColor: colors.border, justifyContent: 'center', alignItems: 'center', marginBottom: 8 }}>
          <ExpoImage source={getFileIcon(item)} style={{ width: 36, height: 36 }} contentFit="contain" />
        </View>
      )}
      <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text, textAlign: 'center', marginBottom: 2 }} numberOfLines={2}>{item.name}</Text>
      <Text style={{ fontSize: 11, color: colors.textMuted }}>{item.type === 'folder' ? 'Dossier' : fmt(item.size)}</Text>
      <TouchableOpacity
        onPress={() => openMenu(item)}
        style={{ position: 'absolute', top: 6, right: 6, padding: 6 }}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Ionicons name="ellipsis-vertical" size={18} color={colors.text} />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>

      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, backgroundColor: colors.headerBg, borderBottomWidth: 1, borderBottomColor: colors.border }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, gap: 10 }}>
          {(currentFolder || searchMode) ? (
            <TouchableOpacity onPress={searchMode ? exitSearch : goBack}>
              <Ionicons name="arrow-back" size={22} color={colors.primary} />
            </TouchableOpacity>
          ) : (
            <ExpoImage
              source={require('../../assets/icons/logo.svg')}
              style={{ width: 28, height: 28 }}
              contentFit="contain"
            />
          )}
          <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text, flex: 1 }} numberOfLines={1}>
            {searchMode ? 'Recherche' : breadcrumb.length > 0 ? breadcrumb[breadcrumb.length - 1].name : 'SUPFile'}
          </Text>
        </View>
        <TouchableOpacity onPress={() => {
          setSearchMode(true);
          setSearchResults([...nodes]); // afficher tous les fichiers par défaut
        }} style={{ marginRight: 12 }}>
          <Ionicons name="search" size={22} color={colors.text} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setViewMode(v => v === 'list' ? 'grid' : 'list')} style={{ marginRight: 12 }}>
          <Ionicons name={viewMode === 'list' ? 'grid' : 'list'} size={22} color={colors.text} />
        </TouchableOpacity>
        <TouchableOpacity onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={22} color={colors.danger} />
        </TouchableOpacity>
      </View>

      {/* Barre de recherche */}
      {searchMode && (
        <View style={{ backgroundColor: colors.headerBg, paddingHorizontal: 12, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: colors.border }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: 10, paddingBottom: 8 }}>
            <TextInput
              style={{ flex: 1, backgroundColor: colors.inputBg, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: colors.text, borderWidth: 1, borderColor: colors.border }}
              placeholder="Nom ou extension (.pdf, .docx...)"
              placeholderTextColor={colors.textLight}
              value={searchQuery}
              onChangeText={onSearchChange}
              autoFocus
            />
            {searching && <ActivityIndicator size="small" color={colors.primary} />}
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 6 }}>
            {['', 'image', 'video', 'audio', 'pdf', 'text', 'document'].map((t) => (
              <TouchableOpacity
                key={t}
                style={{ paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: searchType === t ? colors.primary : colors.inputBg, marginRight: 8, borderWidth: 1, borderColor: searchType === t ? colors.primary : colors.border }}
                onPress={() => onFilterChange(t, searchDate)}
              >
                <Text style={{ fontSize: 13, color: searchType === t ? '#fff' : colors.text }}>
                  {t === '' ? 'Tous' : t.charAt(0).toUpperCase() + t.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {[{ val: '', label: 'Toutes dates' }, { val: 'today', label: "Aujourd'hui" }, { val: 'week', label: 'Cette semaine' }, { val: 'month', label: 'Ce mois' }].map((d) => (
              <TouchableOpacity
                key={d.val}
                style={{ paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: searchDate === d.val ? colors.primary : colors.inputBg, marginRight: 8, borderWidth: 1, borderColor: searchDate === d.val ? colors.primary : colors.border }}
                onPress={() => onFilterChange(searchType, d.val)}
              >
                <Text style={{ fontSize: 13, color: searchDate === d.val ? '#fff' : colors.text }}>{d.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Breadcrumb */}
      {!searchMode && breadcrumb.length > 0 && (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, paddingVertical: 8, backgroundColor: colors.headerBg, borderBottomWidth: 1, borderBottomColor: colors.border }}>
          <TouchableOpacity onPress={goToRoot}>
            <Text style={{ color: colors.primary, fontSize: 13 }}>Racine</Text>
          </TouchableOpacity>
          {breadcrumb.map((c, i) => (
            <View key={c.id} style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={{ color: colors.textMuted, fontSize: 13 }}> / </Text>
              <Text style={{ fontSize: 13, color: i === breadcrumb.length - 1 ? colors.text : colors.primary, fontWeight: i === breadcrumb.length - 1 ? '700' : '400' }}>
                {c.name}
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* Actions */}
      {!searchMode && (
        <View style={{ flexDirection: 'row', gap: 10, padding: 12, backgroundColor: colors.headerBg, borderBottomWidth: 1, borderBottomColor: colors.border }}>
          <TouchableOpacity
            style={{ flex: 1, borderRadius: 12, overflow: 'hidden', backgroundColor: colors.primary }}
            onPress={uploadFile}
            disabled={uploading}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 12 }}>
              {uploading
                ? <ActivityIndicator size="small" color="#fff" />
                : <Ionicons name="cloud-upload-outline" size={18} color="#fff" />
              }
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>
                {uploading ? (uploadPct > 0 ? uploadPct + '%' : 'Upload...') : 'Uploader'}
              </Text>
            </View>
            {uploading && uploadPct > 0 && (
              <View style={{ position: 'absolute', bottom: 0, left: 0, height: 3, width: (uploadPct + '%') as any, backgroundColor: '#93c5fd' }} />
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 12, borderRadius: 12, backgroundColor: colors.primaryBg, borderWidth: 1, borderColor: colors.primary }}
            onPress={() => setShowNewFolder(true)}
          >
            <Ionicons name="folder-open-outline" size={18} color={colors.primary} />
            <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 14 }}>Nouveau dossier</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Bannière mode déplacement */}
      {dragNode && (
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.primary, paddingHorizontal: 16, paddingVertical: 10 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Ionicons name="move" size={18} color="#fff" />
            <Text style={{ color: '#fff', fontWeight: '600', fontSize: 14 }} numberOfLines={1}>
              Déplacer : {dragNode.name}
            </Text>
          </View>
          <TouchableOpacity onPress={() => setDragNode(null)}>
            <Ionicons name="close-circle" size={22} color="#fff" />
          </TouchableOpacity>
        </View>
      )}

      {/* Badge résultats */}
      {searchMode && searchResults.length > 0 && (
        <View style={{ paddingHorizontal: 16, paddingVertical: 6 }}>
          <Text style={{ fontSize: 12, color: colors.textMuted }}>
            {searchResults.length} résultat{searchResults.length > 1 ? 's' : ''}
          </Text>
        </View>
      )}

      {/* Liste / Grille */}
      {loading && !searchMode ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : displayNodes.length === 0 ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', gap: 10 }}>
          <Ionicons name={searchMode ? 'search-outline' : 'folder-open-outline'} size={56} color={colors.border} />
          <Text style={{ fontSize: 15, color: colors.textMuted }}>
            {searchMode ? (searchQuery ? 'Aucun résultat' : 'Tapez pour rechercher') : 'Dossier vide'}
          </Text>
        </View>
      ) : viewMode === 'list' ? (
        <FlatList
          key="list"
          data={displayNodes}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderRow}
          contentContainerStyle={{ paddingVertical: 8 }}
          refreshControl={!searchMode ? <RefreshControl refreshing={loading} onRefresh={() => loadNodes(currentFolder)} tintColor={colors.primary} /> : undefined}
        />
      ) : (
        <FlatList
          key="grid"
          data={displayNodes}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderGrid}
          numColumns={2}
          contentContainerStyle={{ padding: 6 }}
          refreshControl={!searchMode ? <RefreshControl refreshing={loading} onRefresh={() => loadNodes(currentFolder)} tintColor={colors.primary} /> : undefined}
        />
      )}

      {/* ── Menu contextuel custom ── */}
      <ContextMenu
        visible={menuVisible}
        node={menuNode}
        colors={colors}
        onClose={() => setMenuVisible(false)}
        onRename={() => { setRenameNode(menuNode); setRenameName(menuNode?.name || ''); }}
        onDelete={() => { if (menuNode) deleteNode(menuNode); }}
        onDownload={() => { if (menuNode) download(menuNode); }}
        onShare={() => { if (menuNode) router.push({ pathname: '/share', params: { id: String(menuNode.id), name: menuNode.name } }); }}
        onMove={() => { setNodeToMove(menuNode); setShowMove(true); }}
      />

      {/* ── Sélecteur de dossier pour déplacement ── */}
      <FolderPicker
        visible={showMove}
        onClose={() => { setShowMove(false); setNodeToMove(null); }}
        onSelect={doMove}
        colors={colors}
        excludeId={nodeToMove?.id}
      />

      {/* ── Modal preview image ── */}
      <Modal visible={!!previewNode && isImage(previewNode?.mime_type)} transparent animationType="fade">
        <Pressable
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'center', alignItems: 'center' }}
          onPress={() => setPreviewNode(null)}
        >
          <Pressable onPress={(e) => e.stopPropagation()}>
            {previewNode && (
              <Image
                source={{ uri: API_URL + '/api/files/' + previewNode.id + '/preview?token=' + previewToken }}
                style={{ width: 350, height: 350 }}
                resizeMode="contain"
              />
            )}
          </Pressable>
          <Text style={{ color: '#aaa', fontSize: 13, marginTop: 12, textAlign: 'center', paddingHorizontal: 20 }}>
            {previewNode?.name}
          </Text>
          <Text style={{ color: '#555', fontSize: 12, marginTop: 6 }}>
            Appuyez n'importe où pour fermer
          </Text>
        </Pressable>
      </Modal>

      {/* ── Modal preview texte ── */}
      <Modal visible={!!previewNode && !isImage(previewNode?.mime_type) && isText(previewNode?.mime_type, previewNode?.name)} animationType="slide">
        <View style={{ flex: 1, backgroundColor: colors.bg }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, backgroundColor: colors.headerBg, borderBottomWidth: 1, borderBottomColor: colors.border }}>
            <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text, flex: 1, marginRight: 12 }} numberOfLines={1}>{previewNode?.name}</Text>
            <Pressable onPress={() => { setPreviewNode(null); setPreviewText(''); }}>
              <Ionicons name="close-circle" size={28} color={colors.text} />
            </Pressable>
          </View>
          {loadingText ? (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          ) : (
            <ScrollView contentContainerStyle={{ padding: 16 }}>
              <Text style={{ fontSize: 14, color: colors.text, lineHeight: 22, fontFamily: 'monospace' }}>{previewText}</Text>
            </ScrollView>
          )}
        </View>
      </Modal>

      {/* ── Modal nouveau dossier ── */}
      <Modal visible={showNewFolder} transparent animationType="fade">
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }} onPress={() => { setShowNewFolder(false); setNewFolderName(''); }}>
          <Pressable style={{ backgroundColor: colors.card, borderRadius: 16, padding: 24, width: '85%' }} onPress={() => {}}>
            <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: 16 }}>Nouveau dossier</Text>
            <TextInput
              style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 12, fontSize: 15, marginBottom: 20, color: colors.text, backgroundColor: colors.inputBg }}
              placeholder="Nom du dossier"
              placeholderTextColor={colors.textLight}
              value={newFolderName}
              onChangeText={setNewFolderName}
              autoFocus
            />
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity style={{ flex: 1, padding: 12, borderRadius: 10, backgroundColor: colors.inputBg, alignItems: 'center' }} onPress={() => { setShowNewFolder(false); setNewFolderName(''); }}>
                <Text style={{ color: colors.text, fontWeight: '600' }}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity style={{ flex: 1, padding: 12, borderRadius: 10, backgroundColor: colors.primary, alignItems: 'center' }} onPress={createFolder}>
                <Text style={{ color: '#fff', fontWeight: '600' }}>Créer</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ── Modal renommer ── */}
      <Modal visible={!!renameNode} transparent animationType="fade">
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }} onPress={() => { setRenameNode(null); setRenameName(''); }}>
          <Pressable style={{ backgroundColor: colors.card, borderRadius: 16, padding: 24, width: '85%' }} onPress={() => {}}>
            <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: 16 }}>Renommer</Text>
            <TextInput
              style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 12, fontSize: 15, marginBottom: 20, color: colors.text, backgroundColor: colors.inputBg }}
              value={renameName}
              onChangeText={setRenameName}
              autoFocus
            />
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity style={{ flex: 1, padding: 12, borderRadius: 10, backgroundColor: colors.inputBg, alignItems: 'center' }} onPress={() => { setRenameNode(null); setRenameName(''); }}>
                <Text style={{ color: colors.text, fontWeight: '600' }}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity style={{ flex: 1, padding: 12, borderRadius: 10, backgroundColor: colors.primary, alignItems: 'center' }} onPress={doRename}>
                <Text style={{ color: '#fff', fontWeight: '600' }}>Renommer</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

    </View>
  );
}