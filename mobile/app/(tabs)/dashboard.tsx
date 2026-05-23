import { storageService } from '../../constants/api';
import { useTheme } from '@/context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { useCallback, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';

const DEFAULT_QUOTA = 30 * 1024 ** 3;

function fmt(b: any) {
  const n = Number(b);
  if (!n || n < 0) return '0 o';
  if (n < 1024)      return n + ' o';
  if (n < 1024 ** 2) return (n / 1024).toFixed(1) + ' Ko';
  if (n < 1024 ** 3) return (n / 1024 ** 2).toFixed(2) + ' Mo';
  return (n / 1024 ** 3).toFixed(2) + ' Go';
}

function fmtDate(iso: string) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function DashboardScreen() {
  const { colors } = useTheme();
  const [usage,   setUsage]   = useState<any>(null);
  const [recent,  setRecent]  = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const [u, r] = await Promise.allSettled([storageService.getUsage(), storageService.getRecent()]);
      if (u.status === 'fulfilled') setUsage(u.value);
      if (r.status === 'fulfilled') setRecent(r.value || []);
    } catch {}
    setLoading(false);
  };

  useFocusEffect(useCallback(() => { load(); }, []));

  const used  = usage?.storage_used || 0;
  const quota = usage?.total || DEFAULT_QUOTA;
  const pct   = Math.min((used / quota) * 100, 100);
  const gauge = pct > 90 ? colors.danger : pct > 70 ? '#f59e0b' : colors.primary;

  if (loading) return (
    <SafeAreaView style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bg }} edges={['top']}>
      <ActivityIndicator size="large" color={colors.primary} />
    </SafeAreaView>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg, padding: 16 }}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.primary} />}
    >
      <Text style={{ fontSize: 26, fontWeight: '700', color: colors.text, marginBottom: 16 }}>
        Tableau de bord
      </Text>

      {/* Carte stockage avec camembert */}
      <View style={{ backgroundColor: colors.card, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: colors.border }}>
        <Text style={{ color: colors.textMuted, fontSize: 13, marginBottom: 12 }}>Stockage utilisé</Text>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 20 }}>
          {/* Camembert : disque coloré + disque intérieur pour faire un anneau */}
          <View style={{
            width: 110, height: 110, borderRadius: 55,
            justifyContent: 'center', alignItems: 'center',
            backgroundColor: colors.border,
            backgroundImage: ('conic-gradient(' + gauge + ' 0% ' + pct + '%, ' + colors.border + ' ' + pct + '% 100%)') as any,
          }}>
            {/* Trou central */}
            <View style={{
              width: 78, height: 78, borderRadius: 39,
              backgroundColor: colors.card,
              justifyContent: 'center', alignItems: 'center',
            }}>
              <Text style={{ fontSize: 20, fontWeight: '700', color: colors.text }}>
                {pct.toFixed(0)}%
              </Text>
            </View>
          </View>

          {/* Infos à droite */}
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 22, fontWeight: '700', color: colors.text }}>{fmt(used)}</Text>
            <Text style={{ color: colors.textMuted, fontSize: 12, marginBottom: 8 }}>sur {usage?.total_readable || fmt(quota)}</Text>
            <Text style={{ fontSize: 12, color: gauge, fontWeight: '600' }}>
              {fmt(quota - used)} disponible
            </Text>
          </View>
        </View>

        {/* Barre de progression en backup pour mobile (conic-gradient marche pas en natif) */}
        <View style={{ height: 6, backgroundColor: colors.border, borderRadius: 20, overflow: 'hidden', marginTop: 14 }}>
          <View style={{ height: 6, width: (pct + '%') as any, backgroundColor: gauge, borderRadius: 20 }} />
        </View>
      </View>

      {/* Compteurs */}
      <View style={{ flexDirection: 'row', gap: 12, marginBottom: 12 }}>
        {[
          { label: 'Fichiers',  value: usage?.file_count   ?? '—', icon: 'document',  color: colors.primary },
          { label: 'Dossiers',  value: usage?.folder_count ?? '—', icon: 'folder',     color: '#f59e0b' },
        ].map((item) => (
          <View key={item.label} style={{ flex: 1, backgroundColor: colors.card, borderRadius: 16, padding: 16, alignItems: 'center', gap: 4, borderWidth: 1, borderColor: colors.border }}>
            <Ionicons name={item.icon as any} size={24} color={item.color} />
            <Text style={{ fontSize: 28, fontWeight: '700', color: colors.text }}>{item.value}</Text>
            <Text style={{ fontSize: 13, color: colors.textMuted }}>{item.label}</Text>
          </View>
        ))}
      </View>

      {/* Fichiers récents */}
      <View style={{ backgroundColor: colors.card, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: colors.border, marginBottom: 20 }}>
        <Text style={{ color: colors.textMuted, fontSize: 13, fontWeight: '600', marginBottom: 12 }}>Fichiers récents</Text>
        {recent.length === 0 ? (
          <Text style={{ color: colors.textLight, textAlign: 'center', paddingVertical: 20 }}>Aucun fichier récent</Text>
        ) : (
          recent.map((f, i) => (
            <View key={f.id} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderTopWidth: i > 0 ? 1 : 0, borderTopColor: colors.border }}>
              <Ionicons name="document-outline" size={20} color={colors.textMuted} />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }} numberOfLines={1}>{f.name}</Text>
                <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 2 }}>{fmt(f.size)} · {fmtDate(f.created_at)}</Text>
              </View>
            </View>
          ))
        )}
      </View>
    </ScrollView>
    </SafeAreaView>
  );
}