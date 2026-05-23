import { authService, userService, API_URL } from '../../constants/api';
import { useTheme } from '@/context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

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
  const [emailForm,  setEmailForm]  = useState({ email: '', password: '' });
  const [emailLoading, setEmailLoading] = useState(false);
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [avatarBust,  setAvatarBust]  = useState(Date.now());

  useEffect(() => {
    (async () => {
      const cached = await authService.getUser();
      setUser(cached);
      try {
        const me = await userService.getMe();
        setUser((u: any) => ({ ...(u || {}), ...me }));
      } catch { /* offline ou non auth, on garde le cache */ }
    })();
  }, []);

  const logout = async () => {
    try {
      await authService.logout();
    } catch {}
    // dismissAll pour clear le stack tabs, puis replace vers home publique
    try { (router as any).dismissAll?.(); } catch {}
    router.replace('/login');
  };

  const pickAvatar = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { Alert.alert('Permission requise', 'Accès aux photos refusé.'); return; }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true, aspect: [1, 1], quality: 0.8,
    });
    if (res.canceled || !res.assets?.[0]) return;
    const asset = res.assets[0];
    setAvatarLoading(true);
    try {
      await userService.uploadAvatar(asset.uri, asset.fileName || 'avatar.jpg', asset.mimeType || 'image/jpeg');
      setAvatarBust(Date.now());
      Alert.alert('Succès', 'Avatar mis à jour.');
    } catch (e: any) {
      Alert.alert('Erreur', e.response?.data?.error || 'Upload impossible.');
    } finally { setAvatarLoading(false); }
  };

  const changeEmail = async () => {
    if (!emailForm.email.trim() || !emailForm.password) {
      Alert.alert('Erreur', 'Email et mot de passe actuel requis.'); return;
    }
    if (!/^\S+@\S+\.\S+$/.test(emailForm.email.trim())) {
      Alert.alert('Erreur', 'Email invalide.'); return;
    }
    setEmailLoading(true);
    try {
      const r = await userService.updateEmail(emailForm.email.trim().toLowerCase(), emailForm.password);
      setUser((u: any) => ({ ...(u || {}), email: r.user?.email || emailForm.email.trim().toLowerCase() }));
      setEmailForm({ email: '', password: '' });
      Alert.alert('Succès', 'Email mis à jour.');
    } catch (e: any) {
      Alert.alert('Erreur', e.response?.data?.error || e.message);
    } finally { setEmailLoading(false); }
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
    toggleTheme();
  };

  const isGoogle = user?.provider === 'google';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg, padding: 16 }}>
      <Text style={{ fontSize: 26, fontWeight: '700', color: colors.text, marginBottom: 16 }}>
        Paramètres
      </Text>

      {/* Profil + avatar */}
      <View style={{ backgroundColor: colors.card, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: colors.border, alignItems: 'center' }}>
        <TouchableOpacity onPress={pickAvatar} disabled={avatarLoading} style={{ marginBottom: 8 }}>
          {user?.id && user?.avatar_path ? (
            <Image
              source={{ uri: `${API_URL}/api/users/avatar/${user.id}?v=${avatarBust}` }}
              style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: colors.border }}
              contentFit="cover"
            />
          ) : (
            <Ionicons name="person-circle" size={80} color={colors.primary} />
          )}
          <View style={{ position: 'absolute', bottom: 0, right: 0, backgroundColor: colors.primary, borderRadius: 12, padding: 5 }}>
            {avatarLoading
              ? <ActivityIndicator size="small" color="#fff" />
              : <Ionicons name="camera" size={14} color="#fff" />}
          </View>
        </TouchableOpacity>
        <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text, marginTop: 4 }}>
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

      {/* Changement email (seulement comptes email) */}
      {!isGoogle && (
        <View style={{ backgroundColor: colors.card, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: colors.border }}>
          <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text, marginBottom: 12 }}>
            Changer l'email
          </Text>

          <TextInput
            style={{
              backgroundColor: colors.inputBg, padding: 12, marginBottom: 10,
              borderRadius: 10, borderWidth: 1, borderColor: colors.border,
              fontSize: 14, color: colors.text,
            }}
            placeholder="Nouvel email"
            placeholderTextColor={colors.textLight}
            value={emailForm.email}
            onChangeText={(v) => setEmailForm((f) => ({ ...f, email: v }))}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />
          <PasswordInput
            value={emailForm.password}
            onChangeText={(v: string) => setEmailForm((f) => ({ ...f, password: v }))}
            placeholder="Mot de passe actuel"
            colors={colors}
          />

          <TouchableOpacity
            style={{ backgroundColor: emailLoading ? colors.textLight : colors.primary, padding: 13, borderRadius: 12, alignItems: 'center', marginTop: 4 }}
            onPress={changeEmail}
            disabled={emailLoading}
          >
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>
              {emailLoading ? 'Enregistrement...' : 'Mettre à jour'}
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
    </SafeAreaView>
  );
}