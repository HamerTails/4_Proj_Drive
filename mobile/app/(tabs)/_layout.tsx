import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';

export default function TabLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false }}>
      <Tabs.Screen
        name="files"
        options={{
          title: 'Fichiers',
          tabBarIcon: ({ color }) => <Ionicons name="folder" size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="shared"
        options={{
          title: 'Partagés',
          tabBarIcon: ({ color }) => <Ionicons name="share-social" size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="trash"
        options={{
          title: 'Corbeille',
          tabBarIcon: ({ color }) => <Ionicons name="trash" size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Paramètres',
          tabBarIcon: ({ color }) => <Ionicons name="settings" size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color }) => <Ionicons name="analytics" size={22} color={color} />,
        }}
      />
    </Tabs>
  );
}