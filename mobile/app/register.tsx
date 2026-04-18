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

export default function RegisterScreen() {
  const router = useRouter();
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [loading,  setLoading]  = useState(false);

  const handleRegister = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs.');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Erreur', 'Le mot de passe doit faire au moins 6 caractères.');
      return;
    }

    setLoading(true);
    try {
      await authService.register(email.trim().toLowerCase(), password);
      router.replace('/(tabs)/files');
    } catch (err: any) {
      const message = err.response?.data?.error || 'Erreur lors de l\'inscription.';
      Alert.alert('Erreur', message);
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
        <Text style={styles.title}>Inscription</Text>

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
          placeholder="Mot de passe (6 caractères min.)"
          placeholderTextColor="#999"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
          editable={!loading}
        />

        {/* Bouton inscription */}
        <TouchableOpacity
          style={[styles.btn, loading && styles.btnDisabled]}
          onPress={handleRegister}
          disabled={loading}
        >
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.btnText}>Créer un compte</Text>
          }
        </TouchableOpacity>

        {/* Lien connexion */}
        <TouchableOpacity onPress={() => router.replace('/login')} disabled={loading}>
          <Text style={styles.link}>Déjà un compte ? Se connecter</Text>
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
    backgroundColor: '#16a34a',
    padding:         14,
    borderRadius:    10,
    alignItems:      'center',
    marginBottom:    12,
  },
  btnDisabled: {
    backgroundColor: '#86efac',
  },
  btnText: { color: '#fff', fontWeight: '600', fontSize: 15 },
  link: {
    marginTop:  8,
    textAlign:  'center',
    color:      '#2563eb',
    fontWeight: '600',
  },
});
