import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function SettingsScreen() {
  const router = useRouter();

  const logout = () => {
    Alert.alert('Déconnexion', 'Vous avez été déconnecté.');
    router.replace('/');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Paramètres</Text>

      <View style={styles.card}>
        <Ionicons name="person-circle" size={44} color="#2563eb" />
        <Text style={styles.email}>utilisateur@supfile.com</Text>
      </View>

      <TouchableOpacity style={styles.option}>
        <Text style={styles.optionText}>Modifier le profil</Text>
        <Ionicons name="chevron-forward" size={20} color="#6b7280" />
      </TouchableOpacity>

      <TouchableOpacity style={styles.option}>
        <Text style={styles.optionText}>Thème clair / sombre</Text>
        <Ionicons name="chevron-forward" size={20} color="#6b7280" />
      </TouchableOpacity>

      <TouchableOpacity style={styles.homeButton} onPress={() => router.replace('/')}>
        <Ionicons name="home" size={20} color="#2563eb" />
        <Text style={styles.homeText}>Retour à l’accueil</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.logout} onPress={logout}>
        <Text style={styles.logoutText}>Se déconnecter</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f3f4f6', padding: 20 },
  title: { marginTop: 40, fontSize: 28, fontWeight: '700', marginBottom: 20 },
  card: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 20,
  },
  email: { marginTop: 8, fontWeight: '600' },
  option: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  optionText: { fontSize: 16 },
  homeButton: {
    marginTop: 10,
    backgroundColor: '#fff',
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  homeText: {
    color: '#2563eb',
    fontWeight: '700',
  },
  logout: {
    marginTop: 20,
    backgroundColor: '#dc2626',
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  logoutText: { color: '#fff', fontWeight: '700' },
});