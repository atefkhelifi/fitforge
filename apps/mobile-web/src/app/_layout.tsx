import { DarkTheme, DefaultTheme, ThemeProvider, Tabs } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useMemo } from 'react';

import { Icon, IconName } from '@/components/icon';
import { AuthProvider } from '@/features/auth/auth-provider';
import { SyncOnSignIn } from '@/features/sync/sync-on-sign-in';
import { useIsWide } from '@/theme/use-layout';
import { useColors, useIsDark } from '@/theme/use-theme';

const tabs: { name: string; title: string; icon: IconName }[] = [
  { name: 'index', title: 'Today', icon: 'home' },
  { name: 'train', title: 'Train', icon: 'train' },
  { name: 'progress', title: 'Progress', icon: 'progress' },
  { name: 'nutrition', title: 'Nutrition', icon: 'nutrition' },
  { name: 'profile', title: 'Profile', icon: 'profile' },
];

export default function RootLayout() {
  const colors = useColors();
  const isDark = useIsDark();
  const wide = useIsWide();

  const navTheme = useMemo(() => {
    const base = isDark ? DarkTheme : DefaultTheme;
    return {
      ...base,
      colors: { ...base.colors, background: colors.bg, card: colors.surface, border: colors.surface2, primary: colors.primary, text: colors.text },
    };
  }, [isDark, colors]);

  return (
    <ThemeProvider value={navTheme}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <AuthProvider>
        <SyncOnSignIn />
        <Tabs
          screenOptions={{
            headerShown: false,
            tabBarActiveTintColor: colors.primary,
            tabBarInactiveTintColor: colors.textMuted,
            // Desktop-sized windows get a sidebar, phones a bottom bar.
            tabBarPosition: wide ? 'left' : 'bottom',
            tabBarVariant: wide ? 'material' : 'uikit',
            // A compact rail (label under the icon); the default labelled drawer takes ~30% of the window.
            tabBarLabelPosition: wide ? 'below-icon' : undefined,
            tabBarStyle: wide
              ? { backgroundColor: colors.surface, borderRightColor: colors.surface2, borderRightWidth: 1, paddingTop: 24, paddingHorizontal: 8 }
              : { backgroundColor: colors.surface, borderTopColor: colors.surface2, height: 72, paddingTop: 8 },
            tabBarLabelStyle: { fontSize: 11, fontWeight: '700' },
          }}>
          {tabs.map((t) => (
            <Tabs.Screen
              key={t.name}
              name={t.name}
              options={{
                title: t.title,
                tabBarIcon: ({ color }) => <Icon name={t.icon} color={String(color)} />,
              }}
            />
          ))}
          {/* Hidden from the tab bar; declared last so index stays the initial tab. */}
          <Tabs.Screen name="onboarding" options={{ href: null }} />
        </Tabs>
      </AuthProvider>
    </ThemeProvider>
  );
}
