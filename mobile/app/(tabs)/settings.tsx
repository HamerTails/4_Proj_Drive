import { authService, userService } from '../../constants/api';
import { useTheme } from '@/context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';

function PasswordInput({ value, onChangeText, placeholder, colors, autoFocus }: any) {
  const [show, setShow] = useState(false);
  return (
    <View style={{ position: 'relative', marginBottom: 10 }}>
      <TextInput
        style={{
          backgroundColor: colors.inputBg, padding: 12, paddingRight: 44,
          borderRadius: 10, borderWidth: 1, borderColor: colors.border,
          fontSize: 14, color: colors.text,
        }}
        placeholder={placeholder}
        placeholderTextColor={colors.textLight}
        secureTextEntry={!show}
        value={value}
        onChangeText={onChangeText}
        autoFocus={autoFocus}
      />
      <TouchableOpacity
        style={{ position: 'absolute', right: 10, top: 12, padding: 4 }}
        onPress={() => setShow(!show)}
      >
        <Ionicons name={show ? 'eye-off' : 'eye'} size={20} color={colors.textMuted} />
      </TouchableOpacity>
    </View>
  );
}

export default function SettingsScreen() {
  const router = useRouter();
  const { theme, toggleTheme, colors } = useTheme();
  const [user,       setUser]       = useState<any>(null);
  const [pwdForm,    setPwdForm]    = useState({ current: '', next: '', confirm: '' });
  const [pwdLoading, setPwdLoading] = useState(false);

  useEffect(() => { authService.getUser().then(setUser); }, []);

  const logout = async () => {
    await authService.logout();
    router.replace('/');
  };

  const changePassword = async () => {
    if (!pwdForm.current || !pwdForm.next || !pwdForm.confirm) {
      Alert.alert('Erreur', 'Remplissez tous les champs.'); return;
    }
    if (pwdForm.next.length < 10) {
      Alert.alert('Erreur', 'Minimum 10 caractères.'); return;
    }
    if (pwdForm.next !== pwdForm.confirm) {
      Alert.alert('Erreur', 'Les mots de passe ne correspondent pas.'); return;
    }
    setPwdLoading(true);
    try {
      await userService.updatePassword(pwdForm.next, pwdForm.current);
      Alert.alert('Succès', 'Mot de passe mis à jour.');
      setPwdForm({ current: '', next: '', confirm: '' });
    } catch (e: any) {
      Alert.alert('Erreur', e.response?.data?.error || e.message);
    } finally { setPwdLoading(false); }
  };

  const handleToggleTheme = () => {
    console.log('[Theme] Toggle clicked, current:', theme);
    toggleTheme();
  };

  const isGoogle = user?.provider === 'google';

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg, padding: 16 }}>
      <Text style={{ marginTop: 40, fontSize: 26, fontWeight: '700', color: colors.text, marginBottom: 16 }}>
        Paramètres
      </Text>

      {/* Profil */}
      <View style={{ backgroundColor: colors.card, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: colors.border, alignItems: 'center' }}>
        <Ionicons name="person-circle" size={52} color={colors.primary} />
        <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text, marginTop: 8 }}>
          {user?.email || '...'}
        </Text>
        <Text style={{ color: colors.textMuted, marginTop: 2, fontSize: 13 }}>
          {isGoogle ? 'Compte Google' : 'Compte SUPFile'}
        </Text>
      </View>

      {/* Thème */}
      <TouchableOpacity
        style={{ backgroundColor: colors.card, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: colors.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
        onPress={handleToggleTheme}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Ionicons name={theme === 'dark' ? 'moon' : 'sunny'} size={22} color={colors.primary} />
          <Text style={{ fontSize: 15, color: colors.text }}>
            Thème : {theme === 'dark' ? 'Sombre' : 'Clair'}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
      </TouchableOpacity>

      {/* Mot de passe (seulement comptes email) */}
      {!isGoogle && (
        <View style={{ backgroundColor: colors.card, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: colors.border }}>
          <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text, marginBottom: 12 }}>
            Changer le mot de passe
          </Text>

          <PasswordInput
            value={pwdForm.current}
            onChangeText={(v: string) => setPwdForm((f) => ({ ...f, current: v }))}
            placeholder="Mot de passe actuel"
            colors={colors}
          />
          <PasswordInput
            value={pwdForm.next}
            onChangeText={(v: string) => setPwdForm((f) => ({ ...f, next: v }))}
            placeholder="Nouveau (10 car. min)"
            colors={colors}
          />
          <PasswordInput
            value={pwdForm.confirm}
            onChangeText={(v: string) => setPwdForm((f) => ({ ...f, confirm: v }))}
            placeholder="Confirmer le nouveau"
            colors={colors}
          />

          <TouchableOpacity
            style={{ backgroundColor: pwdLoading ? colors.textLight : colors.primary, padding: 13, borderRadius: 12, alignItems: 'center', marginTop: 4 }}
            onPress={changePassword}
            disabled={pwdLoading}
          >
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>
              {pwdLoading ? 'Enregistrement...' : 'Mettre à jour'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Info Google */}
      {isGoogle && (
        <View style={{ backgroundColor: colors.card, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: colors.border }}>
          <Text style={{ color: colors.textMuted, fontSize: 13, textAlign: 'center' }}>
            Compte Google — la gestion du mot de passe se fait depuis votre compte Google.
          </Text>
        </View>
      )}

      {/* Déconnexion */}
      <TouchableOpacity
        style={{ backgroundColor: colors.danger, padding: 14, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 40 }}
        onPress={logout}
      >
        <Ionicons name="log-out-outline" size={18} color="#fff" />
        <Text style={{ color: '#fff', fontWeight: '600', fontSize: 15 }}>Se déconnecter</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}