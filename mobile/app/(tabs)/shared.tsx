import { shareService } from '../../constants/api';
import { useTheme } from '@/context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';

function fmt(bytes: any) {
  const n = Number(bytes);
  if (!n || n < 0) return '—';
  if (n < 1024)      return n + ' o';
  if (n < 1024 ** 2) return (n / 1024).toFixed(1) + ' Ko';
  if (n < 1024 ** 3) return (n / 1024 ** 2).toFixed(2) + ' Mo';
  return (n / 1024 ** 3).toFixed(2) + ' Go';
}

export default function SharedScreen() {
  const { colors } = useTheme();
  const [items,   setItems]   = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try { setItems(await shareService.getSharedWithMe()); } catch { setItems([]); }
    setLoading(false);
  };

  useFocusEffect(useCallback(() => { load(); }, []));

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg, padding: 16 }} edges={['top']}>
      <Text style={{ fontSize: 26, fontWeight: '700', color: colors.text, marginBottom: 16 }}>
        Partagés avec moi
      </Text>

      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={{ paddingBottom: 20 }}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.primary} />}
          ListEmptyComponent={
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 60, gap: 10 }}>
              <Ionicons name="share-social-outline" size={56} color={colors.border} />
              <Text style={{ fontSize: 14, color: colors.textMuted, textAlign: 'center' }}>
                Aucun fichier partagé avec vous
              </Text>
              <Text style={{ fontSize: 12, color: colors.textLight, textAlign: 'center', paddingHorizontal: 20 }}>
                Les fichiers que d'autres utilisateurs partagent avec vous apparaîtront ici.
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={{ backgroundColor: colors.card, padding: 14, borderRadius: 14, marginBottom: 10, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: colors.border }}>
              <View style={{ width: 46, height: 46, borderRadius: 12, backgroundColor: colors.primaryBg, justifyContent: 'center', alignItems: 'center', marginRight: 12 }}>
                <Ionicons name={item.type === 'folder' ? 'folder' : 'document'} size={26} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }} numberOfLines={1}>{item.name}</Text>
                <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 2 }}>
                  {fmt(item.size)} · Partagé par {item.owner_email}
                </Text>
              </View>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}