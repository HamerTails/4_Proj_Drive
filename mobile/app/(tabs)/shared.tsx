import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

export default function SharedScreen() {
  return (
    <View style={styles.container}>
      <Ionicons name="share-social" size={44} color="#2563eb" />
      <Text style={styles.title}>Partagés avec moi</Text>
      <Text style={styles.text}>Les fichiers partagés apparaîtront ici.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff', padding: 24 },
  title: { fontSize: 24, fontWeight: '700', marginTop: 16 },
  text: { color: '#6b7280', marginTop: 8, textAlign: 'center' },
});