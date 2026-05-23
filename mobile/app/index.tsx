import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as WebBrowser from 'expo-web-browser';
import { API_URL, getOAuthReturnUrl } from '../constants/api';

WebBrowser.maybeCompleteAuthSession();

export default function Home() {
  const router = useRouter();
  const [gLoading, setGLoading] = useState(false);

  // Sur web: detecter le token dans l'URL apres redirection OAuth Google
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
            await AsyncStorage.setItem('user', JSON.stringify({
              id: payload.id, email: payload.email, provider: payload.provider || 'google',
            }));
          } catch {}
          router.replace('/(tabs)/files');
        }
      } catch {}
    };
    processTokenFromUrl();
  }, []);

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
            await AsyncStorage.setItem('user', JSON.stringify({
              id: payload.id, email: payload.email, provider: payload.provider || 'google',
            }));
          } catch {}
          router.replace('/(tabs)/files');
        }
      }
    } catch { Alert.alert('Erreur', 'Connexion Google impossible.'); }
    finally { setGLoading(false); }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar style="dark" />
      <View style={styles.card}>
        <Image
          source={require('../assets/icons/logo.svg')}
          style={styles.logo}
          contentFit="contain"
        />

        <Text style={styles.title}>SUPFile</Text>
        <Text style={styles.subtitle}>
          Stockez et partagez vos fichiers en toute sécurité
        </Text>

        {/* Google: 1 seul bouton qui gere login + register */}
        <TouchableOpacity
          style={[styles.googleButton, gLoading && styles.btnDisabled]}
          onPress={handleGoogle}
          disabled={gLoading}
        >
          {gLoading ? (
            <ActivityIndicator color="#333" />
          ) : (
            <>
              <Image
                source={require('../assets/icons/google.svg')}
                style={{ width: 20, height: 20, marginRight: 10 }}
                contentFit="contain"
              />
              <Text style={styles.googleText}>Continuer avec Google</Text>
            </>
          )}
        </TouchableOpacity>

        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>ou avec un email</Text>
          <View style={styles.dividerLine} />
        </View>

        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => router.push('/login')}
        >
          <Text style={styles.primaryText}>Se connecter</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => router.push('/register')}
        >
          <Text style={styles.secondaryText}>Créer un compte</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
  },
  logo: {
    width: 80,
    height: 80,
    marginBottom: 20,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  subtitle: {
    textAlign: 'center',
    color: '#6b7280',
    marginBottom: 24,
  },
  googleButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    width: '100%',
    padding: 14,
    borderRadius: 12,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleText: {
    color: '#333',
    fontWeight: '600',
    fontSize: 15,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginVertical: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#e5e7eb',
  },
  dividerText: {
    marginHorizontal: 10,
    color: '#9ca3af',
    fontSize: 13,
  },
  primaryButton: {
    backgroundColor: '#2563eb',
    width: '100%',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  primaryText: {
    color: '#fff',
    textAlign: 'center',
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: '#e5e7eb',
    width: '100%',
    padding: 16,
    borderRadius: 12,
  },
  secondaryText: {
    textAlign: 'center',
    fontWeight: '600',
    color: '#111827',
  },
  btnDisabled: {
    opacity: 0.6,
  },
});
