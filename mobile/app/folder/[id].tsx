import { FileItem, useFiles } from '@/context/FileContext';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import {
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

export default function FolderScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const folderId = String(id);

  const { files, addFile, deleteFile } = useFiles();

  const folder = files.find((file) => file.id === folderId);
  const folderFiles = files.filter((file) => file.parentId === folderId);

  const getIcon = (type: string) => {
    if (type === 'folder') return 'folder';
    if (type === 'pdf') return 'document-text';
    if (type === 'image') return 'image';
    return 'document';
  };

  const uploadFile = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      copyToCacheDirectory: true,
    });

    if (result.canceled) return;

    const pickedFile = result.assets[0];

    addFile({
      name: pickedFile.name,
      type: 'file',
      size: pickedFile.size
        ? `${(pickedFile.size / 1024 / 1024).toFixed(1)} MB`
        : 'Taille inconnue',
      parentId: folderId,
    });
  };

  const showMenu = (item: FileItem) => {
    Alert.alert(item.name, 'Choisir une action', [
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: () => deleteFile(item),
      },
      {
        text: 'Annuler',
        style: 'cancel',
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back-circle" size={34} color="#2563eb" />
        </TouchableOpacity>

        <Text style={styles.title}>{folder?.name || 'Dossier'}</Text>

        <TouchableOpacity style={styles.addButton} onPress={uploadFile}>
          <Ionicons name="add" size={24} color="#ffffff" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={folderFiles}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text style={styles.empty}>Ce dossier est vide</Text>
        }
        renderItem={({ item }) => (
          <View style={styles.fileCard}>
            <View style={styles.iconBox}>
              <Ionicons
                name={getIcon(item.type) as any}
                size={26}
                color="#2563eb"
              />
            </View>

            <View style={styles.fileInfo}>
              <Text style={styles.fileName}>{item.name}</Text>
              <Text style={styles.fileMeta}>
                {item.size} • {item.date}
              </Text>
            </View>

            <TouchableOpacity onPress={() => showMenu(item)}>
              <Ionicons name="ellipsis-vertical" size={20} color="#6b7280" />
            </TouchableOpacity>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
    padding: 20,
  },
  header: {
    marginTop: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
  },
  addButton: {
    backgroundColor: '#2563eb',
    width: 42,
    height: 42,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  list: {
    marginTop: 24,
  },
  fileCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBox: {
    width: 46,
    height: 46,
    borderRadius: 12,
    backgroundColor: '#eff6ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  fileInfo: {
    flex: 1,
  },
  fileName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  fileMeta: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 4,
  },
  empty: {
    textAlign: 'center',
    marginTop: 80,
    color: '#6b7280',
  },
});