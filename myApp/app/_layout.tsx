import { DarkTheme, DefaultTheme, ThemeProvider as NavigationThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import * as SecureStore from 'expo-secure-store';
import * as LocalAuthentication from 'expo-local-authentication';
import React, { useEffect, useState, useCallback } from 'react';

import { ThemeProvider, useTheme } from '@/context/ThemeContext';
import { TransactionProvider } from '@/context/TransactionContext';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { NotificationProvider } from '@/context/NotificationContext';
import { LanguageProvider } from '@/context/LanguageContext';

import { ShareHandler } from '@/components/ShareHandler';
import { Colors } from '@/constants/theme';
import { ActivityIndicator, Text, TouchableOpacity, View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export const unstable_settings = {
  anchor: '(tabs)',
};

type LockState = 'checking' | 'locked' | 'unlocked';

function BiometricGate({ children }: { children: React.ReactNode }) {
  const { theme } = useTheme();
  const palette = Colors[theme];

  const [lockState, setLockState] = useState<LockState>('checking');
  const [errorMsg, setErrorMsg] = useState('');

  const authenticate = useCallback(async () => {
    setLockState('checking');
    setErrorMsg('');
    try {
      const stored = await SecureStore.getItemAsync('faceIdEnabled');
      if (stored !== 'true') {
        setLockState('unlocked');
        return;
      }

      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      if (!hasHardware || !isEnrolled) {
        // Device doesn't support biometrics — let the user in anyway
        setLockState('unlocked');
        return;
      }

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Verify your identity to continue',
        fallbackLabel: 'Use PIN',
        disableDeviceFallback: false,
      });

      if (result.success) {
        setLockState('unlocked');
      } else {
        setLockState('locked');
        setErrorMsg('Authentication failed. Please try again.');
      }
    } catch {
      setLockState('locked');
      setErrorMsg('An error occurred. Please try again.');
    }
  }, []);

  useEffect(() => {
    authenticate();
  }, [authenticate]);

  if (lockState === 'unlocked') {
    return <>{children}</>;
  }

  // Lock screen
  return (
    <View style={[gateStyles.container, { backgroundColor: palette.background }]}>
      <View style={[gateStyles.card, { backgroundColor: palette.card, borderColor: palette.border }]}>
        <View style={[gateStyles.iconRing, { backgroundColor: palette.tint + '18' }]}>
          <Ionicons name="shield-checkmark" size={40} color={palette.tint} />
        </View>
        <Text style={[gateStyles.title, { color: palette.text }]}>Face Lock</Text>
        <Text style={[gateStyles.subtitle, { color: palette.icon }]}>
          {lockState === 'checking'
            ? 'Verifying your identity…'
            : errorMsg || 'Authentication required to continue.'}
        </Text>

        {lockState === 'locked' && (
          <TouchableOpacity
            style={[gateStyles.btn, { backgroundColor: palette.tint }]}
            onPress={authenticate}
            activeOpacity={0.8}
          >
            <Ionicons name="finger-print" size={18} color="#FFF" />
            <Text style={gateStyles.btnText}>Try Again</Text>
          </TouchableOpacity>
        )}

        {lockState === 'checking' && (
          <ActivityIndicator size="small" color={palette.tint} style={{ marginTop: 20 }} />
        )}
      </View>
    </View>
  );
}

const gateStyles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  card: {
    width: '100%', borderRadius: 24, borderWidth: 1,
    padding: 32, alignItems: 'center', gap: 12,
  },
  iconRing: {
    width: 80, height: 80, borderRadius: 40,
    alignItems: 'center', justifyContent: 'center', marginBottom: 8,
  },
  title: { fontSize: 22, fontWeight: '800' },
  subtitle: { fontSize: 14, fontWeight: '500', textAlign: 'center', lineHeight: 20 },
  btn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingVertical: 14, paddingHorizontal: 32,
    borderRadius: 30, marginTop: 12,
  },
  btnText: { color: '#FFF', fontWeight: '700', fontSize: 15 },
});

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
        <BiometricGate>
          <ShareHandler />
          <Stack>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
            <Stack.Screen name="transaction/[id]" options={{ presentation: 'modal', headerShown: false }} />
            <Stack.Screen name="add-transaction" options={{ presentation: 'modal', headerShown: false }} />
            <Stack.Screen name="ocr-camera" options={{ presentation: 'modal', headerShown: false }} />
            <Stack.Screen name="voice-command" options={{ presentation: 'modal', headerShown: false }} />
          </Stack>
        </BiometricGate>
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
    <LanguageProvider>
      <AuthProvider>
        <TransactionProvider>
          <ThemeProvider>
            <NotificationProvider>
              <RootLayoutNav />
            </NotificationProvider>
          </ThemeProvider>
        </TransactionProvider>
      </AuthProvider>
    </LanguageProvider>
  );
}