import { DarkTheme, DefaultTheme, ThemeProvider as NavigationThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { ThemeProvider, useTheme } from '@/context/ThemeContext';
import { TransactionProvider } from '@/context/TransactionContext';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { NotificationProvider } from '@/context/NotificationContext';

import { ShareHandler } from '@/components/ShareHandler';
import { Colors } from '@/constants/theme';
import { ActivityIndicator, View } from 'react-native';

export const unstable_settings = {
  anchor: '(tabs)',
};

function RootLayoutNav() {
  const { theme } = useTheme();
  const { isSignedIn, isLoading } = useAuth();

  if (isLoading) {
    const palette = Colors[theme];
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: palette.background }}>
        <ActivityIndicator size="large" color={palette.tint} />
      </View>
    );
  }

  return (
    <NavigationThemeProvider value={theme === 'dark' ? DarkTheme : DefaultTheme}>
      {isSignedIn ? (
        <>
          <ShareHandler />
          <Stack>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
            <Stack.Screen name="transaction/[id]" options={{ presentation: 'modal', headerShown: false }} />
            <Stack.Screen name="add-transaction" options={{ presentation: 'modal', headerShown: false }} />
            <Stack.Screen name="ocr-camera" options={{ presentation: 'modal', headerShown: false }} />
            <Stack.Screen name="voice-command" options={{ presentation: 'modal', headerShown: false }} />
          </Stack>
        </>
      ) : (
        <Stack>
          <Stack.Screen name="login" options={{ headerShown: false }} />
          <Stack.Screen name="register" options={{ headerShown: false }} />
          <Stack.Screen name="verify-otp" options={{ headerShown: false }} />
        </Stack>
      )}
      <StatusBar style={theme === 'dark' ? 'light' : 'dark'} />
    </NavigationThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <TransactionProvider>
        <ThemeProvider>
          <NotificationProvider>
            <RootLayoutNav />
          </NotificationProvider>
        </ThemeProvider>
      </TransactionProvider>
    </AuthProvider>
  );
}