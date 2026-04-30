import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

export default function DashboardScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Dashboard</Text>

      <View style={styles.card}>
        <Text style={styles.label}>Stockage utilisé</Text>
        <Text style={styles.value}>2.4 GB / 10 GB</Text>
        <View style={styles.progressBg}>
          <View style={styles.progress} />
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Fichiers récents</Text>
        <Text style={styles.value}>12 fichiers</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Partages actifs</Text>
        <Text style={styles.value}>4 liens publics</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f3f4f6', padding: 20 },
  title: { marginTop: 40, fontSize: 28, fontWeight: '700', marginBottom: 20 },
  card: {
    backgroundColor: '#fff',
    padding: 18,
    borderRadius: 16,
    marginBottom: 14,
  },
  label: { color: '#6b7280', marginBottom: 8 },
  value: { fontSize: 20, fontWeight: '700' },
  progressBg: {
    height: 10,
    backgroundColor: '#e5e7eb',
    borderRadius: 20,
    marginTop: 12,
  },
  progress: {
    height: 10,
    width: '24%',
    backgroundColor: '#2563eb',
    borderRadius: 20,
  },
});