import { Caveat_600SemiBold } from '@expo-google-fonts/caveat';
import { DMSans_400Regular, DMSans_500Medium, DMSans_600SemiBold, DMSans_700Bold, useFonts } from '@expo-google-fonts/dm-sans';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { SessionProvider } from '@/lib/session';
import { t } from '@/lib/i18n';
import { colors, font } from '@/lib/theme';

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
});

const theme = {
  ...DefaultTheme,
  colors: { ...DefaultTheme.colors, background: colors.bg, card: colors.bg, text: colors.fg, primary: colors.primaryText, border: colors.line },
};

export default function RootLayout() {
  const [loaded] = useFonts({ DMSans_400Regular, DMSans_500Medium, DMSans_600SemiBold, DMSans_700Bold, Caveat_600SemiBold });
  useEffect(() => {
    if (loaded) SplashScreen.hideAsync();
  }, [loaded]);
  if (!loaded) return null;

  const header = {
    headerShadowVisible: false,
    headerStyle: { backgroundColor: colors.bg },
    headerTintColor: colors.fg,
    headerTitleStyle: { fontFamily: font.semibold },
    headerBackButtonDisplayMode: 'minimal' as const,
  };
  const modal = { ...header, presentation: 'modal' as const };

  return (
    <QueryClientProvider client={queryClient}>
      <SessionProvider>
        <ThemeProvider value={theme}>
          <StatusBar style="dark" />
          <Stack screenOptions={header}>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="page/[key]" options={{ title: '' }} />
            <Stack.Screen name="project/[slug]" options={{ title: '' }} />
            <Stack.Screen name="member/[handle]" options={{ title: '' }} />
            <Stack.Screen name="post/[id]" options={{ title: t.feed.thread }} />
            <Stack.Screen name="tag/[tag]" options={{ title: '' }} />
            <Stack.Screen name="link/[id]" options={{ title: t.links.detail }} />
            <Stack.Screen name="notifications" options={{ title: t.notifications.title }} />
            <Stack.Screen name="bookmarks" options={{ title: t.bookmarks.title }} />
            <Stack.Screen name="blog/index" options={{ title: t.blog.title }} />
            <Stack.Screen name="blog/[slug]" options={{ title: '' }} />
            <Stack.Screen name="login" options={{ ...modal, title: t.login.title }} />
            <Stack.Screen name="compose" options={{ ...modal, title: t.compose.title }} />
            <Stack.Screen name="new-project" options={{ ...modal, title: t.newProject.title }} />
            <Stack.Screen name="new-link" options={{ ...modal, title: t.links.add }} />
            <Stack.Screen name="edit-profile" options={{ ...modal, title: t.edit.title }} />
          </Stack>
        </ThemeProvider>
      </SessionProvider>
    </QueryClientProvider>
  );
}
