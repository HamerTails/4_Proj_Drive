import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { authService } from '../constants/api';

export default function LoginScreen() {
  const router = useRouter();
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [loading,  setLoading]  = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs.');
      return;
    }

    setLoading(true);
    try {
      await authService.login(email.trim().toLowerCase(), password);
      // Connexion réussie → on va sur les fichiers
      router.replace('/(tabs)/files');
    } catch (err: any) {
      const message = err.response?.data?.error || 'Identifiants incorrects.';
      Alert.alert('Erreur de connexion', message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>

      {/* Flèche retour */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.replace('/')}>
          <Ionicons name="arrow-back-circle" size={34} color="#2563eb" />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <Text style={styles.title}>Connexion</Text>

        {/* Email */}
        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor="#999"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          editable={!loading}
        />

        {/* Mot de passe */}
        <TextInput
          style={styles.input}
          placeholder="Mot de passe"
          placeholderTextColor="#999"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
          editable={!loading}
        />

        {/* Bouton connexion */}
        <TouchableOpacity
          style={[styles.btn, loading && styles.btnDisabled]}
          onPress={handleLogin}
          disabled={loading}
        >
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.btnText}>Se connecter</Text>
          }
        </TouchableOpacity>

        {/* Lien inscription */}
        <TouchableOpacity onPress={() => router.push('/register')} disabled={loading}>
          <Text style={styles.link}>Pas de compte ? S'inscrire</Text>
        </TouchableOpacity>
      </View>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: '#f3f4f6' },
  header:      { height: 60, justifyContent: 'center', paddingHorizontal: 16 },
  content:     { flex: 1, justifyContent: 'center', padding: 24, marginTop: -40 },
  title: {
    fontSize:     28,
    fontWeight:   '700',
    textAlign:    'center',
    marginBottom: 24,
  },
  input: {
    backgroundColor: '#fff',
    padding:         14,
    borderRadius:    10,
    marginBottom:    16,
    borderWidth:     1,
    borderColor:     '#ddd',
    fontSize:        15,
  },
  btn: {
    backgroundColor: '#2563eb',
    padding:         14,
    borderRadius:    10,
    alignItems:      'center',
    marginBottom:    12,
  },
  btnDisabled: {
    backgroundColor: '#93c5fd',
  },
  btnText: { color: '#fff', fontWeight: '600', fontSize: 15 },
  link: {
    marginTop:  8,
    textAlign:  'center',
    color:      '#2563eb',
    fontWeight: '600',
  },
});
