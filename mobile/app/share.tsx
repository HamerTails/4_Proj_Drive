import { shareService } from '../constants/api';
import { useTheme } from '@/context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import {
  Alert, Platform, SafeAreaView, ScrollView, Text, TextInput,
  TouchableOpacity, View,
} from 'react-native';

export default function ShareScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { id, name } = useLocalSearchParams<{ id: string; name: string }>();

  const [password,    setPassword]    = useState('');
  const [expirePreset, setExpirePreset] = useState<'1d' | '1w' | '1m' | 'never'>('never');
  const [link,        setLink]        = useState('');
  const [linkLoading, setLinkLoading] = useState(false);

  const computeExpiresAt = () => {
    if (expirePreset === 'never') return undefined;
    const now = new Date();
    if (expirePreset === '1d') now.setDate(now.getDate() + 1);
    if (expirePreset === '1w') now.setDate(now.getDate() + 7);
    if (expirePreset === '1m') now.setMonth(now.getMonth() + 1);
    return now.toISOString();
  };

  const [email,        setEmail]        = useState('');
  const [shareLoading, setShareLoading] = useState(false);
  const [shareStatus,  setShareStatus]  = useState('');

  const generateLink = async () => {
    setLinkLoading(true);
    setLink('');
    try {
      const res = await shareService.createPublicLink(
        id,
        password || undefined,
        computeExpiresAt(),
      );
      setLink(res.link || '');
    } catch (e: any) {
      Alert.alert('Erreur', e.response?.data?.error || 'Impossible de générer le lien.');
    } finally { setLinkLoading(false); }
  };

  const copyLink = async () => {
    if (!link) return;
    try {
      if (Platform.OS === 'web' && navigator?.clipboard) {
        await navigator.clipboard.writeText(link);
        Alert.alert('Copié', 'Lien copié.');
      } else {
        Alert.alert('Lien à copier', link);
      }
    } catch {
      Alert.alert('Lien', link);
    }
  };

  const internalShare = async () => {
    if (!email.trim()) { Alert.alert('Erreur', 'Saisissez une adresse email.'); return; }
    setShareLoading(true);
    setShareStatus('');
    try {
      await shareService.createInternalShare(id, email.trim().toLowerCase());
      setShareStatus('Partagé avec ' + email + ' !');
      setEmail('');
    } catch (e: any) {
      setShareStatus(e.response?.data?.error || 'Erreur lors du partage.');
    } finally { setShareLoading(false); }
  };

  const card = { backgroundColor: colors.card, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: colors.border };
  const input = { backgroundColor: colors.inputBg, padding: 12, borderRadius: 10, marginBottom: 10, borderWidth: 1, borderColor: colors.border, fontSize: 14, color: colors.text };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: colors.headerBg, borderBottomWidth: 1, borderBottomColor: colors.border }}>
        <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 12 }}>
          <Ionicons name="arrow-back" size={22} color={colors.primary} />
        </TouchableOpacity>
        <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text, flex: 1 }} numberOfLines={1}>
          Partager
        </Text>
      </View>

      <ScrollView style={{ flex: 1, padding: 16 }}>
        <Text style={{ fontSize: 14, color: colors.textMuted, marginBottom: 16 }} numberOfLines={1}>
          {name}
        </Text>

        {/* Lien public */}
        <View style={card as any}>
          <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 4 }}>
            Lien public
          </Text>
          <Text style={{ fontSize: 12, color: colors.textMuted, marginBottom: 12 }}>
            Toute personne avec ce lien pourra accéder au fichier.
          </Text>

          <TextInput
            style={input as any}
            placeholder="Mot de passe (optionnel)"
            placeholderTextColor={colors.textLight}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text, marginBottom: 8, marginTop: 4 }}>
            Expiration
          </Text>
          <View style={{ flexDirection: 'row', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
            {[
              { val: 'never', label: 'Jamais' },
              { val: '1d',    label: '1 jour' },
              { val: '1w',    label: '1 semaine' },
              { val: '1m',    label: '1 mois' },
            ].map((opt) => (
              <TouchableOpacity
                key={opt.val}
                style={{
                  paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
                  backgroundColor: expirePreset === opt.val ? colors.primary : colors.inputBg,
                  borderWidth: 1,
                  borderColor: expirePreset === opt.val ? colors.primary : colors.border,
                }}
                onPress={() => setExpirePreset(opt.val as any)}
              >
                <Text style={{ fontSize: 13, color: expirePreset === opt.val ? '#fff' : colors.text, fontWeight: '600' }}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            style={{ backgroundColor: linkLoading ? colors.textLight : colors.primary, padding: 12, borderRadius: 10, alignItems: 'center', marginTop: 4 }}
            onPress={generateLink}
            disabled={linkLoading}
          >
            <Text style={{ color: '#fff', fontWeight: '700' }}>
              {linkLoading ? 'Génération...' : 'Générer le lien'}
            </Text>
          </TouchableOpacity>

          {!!link && (
            <View style={{ marginTop: 14 }}>
              <Text selectable style={{ fontSize: 13, color: colors.text, padding: 12, backgroundColor: colors.inputBg, borderRadius: 8, marginBottom: 8 }}>
                {link}
              </Text>
              <TouchableOpacity
                style={{ backgroundColor: colors.success, padding: 10, borderRadius: 8, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6 }}
                onPress={copyLink}
              >
                <Ionicons name="copy-outline" size={16} color="#fff" />
                <Text style={{ color: '#fff', fontWeight: '600' }}>Copier le lien</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Partage interne */}
        <View style={card as any}>
          <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 4 }}>
            Partager avec un utilisateur SUPFile
          </Text>
          <Text style={{ fontSize: 12, color: colors.textMuted, marginBottom: 12 }}>
            Le fichier apparaîtra dans son onglet "Partagés".
          </Text>

          <TextInput
            style={input as any}
            placeholder="Email de l'utilisateur"
            placeholderTextColor={colors.textLight}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <TouchableOpacity
            style={{ backgroundColor: shareLoading ? colors.textLight : colors.primary, padding: 12, borderRadius: 10, alignItems: 'center' }}
            onPress={internalShare}
            disabled={shareLoading}
          >
            <Text style={{ color: '#fff', fontWeight: '700' }}>
              {shareLoading ? 'Partage...' : 'Partager'}
            </Text>
          </TouchableOpacity>

          {!!shareStatus && (
            <Text style={{ marginTop: 10, fontSize: 13, color: shareStatus.startsWith('Partagé') ? colors.success : colors.danger, textAlign: 'center' }}>
              {shareStatus}
            </Text>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}