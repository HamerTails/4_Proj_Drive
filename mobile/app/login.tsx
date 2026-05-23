import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as WebBrowser from 'expo-web-browser';
import { useRouter } from 'expo-router';
import { Platform } from 'react-native';
import { useState, useEffect } from 'react';
import {
  ActivityIndicator, Alert, KeyboardAvoidingView, ScrollView,
  Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { authService, API_URL, getOAuthReturnUrl } from '../constants/api';
import { useTheme } from '@/context/ThemeContext';

WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
  const router  = useRouter();
  const { colors, theme: themeMode } = useTheme();
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [loading,  setLoading]  = useState(false);
  const [gLoading, setGLoading] = useState(false);
  const [showPwd,  setShowPwd]  = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Détecter le token dans l'URL après redirection OAuth Google (Expo Web)
  useEffect(() => {
    const processTokenFromUrl = async () => {
      try {
        const params = new URLSearchParams(
          typeof window !== 'undefined' ? window.location.search : ''
        );
        const token = params.get('token');
        if (token) {
          await AsyncStorage.setItem('token', token);
          try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            await AsyncStorage.setItem('user', JSON.stringify({ id: payload.id, email: payload.email, provider: payload.provider || 'google' }));
          } catch {}
          router.replace('/(tabs)/files');
        }
      } catch {}
    };
    processTokenFromUrl();
  }, []);

  const handleLogin = async () => {
    setErrorMsg('');
    if (!email.trim() || !password.trim()) {
      setErrorMsg('Remplissez tous les champs.'); return;
    }
    setLoading(true);
    try {
      await authService.login(email.trim().toLowerCase(), password);
      router.replace('/(tabs)/files');
    } catch (err: any) {
      const msg = err?.response?.data?.error || 'Identifiants incorrects.';
      setErrorMsg(msg);
      if (Platform.OS !== 'web') Alert.alert('Erreur', msg);
    } finally { setLoading(false); }
  };

  const handleGoogle = async () => {
    setGLoading(true);
    try {
      const ret = getOAuthReturnUrl();
      const oauthUrl = API_URL + '/api/auth/google/expo?return=' + encodeURIComponent(ret);
      if (Platform.OS === 'web') {
        window.location.href = oauthUrl;
        return;
      }
      const result = await WebBrowser.openAuthSessionAsync(oauthUrl, ret);
      if (result.type === 'success' && result.url) {
        const url   = new URL(result.url);
        const token = url.searchParams.get('token');
        if (token) {
          await AsyncStorage.setItem('token', token);
          try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            await AsyncStorage.setItem('user', JSON.stringify({ id: payload.id, email: payload.email, provider: payload.provider || 'google' }));
          } catch {}
          router.replace('/(tabs)/files');
        }
      }
    } catch { Alert.alert('Erreur', 'Connexion Google impossible.'); }
    finally { setGLoading(false); }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top', 'bottom']}>
      <StatusBar style={themeMode === 'dark' ? 'light' : 'dark'} />
      <View style={{ height: 60, justifyContent: 'center', paddingHorizontal: 16 }}>
        <TouchableOpacity onPress={() => router.replace('/')}>
          <Ionicons name="arrow-back-circle" size={34} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24 }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={{
          backgroundColor: colors.card, borderRadius: 20, padding: 28,
          borderWidth: 1, borderColor: colors.border,
        }}>
          <Image
            source={require('../assets/icons/logo.svg')}
            style={{ width: 56, height: 56, alignSelf: 'center', marginBottom: 12 }}
            contentFit="contain"
          />
          <Text style={{
            fontSize: 24, fontWeight: '700', textAlign: 'center',
            marginBottom: 6, color: colors.text,
          }}>
            Bon retour
          </Text>
          <Text style={{
            fontSize: 13, textAlign: 'center', color: colors.textMuted,
            marginBottom: 22,
          }}>
            Connectez-vous à votre SUPFile
          </Text>

          {!!errorMsg && (
            <View style={{
              backgroundColor: '#fee2e2', borderColor: '#fca5a5', borderWidth: 1,
              borderRadius: 10, padding: 10, marginBottom: 14,
              flexDirection: 'row', alignItems: 'center', gap: 8,
            }}>
              <Ionicons name="alert-circle" size={18} color="#dc2626" />
              <Text style={{ color: '#991b1b', fontSize: 13, flex: 1 }}>{errorMsg}</Text>
            </View>
          )}

          <TextInput
            style={{
              backgroundColor: colors.inputBg, padding: 13, borderRadius: 10,
              marginBottom: 12, borderWidth: 1, borderColor: colors.border,
              fontSize: 15, color: colors.text,
            }}
            placeholder="Email"
            placeholderTextColor={colors.textLight}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            editable={!loading}
          />
          <View style={{ position: 'relative', marginBottom: 16 }}>
            <TextInput
              style={{
                backgroundColor: colors.inputBg, padding: 13, paddingRight: 44,
                borderRadius: 10, borderWidth: 1, borderColor: colors.border,
                fontSize: 15, color: colors.text,
              }}
              placeholder="Mot de passe"
              placeholderTextColor={colors.textLight}
              secureTextEntry={!showPwd}
              value={password}
              onChangeText={setPassword}
              editable={!loading}
            />
            <TouchableOpacity
              style={{ position: 'absolute', right: 12, top: 13 }}
              onPress={() => setShowPwd(!showPwd)}
            >
              <Ionicons name={showPwd ? 'eye-off' : 'eye'} size={20} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={{
              backgroundColor: loading ? colors.textLight : colors.primary,
              padding: 14, borderRadius: 10, alignItems: 'center', marginBottom: 12,
            }}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>Se connecter</Text>}
          </TouchableOpacity>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 8 }}>
            <View style={{ flex: 1, height: 1, backgroundColor: colors.border }} />
            <Text style={{ color: colors.textMuted, fontSize: 12 }}>ou</Text>
            <View style={{ flex: 1, height: 1, backgroundColor: colors.border }} />
          </View>

          <TouchableOpacity
            style={{
              backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
              padding: 13, borderRadius: 10, alignItems: 'center', marginBottom: 12,
              flexDirection: 'row', justifyContent: 'center', gap: 10,
              opacity: gLoading ? 0.6 : 1,
            }}
            onPress={handleGoogle}
            disabled={gLoading}
          >
            {gLoading
              ? <ActivityIndicator color={colors.text} />
              : <>
                  <Image
                    source={require('../assets/icons/google.svg')}
                    style={{ width: 20, height: 20 }}
                    contentFit="contain"
                  />
                  <Text style={{ color: colors.text, fontWeight: '600', fontSize: 14 }}>
                    Continuer avec Google
                  </Text>
                </>}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => router.push('/register')} disabled={loading}>
            <Text style={{
              marginTop: 6, textAlign: 'center', color: colors.primary,
              fontWeight: '600', fontSize: 13,
            }}>
              Pas de compte ? S'inscrire
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
