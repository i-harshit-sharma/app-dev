// import React, { useState, useEffect } from 'react';
// import {
//   View,
//   Text,
//   TextInput,
//   TouchableOpacity,
//   StyleSheet,
//   ScrollView,
//   ActivityIndicator,
//   SafeAreaView,
//   Alert,
// } from 'react-native';
// import { useRouter, useLocalSearchParams } from 'expo-router';
// import { AuthService } from '@/services/AuthService';
// import { Ionicons } from '@expo/vector-icons';
// import { useTheme } from '@/context/ThemeContext';
// import { Colors } from '@/constants/theme';

// export default function VerifyOtpScreen() {
//   const [otp, setOtp] = useState('');
//   const [isLoading, setIsLoading] = useState(false);
//   const [resendLoading, setResendLoading] = useState(false);
//   const [countdown, setCountdown] = useState(0);
//   const router = useRouter();
//   const { email } = useLocalSearchParams<{ email: string }>();
//   const { theme: currentTheme } = useTheme();
//   const theme = Colors[currentTheme];

//   useEffect(() => {
//     if (countdown > 0) {
//       const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
//       return () => clearTimeout(timer);
//     }
//   }, [countdown]);

//   const handleVerifyOtp = async () => {
//     if (!email) {
//       Alert.alert('Error', 'Email information is missing');
//       return;
//     }

//     if (!otp || otp.length !== 6) {
//       Alert.alert('Error', 'Please enter a valid 6-digit OTP');
//       return;
//     }

//     setIsLoading(true);
//     try {
//       const response = await AuthService.verifyOtp({ email, otp });
//       Alert.alert('Success', 'Email verified successfully! You can now login.', [
//         {
//           text: 'OK',
//           onPress: () => router.replace('/login'),
//         },
//       ]);
//     } catch (error) {
//       Alert.alert(
//         'Verification Failed',
//         error instanceof Error ? error.message : 'Failed to verify OTP'
//       );
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   const handleResendOtp = async () => {
//     if (!email) {
//       Alert.alert('Error', 'Email information is missing');
//       return;
//     }

//     setResendLoading(true);
//     try {
//       await AuthService.resendOtp(email);
//       Alert.alert('Success', 'New OTP sent to your email');
//       setCountdown(60);
//       setOtp('');
//     } catch (error) {
//       Alert.alert(
//         'Error',
//         error instanceof Error ? error.message : 'Failed to resend OTP'
//       );
//     } finally {
//       setResendLoading(false);
//     }
//   };

//   const handleBackToRegister = () => {
//     router.back();
//   };

//   return (
//     <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
//       <ScrollView contentContainerStyle={styles.container}>
//         {/* Header */}
//         <View style={styles.header}>
//           <TouchableOpacity onPress={handleBackToRegister} style={styles.backButton}>
//             <Ionicons name="arrow-back" size={24} color={theme.tint} />
//           </TouchableOpacity>
//           <Text style={[styles.title, { color: theme.tint }]}>Verify Email</Text>
//           <Text style={[styles.subtitle, { color: theme.icon }]}>Enter the OTP sent to {email}</Text>
//         </View>

//         {/* Form */}
//         <View style={styles.form}>
//           {/* OTP Input */}
//           <View style={styles.inputGroup}>
//             <Text style={[styles.label, { color: theme.tint }]}>One-Time Password</Text>
//             <View style={[styles.inputContainer, { backgroundColor: theme.card, borderColor: theme.border }]}>
//               <Ionicons name="key-outline" size={20} color={theme.icon} style={styles.inputIcon} />
//               <TextInput
//                 style={styles.input}
//                 placeholder="000000"
//                 placeholderTextColor={theme.icon}
//                 value={otp}
//                 onChangeText={setOtp}
//                 editable={!isLoading}
//                 keyboardType="number-pad"
//                 maxLength={6}
//                 selectionColor={theme.tint}
//               />
//             </View>
//             <Text style={[styles.helperText, { color: theme.icon }]}>Enter the 6-digit code from your email</Text>
//           </View>

//           {/* Verify Button */}
//           <TouchableOpacity
//             style={[styles.button, { backgroundColor: theme.tint }, isLoading && styles.buttonDisabled]}
//             onPress={handleVerifyOtp}
//             disabled={isLoading}
//           >
//             {isLoading ? (
//               <ActivityIndicator size="small" color="#fff" />
//             ) : (
//               <Text style={styles.buttonText}>Verify OTP</Text>
//             )}
//           </TouchableOpacity>

//           {/* Resend OTP */}
//           <View style={styles.resendContainer}>
//             <Text style={[styles.resendText, { color: theme.icon }]}>Didn't receive the code? </Text>
//             <TouchableOpacity
//               onPress={handleResendOtp}
//               disabled={resendLoading || countdown > 0}
//               style={[styles.resendButton, (countdown > 0 || resendLoading) && styles.resendDisabled]}
//             >
//               {resendLoading ? (
//                 <ActivityIndicator size="small" color={theme.tint} />
//               ) : countdown > 0 ? (
//                 <Text style={[styles.resendLink, { color: theme.tint }]}>Resend in {countdown}s</Text>
//               ) : (
//                 <Text style={[styles.resendLink, { color: theme.tint }]}>Resend OTP</Text>
//               )}
//             </TouchableOpacity>
//           </View>
//         </View>
//       </ScrollView>
//     </SafeAreaView>
//   );
// }

// const styles = StyleSheet.create({
//   safeArea: {
//     flex: 1,
//   },
//   container: {
//     flexGrow: 1,
//     justifyContent: 'center',
//     paddingHorizontal: 20,
//     paddingBottom: 40,
//   },
//   header: {
//     alignItems: 'center',
//     marginBottom: 40,
//   },
//   backButton: {
//     alignSelf: 'flex-start',
//     marginBottom: 16,
//     padding: 8,
//   },
//   title: {
//     fontSize: 28,
//     fontWeight: '700',
//     marginTop: 8,
//   },
//   subtitle: {
//     fontSize: 13,
//     marginTop: 8,
//     textAlign: 'center',
//     paddingHorizontal: 10,
//   },
//   form: {
//     gap: 24,
//   },
//   inputGroup: {
//     gap: 8,
//   },
//   label: {
//     fontSize: 14,
//     fontWeight: '500',
//   },
//   inputContainer: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     borderRadius: 12,
//     borderWidth: 1,
//     paddingHorizontal: 12,
//   },
//   inputIcon: {
//     marginRight: 8,
//   },
//   input: {
//     flex: 1,
//     paddingVertical: 12,
//     color: '#1A2B3C',
//     fontSize: 18,
//     letterSpacing: 4,
//     fontWeight: '600',
//   },
//   helperText: {
//     fontSize: 12,
//     fontStyle: 'italic',
//   },
//   button: {
//     paddingVertical: 12,
//     borderRadius: 12,
//     alignItems: 'center',
//     marginTop: 12,
//   },
//   buttonDisabled: {
//     opacity: 0.6,
//   },
//   buttonText: {
//     color: '#fff',
//     fontSize: 16,
//     fontWeight: '600',
//   },
//   resendContainer: {
//     flexDirection: 'row',
//     justifyContent: 'center',
//     alignItems: 'center',
//     marginTop: 12,
//     gap: 4,
//   },
//   resendText: {
//     fontSize: 14,
//   },
//   resendButton: {
//     paddingVertical: 4,
//     paddingHorizontal: 8,
//   },
//   resendDisabled: {
//     opacity: 0.5,
//   },
//   resendLink: {
//     fontSize: 14,
//     fontWeight: '600',
//   },
// });


import React, { useState, useEffect, useRef } from 'react';
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
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  Pressable,
  Animated,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { AuthService } from '@/services/AuthService';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
import { Colors } from '@/constants/theme';

const CODE_LENGTH = 6;

export default function VerifyOtpScreen() {
  const [otp, setOtp] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [showToast, setShowToast] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  
  const router = useRouter();
  const { email } = useLocalSearchParams<{ email: string }>();
  const { theme: currentTheme } = useTheme();
  const theme = Colors[currentTheme];
  
  const inputRef = useRef<TextInput>(null);

  // Timer logic
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const showSuccessToast = () => {
    setShowToast(true);
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();

    setTimeout(() => {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        setShowToast(false);
        router.replace('/login');
      });
    }, 2000);
  };

  // Auto-submit when exactly 6 digits are entered
  useEffect(() => {
    if (otp.length === CODE_LENGTH && !isLoading && !error) {
      Keyboard.dismiss();
      handleVerifyOtp();
    }
  }, [otp]);

  const handleVerifyOtp = async () => {
    if (!email) {
      setError('Email information is missing');
      return;
    }

    if (otp.length !== CODE_LENGTH) {
      setError('Please enter a valid 6-digit OTP');
      return;
    }

    setIsLoading(true);
    setError(null);
    
    try {
      // Assuming AuthService returns a promise
      await AuthService.verifyOtp({ email, otp });
      showSuccessToast();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid OTP. Please try again.');
      setOtp(''); // Clear OTP on failure so they can try again quickly
      inputRef.current?.focus();
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (!email) return;

    setResendLoading(true);
    setError(null);
    try {
      await AuthService.resendOtp(email);
      setCountdown(60);
      setOtp('');
      inputRef.current?.focus();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resend OTP');
    } finally {
      setResendLoading(false);
    }
  };

  const handleOtpChange = (value: string) => {
    // Only allow numbers
    const cleanValue = value.replace(/[^0-9]/g, '');
    setOtp(cleanValue);
    if (error) setError(null); // Clear error when typing
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
        style={styles.flex1}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <ScrollView contentContainerStyle={styles.container}>
            {/* Header */}
            <View style={styles.header}>
              <Text style={[styles.title, { color: theme.text }]}>Verify Email</Text>
              <Text style={[styles.subtitle, { color: theme.icon }]}>
                Code sent to <Text style={{ color: theme.tint, fontWeight: '600' }}>{email}</Text>
              </Text>
              <TouchableOpacity 
                onPress={() => router.back()}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                style={styles.editButton}
              >
                <Text style={[styles.editButtonText, { color: theme.tint }]}>Edit details</Text>
              </TouchableOpacity>
            </View>

            {/* Form */}
            <View style={styles.form}>
              {error && <Text style={styles.errorText}>{error}</Text>}

              {/* Custom Discrete OTP Input UI */}
              <Pressable 
                style={styles.otpContainer} 
                onPress={() => inputRef.current?.focus()}
              >
                {Array(CODE_LENGTH).fill(0).map((_, index) => {
                  const digit = otp[index] || '';
                  const isCurrentDigit = index === otp.length;
                  const isLastDigit = index === CODE_LENGTH - 1;
                  const isCodeComplete = otp.length === CODE_LENGTH;
                  
                  // Highlight the cell that is currently waiting for input
                  const isActive = isCurrentDigit || (isCodeComplete && isLastDigit);

                  return (
                    <View 
                      key={index} 
                      style={[
                        styles.cell, 
                        { backgroundColor: theme.card, borderColor: theme.border },
                        isActive && { borderColor: theme.tint, borderWidth: 2 },
                        error && { borderColor: '#FF3B30' }
                      ]}
                    >
                      <Text style={[styles.cellText, { color: theme.text }]}>
                        {digit}
                      </Text>
                    </View>
                  );
                })}
              </Pressable>

              {/* The Hidden Input powering the UI */}
              <TextInput
                ref={inputRef}
                value={otp}
                onChangeText={handleOtpChange}
                maxLength={CODE_LENGTH}
                keyboardType="number-pad"
                textContentType="oneTimeCode" // Suggests OTP from SMS on iOS
                autoComplete="sms-otp" // Suggests OTP from SMS on Android
                style={styles.hiddenInput}
                autoFocus
              />

              <Text style={[styles.helperText, { color: theme.icon }]}>
                Enter the 6-digit code to securely log in
              </Text>

              {/* Verify Button */}
              <TouchableOpacity
                style={[styles.button, { backgroundColor: theme.tint }, (isLoading || otp.length !== CODE_LENGTH) && styles.buttonDisabled]}
                onPress={handleVerifyOtp}
                disabled={isLoading || otp.length !== CODE_LENGTH}
                activeOpacity={0.8}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.buttonText}>Verify Account</Text>
                )}
              </TouchableOpacity>

              {/* Resend OTP */}
              <View style={styles.resendContainer}>
                <Text style={[styles.resendText, { color: theme.icon }]}>Didn't receive the code? </Text>
                <TouchableOpacity
                  onPress={handleResendOtp}
                  disabled={resendLoading || countdown > 0}
                  style={(countdown > 0 || resendLoading) && styles.resendDisabled}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  {resendLoading ? (
                    <ActivityIndicator size="small" color={theme.tint} />
                  ) : countdown > 0 ? (
                    <Text style={[styles.resendLink, { color: theme.icon }]}>Resend in {countdown}s</Text>
                  ) : (
                    <Text style={[styles.resendLink, { color: theme.tint }]}>Resend OTP</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>

      {showToast && (
        <Animated.View style={[styles.toastContainer, { opacity: fadeAnim }]}>
          <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
          <Text style={styles.toastText}>Email verified successfully!</Text>
        </Animated.View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  flex1: { flex: 1 },
  container: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 8,
  },
  editButton: {
    marginTop: 8,
  },
  editButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  subtitle: {
    fontSize: 15,
    textAlign: 'center',
  },
  form: { gap: 24 },
  
  // Custom OTP Input Styles
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  cell: {
    width: 48,
    height: 56,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cellText: {
    fontSize: 24,
    fontWeight: '600',
  },
  hiddenInput: {
    position: 'absolute',
    width: 1,
    height: 1,
    opacity: 0,
  },
  
  errorText: {
    color: '#FF3B30',
    textAlign: 'center',
    fontSize: 14,
    marginTop: -10,
  },
  helperText: {
    fontSize: 13,
    textAlign: 'center',
    marginTop: -8,
  },
  button: {
    minHeight: 56,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  buttonDisabled: { opacity: 0.5 },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  resendContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  resendText: { fontSize: 14 },
  resendDisabled: { opacity: 0.6 },
  resendLink: {
    fontSize: 14,
    fontWeight: '700',
  },
  toastContainer: {
    position: 'absolute',
    bottom: 110,
    left: 20,
    right: 20,
    backgroundColor: '#333',
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  toastText: {
    color: '#fff',
    fontSize: 16,
    flex: 1,
    fontWeight: '500',
  },
});