import { StyleSheet, Text, View } from 'react-native';

export default function SharedScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Partagés</Text>
      <Text style={styles.text}>Aucun élément partagé pour le moment.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#ffffff',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 12,
  },
  text: {
    fontSize: 16,
    color: '#6b7280',
  },
});