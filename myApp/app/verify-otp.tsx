import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  SafeAreaView,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { AuthService } from '@/services/AuthService';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
import { Colors } from '@/constants/theme';

export default function VerifyOtpScreen() {
  const [otp, setOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const router = useRouter();
  const { email } = useLocalSearchParams<{ email: string }>();
  const { theme: currentTheme } = useTheme();
  const theme = Colors[currentTheme];

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleVerifyOtp = async () => {
    if (!email) {
      Alert.alert('Error', 'Email information is missing');
      return;
    }

    if (!otp || otp.length !== 6) {
      Alert.alert('Error', 'Please enter a valid 6-digit OTP');
      return;
    }

    setIsLoading(true);
    try {
      const response = await AuthService.verifyOtp({ email, otp });
      Alert.alert('Success', 'Email verified successfully! You can now login.', [
        {
          text: 'OK',
          onPress: () => router.replace('/login'),
        },
      ]);
    } catch (error) {
      Alert.alert(
        'Verification Failed',
        error instanceof Error ? error.message : 'Failed to verify OTP'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (!email) {
      Alert.alert('Error', 'Email information is missing');
      return;
    }

    setResendLoading(true);
    try {
      await AuthService.resendOtp(email);
      Alert.alert('Success', 'New OTP sent to your email');
      setCountdown(60);
      setOtp('');
    } catch (error) {
      Alert.alert(
        'Error',
        error instanceof Error ? error.message : 'Failed to resend OTP'
      );
    } finally {
      setResendLoading(false);
    }
  };

  const handleBackToRegister = () => {
    router.back();
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBackToRegister} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={theme.tint} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: theme.tint }]}>Verify Email</Text>
          <Text style={[styles.subtitle, { color: theme.icon }]}>Enter the OTP sent to {email}</Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          {/* OTP Input */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: theme.tint }]}>One-Time Password</Text>
            <View style={[styles.inputContainer, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <Ionicons name="key-outline" size={20} color={theme.icon} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="000000"
                placeholderTextColor={theme.icon}
                value={otp}
                onChangeText={setOtp}
                editable={!isLoading}
                keyboardType="number-pad"
                maxLength={6}
                selectionColor={theme.tint}
              />
            </View>
            <Text style={[styles.helperText, { color: theme.icon }]}>Enter the 6-digit code from your email</Text>
          </View>

          {/* Verify Button */}
          <TouchableOpacity
            style={[styles.button, { backgroundColor: theme.tint }, isLoading && styles.buttonDisabled]}
            onPress={handleVerifyOtp}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Verify OTP</Text>
            )}
          </TouchableOpacity>

          {/* Resend OTP */}
          <View style={styles.resendContainer}>
            <Text style={[styles.resendText, { color: theme.icon }]}>Didn't receive the code? </Text>
            <TouchableOpacity
              onPress={handleResendOtp}
              disabled={resendLoading || countdown > 0}
              style={[styles.resendButton, (countdown > 0 || resendLoading) && styles.resendDisabled]}
            >
              {resendLoading ? (
                <ActivityIndicator size="small" color={theme.tint} />
              ) : countdown > 0 ? (
                <Text style={[styles.resendLink, { color: theme.tint }]}>Resend in {countdown}s</Text>
              ) : (
                <Text style={[styles.resendLink, { color: theme.tint }]}>Resend OTP</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  backButton: {
    alignSelf: 'flex-start',
    marginBottom: 16,
    padding: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginTop: 8,
  },
  subtitle: {
    fontSize: 13,
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 10,
  },
  form: {
    gap: 24,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    color: '#1A2B3C',
    fontSize: 18,
    letterSpacing: 4,
    fontWeight: '600',
  },
  helperText: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  button: {
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 12,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  resendContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
    gap: 4,
  },
  resendText: {
    fontSize: 14,
  },
  resendButton: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  resendDisabled: {
    opacity: 0.5,
  },
  resendLink: {
    fontSize: 14,
    fontWeight: '600',
  },
});
