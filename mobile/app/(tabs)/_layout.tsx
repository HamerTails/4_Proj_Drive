import { Image } from 'expo-image';
import { Tabs } from 'expo-router';
import { View } from 'react-native';
import { useTheme } from '@/context/ThemeContext';

const ICONS = {
  files:     require('../../assets/icons/files.svg'),
  dashboard: require('../../assets/icons/dashboard.svg'),
  shared:    require('../../assets/icons/shared.svg'),
  trash:     require('../../assets/icons/trash.svg'),
  settings:  require('../../assets/icons/settings.svg'),
};

export default function TabLayout() {
  const { colors, theme } = useTheme();

  const tabIcon = (src: any) => ({ focused }: { focused: boolean }) => (
    <View style={{
      width: 32, height: 32, borderRadius: 8,
      backgroundColor: focused ? colors.primary : (theme === 'dark' ? '#ffffff20' : 'transparent'),
      justifyContent: 'center', alignItems: 'center',
    }}>
      <Image
        source={src}
        style={{
          width: 22, height: 22,
          ...(theme === 'dark' ? { filter: 'invert(1)' } : {}),
        } as any}
        contentFit="contain"
      />
    </View>
  );

  return (
    <Tabs
      screenOptions={{
        headerShown:             false,
        tabBarActiveTintColor:   colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.bg,
          borderTopColor:  colors.border,
          borderTopWidth:  1,
        },
      }}
    >
      <Tabs.Screen name="index" options={{ href: null }} />
      <Tabs.Screen name="files"     options={{ title: 'Fichiers',   tabBarIcon: tabIcon(ICONS.files)     }} />
      <Tabs.Screen name="dashboard" options={{ title: 'Dashboard',  tabBarIcon: tabIcon(ICONS.dashboard) }} />
      <Tabs.Screen name="shared"    options={{ title: 'Partagés',   tabBarIcon: tabIcon(ICONS.shared)    }} />
      <Tabs.Screen name="trash"     options={{ title: 'Corbeille',  tabBarIcon: tabIcon(ICONS.trash)     }} />
      <Tabs.Screen name="settings"  options={{ title: 'Paramètres', tabBarIcon: tabIcon(ICONS.settings)  }} />
    </Tabs>
  );
}