import { trashService } from '../../constants/api';
import { useTheme } from '@/context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Modal, Platform, Pressable, RefreshControl, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

function fmt(bytes: number | null) {
  if (!bytes) return '—';
  if (bytes < 1024) return bytes + ' o';
  if (bytes < 1024 ** 2) return (bytes / 1024).toFixed(1) + ' Ko';
  return (bytes / 1024 ** 2).toFixed(1) + ' Mo';
}

function fmtDate(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function TrashScreen() {
  const { colors } = useTheme();
  const [items,    setItems]    = useState<any[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [confirmDelete, setConfirmDelete] = useState<any>(null);

  const load = async () => {
    setLoading(true);
    try { setItems(await trashService.getTrash()); } catch {}
    setLoading(false);
  };

  useFocusEffect(useCallback(() => { load(); }, []));

  const restore = async (id: string) => {
    try {
      await trashService.restore(id);
      await load();
    } catch { Alert.alert('Erreur', 'Impossible de restaurer.'); }
  };

  const doDeleteForever = async () => {
    if (!confirmDelete) return;
    try {
      await trashService.deletePermanent(String(confirmDelete.id));
      setConfirmDelete(null);
      await load();
    } catch {
      setConfirmDelete(null);
      Alert.alert('Erreur', 'Impossible de supprimer.');
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, padding: 16 }}>
      <Text style={{ marginTop: 40, fontSize: 26, fontWeight: '700', color: colors.text }}>Corbeille</Text>
      <Text style={{ color: colors.textMuted, fontSize: 13, marginTop: 4, marginBottom: 16 }}>
        Suppression automatique après 30 jours
      </Text>

      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={colors.danger} />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={{ paddingBottom: 20 }}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.primary} />}
          ListEmptyComponent={
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 60, gap: 10 }}>
              <Ionicons name="trash-outline" size={56} color={colors.border} />
              <Text style={{ fontSize: 14, color: colors.textMuted }}>La corbeille est vide</Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={{ backgroundColor: colors.card, padding: 14, borderRadius: 14, marginBottom: 10, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: colors.border }}>
              <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: colors.danger + '20', justifyContent: 'center', alignItems: 'center', marginRight: 12 }}>
                <Ionicons name={item.type === 'folder' ? 'folder' : 'document'} size={24} color={colors.danger} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }} numberOfLines={1}>{item.name}</Text>
                <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 2 }}>
                  {fmt(item.size)} · Supprimé le {fmtDate(item.trashed_at)}
                </Text>
              </View>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TouchableOpacity onPress={() => restore(String(item.id))} style={{ padding: 6 }}>
                  <Ionicons name="refresh" size={22} color={colors.success} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setConfirmDelete(item)} style={{ padding: 6 }}>
                  <Ionicons name="close-circle" size={22} color={colors.danger} />
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      )}

      {/* Modal confirmation suppression définitive */}
      <Modal visible={!!confirmDelete} transparent animationType="fade" onRequestClose={() => setConfirmDelete(null)}>
        <Pressable
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }}
          onPress={() => setConfirmDelete(null)}
        >
          <Pressable style={{ backgroundColor: colors.card, borderRadius: 16, padding: 24, width: '85%', maxWidth: 400 }} onPress={() => {}}>
            <View style={{ alignItems: 'center', marginBottom: 16 }}>
              <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: colors.danger + '20', justifyContent: 'center', alignItems: 'center', marginBottom: 12 }}>
                <Ionicons name="trash" size={30} color={colors.danger} />
              </View>
              <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text, textAlign: 'center' }}>
                Supprimer définitivement ?
              </Text>
              <Text style={{ fontSize: 14, color: colors.textMuted, textAlign: 'center', marginTop: 8 }} numberOfLines={2}>
                "{confirmDelete?.name}" sera perdu pour toujours.
              </Text>
            </View>

            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity
                style={{ flex: 1, padding: 12, borderRadius: 10, backgroundColor: colors.inputBg, alignItems: 'center', borderWidth: 1, borderColor: colors.border }}
                onPress={() => setConfirmDelete(null)}
              >
                <Text style={{ color: colors.text, fontWeight: '600' }}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{ flex: 1, padding: 12, borderRadius: 10, backgroundColor: colors.danger, alignItems: 'center' }}
                onPress={doDeleteForever}
              >
                <Text style={{ color: '#fff', fontWeight: '700' }}>Supprimer</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}