import { useRouter } from 'expo-router';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function Home() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <View style={styles.logo}>
          <Text style={styles.logoText}>S</Text>
        </View>

        <Text style={styles.title}>SUPFile</Text>
        <Text style={styles.subtitle}>
          Stockez et partagez vos fichiers en toute sécurité
        </Text>

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
    </View>
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
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 5,
  },

  logo: {
    width: 70,
    height: 70,
    borderRadius: 18,
    backgroundColor: '#2563eb',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },

  logoText: {
    color: '#fff',
    fontSize: 26,
    fontWeight: '700',
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
    marginBottom: 30,
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
});