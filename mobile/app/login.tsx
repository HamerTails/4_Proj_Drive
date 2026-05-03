import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as WebBrowser from 'expo-web-browser';
import { useRouter } from 'expo-router';
import { Platform } from 'react-native';
import { useState, useEffect } from 'react';
import {
  ActivityIndicator, Alert, SafeAreaView, StyleSheet,
  Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { authService, API_URL, MOBILE_URL } from '../constants/api';

WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
  const router  = useRouter();
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [loading,  setLoading]  = useState(false);
  const [gLoading, setGLoading] = useState(false);
  const [showPwd,  setShowPwd]  = useState(false);

  // Détecter le token dans l'URL après redirection OAuth Google
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
    if (!email.trim() || !password.trim()) {
      Alert.alert('Erreur', 'Remplissez tous les champs.'); return;
    }
    setLoading(true);
    try {
      await authService.login(email.trim().toLowerCase(), password);
      router.replace('/(tabs)/files');
    } catch (err: any) {
      Alert.alert('Erreur', err.response?.data?.error || 'Identifiants incorrects.');
    } finally { setLoading(false); }
  };

  const handleGoogle = async () => {
    setGLoading(true);
    try {
      if (Platform.OS === 'web') {
        // Expo Web : la route /expo redirige vers localhost:8081 après auth
        window.location.href = API_URL + '/api/auth/google/expo';
        return;
      }
      // Téléphone physique : WebBrowser intercepte le retour
      const result = await WebBrowser.openAuthSessionAsync(
        API_URL + '/api/auth/google/expo',
        MOBILE_URL
      );
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
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.replace('/')}>
          <Ionicons name="arrow-back-circle" size={34} color="#2563eb" />
        </TouchableOpacity>
      </View>

      <View style={s.content}>
        <Image
          source={require('../assets/icons/logo.svg')}
          style={{ width: 64, height: 64, alignSelf: 'center', marginBottom: 12 }}
          contentFit="contain"
        />
        <Text style={s.title}>Connexion</Text>

        <TextInput
          style={s.input}
          placeholder="Email"
          placeholderTextColor="#999"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          editable={!loading}
        />
        <View style={{ position: 'relative', marginBottom: 16 }}>
          <TextInput
            style={[s.input, { marginBottom: 0, paddingRight: 44 }]}
            placeholder="Mot de passe"
            placeholderTextColor="#999"
            secureTextEntry={!showPwd}
            value={password}
            onChangeText={setPassword}
            editable={!loading}
          />
          <TouchableOpacity style={{ position: 'absolute', right: 12, top: 14 }} onPress={() => setShowPwd(!showPwd)}>
            <Ionicons name={showPwd ? 'eye-off' : 'eye'} size={20} color="#999" />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[s.btn, s.btnPrimary, loading && s.btnDisabled]}
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.btnText}>Se connecter</Text>}
        </TouchableOpacity>

        <View style={s.divider}>
          <View style={s.line} /><Text style={s.or}>ou</Text><View style={s.line} />
        </View>

        <TouchableOpacity
          style={[s.btn, s.btnGoogle, gLoading && s.btnDisabled]}
          onPress={handleGoogle}
          disabled={gLoading}
        >
          {gLoading
            ? <ActivityIndicator color="#333" />
            : <>
                <Image source={require('../assets/icons/google.svg')} style={{ width: 22, height: 22 }} contentFit="contain" />
                <Text style={s.btnGoogleText}>Continuer avec Google</Text>
              </>
          }
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.push('/register')} disabled={loading}>
          <Text style={s.link}>Pas de compte ? S'inscrire</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container:    { flex: 1, backgroundColor: '#f3f4f6' },
  header:       { height: 60, justifyContent: 'center', paddingHorizontal: 16 },
  content:      { flex: 1, justifyContent: 'center', padding: 24, marginTop: -40 },
  title:        { fontSize: 28, fontWeight: '700', textAlign: 'center', marginBottom: 24, color: '#111827' },
  input:        { backgroundColor: '#fff', padding: 14, borderRadius: 10, marginBottom: 16, borderWidth: 1, borderColor: '#ddd', fontSize: 15 },
  btn:          { padding: 14, borderRadius: 10, alignItems: 'center', marginBottom: 12, flexDirection: 'row', justifyContent: 'center', gap: 10 },
  btnPrimary:   { backgroundColor: '#2563eb' },
  btnGoogle:    { backgroundColor: '#fff', borderWidth: 1, borderColor: '#ddd' },
  btnDisabled:  { opacity: 0.6 },
  btnText:      { color: '#fff', fontWeight: '600', fontSize: 15 },
  btnGoogleText:{ color: '#333', fontWeight: '600', fontSize: 15 },
  divider:      { flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 8 },
  line:         { flex: 1, height: 1, backgroundColor: '#e5e7eb' },
  or:           { color: '#9ca3af', fontSize: 13 },
  link:         { marginTop: 8, textAlign: 'center', color: '#2563eb', fontWeight: '600' },
});