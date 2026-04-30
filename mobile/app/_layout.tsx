import { FileProvider } from '@/context/FileContext';
import { Stack } from 'expo-router';

export default function RootLayout() {
  return (
    <FileProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </FileProvider>
  );
}