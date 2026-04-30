import { useFiles } from '@/context/FileContext';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Alert, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function TrashScreen() {
  const { trash, restoreFile, deleteForever } = useFiles();

  const confirmDeleteForever = (id: string) => {
    Alert.alert('Suppression définitive', 'Supprimer définitivement ce fichier ?', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Supprimer', style: 'destructive', onPress: () => deleteForever(id) },
    ]);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Corbeille</Text>
      <Text style={styles.subtitle}>Fichiers supprimés récemment</Text>

      <FlatList
        data={trash}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<Text style={styles.empty}>La corbeille est vide</Text>}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.iconBox}>
              <Ionicons name="trash-outline" size={24} color="#dc2626" />
            </View>

            <View style={styles.info}>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.meta}>{item.size} • {item.date}</Text>
            </View>

            <View style={styles.actions}>
              <TouchableOpacity onPress={() => restoreFile(item)}>
                <Ionicons name="refresh" size={23} color="#16a34a" />
              </TouchableOpacity>

              <TouchableOpacity onPress={() => confirmDeleteForever(item.id)}>
                <Ionicons name="close-circle" size={23} color="#dc2626" />
              </TouchableOpacity>
            </View>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#f3f4f6' },
  title: { marginTop: 40, fontSize: 28, fontWeight: '700', color: '#111827' },
  subtitle: { marginTop: 6, color: '#6b7280' },
  list: { marginTop: 20 },
  card: {
    backgroundColor: '#fff',
    padding: 14,
    borderRadius: 14,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBox: {
    width: 46,
    height: 46,
    borderRadius: 12,
    backgroundColor: '#fee2e2',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  info: { flex: 1 },
  name: { fontSize: 16, fontWeight: '600' },
  meta: { fontSize: 13, color: '#6b7280', marginTop: 4 },
  actions: { flexDirection: 'row', gap: 12 },
  empty: { textAlign: 'center', marginTop: 60, color: '#6b7280' },
});