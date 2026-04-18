import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { authService, fileService } from '../../constants/api';

function FileIcon({ node }: { node: any }) {
  if (node.type === 'folder') {
    return <Ionicons name="folder" size={32} color="#f59e0b" />;
  }
  const mime = node.mime_type || '';
  if (mime.startsWith('image/'))       return <Ionicons name="image" size={32} color="#3b82f6" />;
  if (mime.startsWith('video/'))       return <Ionicons name="videocam" size={32} color="#8b5cf6" />;
  if (mime.startsWith('audio/'))       return <Ionicons name="musical-notes" size={32} color="#ec4899" />;
  if (mime === 'application/pdf')      return <Ionicons name="document-text" size={32} color="#ef4444" />;
  return <Ionicons name="document" size={32} color="#6b7280" />;
}

function formatSize(bytes: number | null) {
  if (!bytes) return '—';
  if (bytes < 1024)        return bytes + ' o';
  if (bytes < 1024 ** 2)   return (bytes / 1024).toFixed(1) + ' Ko';
  return (bytes / 1024 ** 2).toFixed(1) + ' Mo';
}

function formatDate(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('fr-FR', {
    day:   '2-digit',
    month: 'short',
    year:  'numeric',
  });
}

export default function FilesScreen() {
  const [nodes,       setNodes]       = useState<any[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [currentFolder, setCurrentFolder] = useState<string | null>(null);
  const [breadcrumb,  setBreadcrumb]  = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    loadNodes(currentFolder);
  }, [currentFolder]);

  const loadNodes = async (parentId: string | null) => {
    setLoading(true);
    try {
      const data = await fileService.getNodes(parentId);
      setNodes(data || []);
    } catch (err: any) {
      Alert.alert('Erreur', 'Impossible de charger les fichiers.');
    } finally {
      setLoading(false);
    }
  };

  const openFolder = (node: any) => {
    setBreadcrumb((prev) => [...prev, { id: node.id, name: node.name }]);
    setCurrentFolder(node.id);
  };

  const goBack = () => {
    const newBreadcrumb = breadcrumb.slice(0, -1);
    setBreadcrumb(newBreadcrumb);
    setCurrentFolder(newBreadcrumb.length > 0 ? newBreadcrumb[newBreadcrumb.length - 1].id : null);
  };

  const goToRoot = () => {
    setBreadcrumb([]);
    setCurrentFolder(null);
  };

  const handleLogout = async () => {
    await authService.logout();
    goToRoot();
  };

  const renderItem = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={styles.row}
      onPress={() => item.type === 'folder' ? openFolder(item) : null}
      activeOpacity={item.type === 'folder' ? 0.6 : 1}
    >
      <View style={styles.iconWrap}>
        <FileIcon node={item} />
      </View>
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
        <Text style={styles.meta}>
          {item.type === 'folder' ? 'Dossier' : formatSize(item.size)} · {formatDate(item.created_at)}
        </Text>
      </View>
      {item.type === 'folder' && (
        <Ionicons name="chevron-forward" size={18} color="#9ca3af" />
      )}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          {currentFolder ? (
            <TouchableOpacity onPress={goBack} style={styles.backBtn}>
              <Ionicons name="arrow-back" size={22} color="#2563eb" />
            </TouchableOpacity>
          ) : null}
          <Text style={styles.title} numberOfLines={1}>
            {breadcrumb.length > 0 ? breadcrumb[breadcrumb.length - 1].name : 'Mes fichiers'}
          </Text>
        </View>
        <TouchableOpacity onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={22} color="#ef4444" />
        </TouchableOpacity>
      </View>

      {/* Breadcrumb */}
      {breadcrumb.length > 0 && (
        <View style={styles.breadcrumb}>
          <TouchableOpacity onPress={goToRoot}>
            <Text style={styles.breadcrumbLink}>Racine</Text>
          </TouchableOpacity>
          {breadcrumb.map((crumb, i) => (
            <View key={crumb.id} style={styles.breadcrumbItem}>
              <Text style={styles.breadcrumbSep}> / </Text>
              <Text style={[
                styles.breadcrumbLink,
                i === breadcrumb.length - 1 && styles.breadcrumbCurrent,
              ]}>
                {crumb.name}
              </Text>
            </View>
          ))}
        </View>
      )}

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#2563eb" />
        </View>
      ) : nodes.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="folder-open-outline" size={56} color="#d1d5db" />
          <Text style={styles.emptyText}>Dossier vide</Text>
        </View>
      ) : (
        <FlatList
          data={nodes}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshing={loading}
          onRefresh={() => loadNodes(currentFolder)}
        />
      )}

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: '#f9fafb' },
  header: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'space-between',
    padding:        16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerLeft:  { flexDirection: 'row', alignItems: 'center', flex: 1 },
  backBtn:     { marginRight: 8 },
  title: {
    fontSize:   18,
    fontWeight: '700',
    color:      '#111827',
    flex:       1,
  },
  breadcrumb: {
    flexDirection:   'row',
    flexWrap:        'wrap',
    paddingHorizontal: 16,
    paddingVertical:   8,
    backgroundColor:   '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  breadcrumbItem:   { flexDirection: 'row', alignItems: 'center' },
  breadcrumbSep:    { color: '#9ca3af', fontSize: 12 },
  breadcrumbLink:   { color: '#2563eb', fontSize: 12 },
  breadcrumbCurrent: { color: '#374151', fontWeight: '600' },
  list:        { paddingVertical: 8 },
  row: {
    flexDirection:   'row',
    alignItems:      'center',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical:   12,
    marginHorizontal:  12,
    marginVertical:    4,
    borderRadius:      10,
    shadowColor:       '#000',
    shadowOpacity:     0.04,
    shadowRadius:      4,
    elevation:         1,
  },
  iconWrap:    { width: 44, alignItems: 'center' },
  info:        { flex: 1, marginLeft: 10 },
  name: {
    fontSize:   14,
    fontWeight: '600',
    color:      '#111827',
    marginBottom: 2,
  },
  meta:        { fontSize: 12, color: '#6b7280' },
  center: {
    flex:           1,
    justifyContent: 'center',
    alignItems:     'center',
    gap:            12,
  },
  emptyText:   { fontSize: 14, color: '#9ca3af', marginTop: 8 },
});
