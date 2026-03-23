// import React, { useState } from 'react';
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
// import { useRouter } from 'expo-router';
// import { useAuth } from '@/context/AuthContext';
// import { Ionicons } from '@expo/vector-icons';
// import { useTheme } from '@/context/ThemeContext';
// import { Colors } from '@/constants/theme';

// export default function LoginScreen() {
//   const [email, setEmail] = useState('');
//   const [password, setPassword] = useState('');
//   const [isLoading, setIsLoading] = useState(false);
//   const [showPassword, setShowPassword] = useState(false);
//   const { login } = useAuth();
//   const router = useRouter();
//   const { theme: currentTheme } = useTheme();
//   const theme = Colors[currentTheme];

//   const handleLogin = async () => {
//     const normalizedEmail = email.trim().toLowerCase();

//     if (!normalizedEmail || !password) {
//       Alert.alert('Error', 'Please fill in all fields');
//       return;
//     }

//     if (!/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/.test(normalizedEmail)) {
//       Alert.alert('Error', 'Please enter a valid email');
//       return;
//     }

//     setIsLoading(true);
//     try {
//       await login({ email: normalizedEmail, password });
//       // Explicit redirect after auth; auth-gated layout still remains source of truth.
//       router.replace('/(tabs)');
//     } catch (error) {
//       Alert.alert('Login Failed', error instanceof Error ? error.message : 'Unknown error occurred');
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   const handleRegisterNavigation = () => {
//     router.push('/register');
//   };

//   return (
//     <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
//       <ScrollView contentContainerStyle={styles.container}>
//         {/* Header */}
//         <View style={styles.header}>
//           <Ionicons name="wallet-outline" size={48} color={theme.tint} />
//           <Text style={[styles.title, { color: theme.tint }]}>FinVault</Text>
//           <Text style={[styles.subtitle, { color: theme.icon }]}>Manage Your Finances</Text>
//         </View>

//         {/* Form */}
//         <View style={styles.form}>
//           {/* Email Input */}
//           <View style={styles.inputGroup}>
//             <Text style={[styles.label, { color: theme.tint }]}>Email</Text>
//             <View style={[styles.inputContainer, { backgroundColor: theme.card, borderColor: theme.border }]}>
//               <Ionicons name="mail-outline" size={20} color={theme.icon} style={styles.inputIcon} />
//               <TextInput
//                 style={styles.input}
//                 placeholder="your@email.com"
//                 placeholderTextColor={theme.icon}
//                 value={email}
//                 onChangeText={setEmail}
//                 editable={!isLoading}
//                 keyboardType="email-address"
//                 autoCapitalize="none"
//                 selectionColor={theme.tint}
//               />
//             </View>
//           </View>

//           {/* Password Input */}
//           <View style={styles.inputGroup}>
//             <Text style={[styles.label, { color: theme.tint }]}>Password</Text>
//             <View style={[styles.inputContainer, { backgroundColor: theme.card, borderColor: theme.border }]}>
//               <Ionicons name="lock-closed-outline" size={20} color={theme.icon} style={styles.inputIcon} />
//               <TextInput
//                 style={styles.input}
//                 placeholder="••••••••"
//                 placeholderTextColor={theme.icon}
//                 value={password}
//                 onChangeText={setPassword}
//                 editable={!isLoading}
//                 secureTextEntry={!showPassword}
//                 selectionColor={theme.tint}
//               />
//               <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.showButton}>
//                 <Ionicons
//                   name={showPassword ? 'eye-outline' : 'eye-off-outline'}
//                   size={20}
//                   color={theme.icon}
//                 />
//               </TouchableOpacity>
//             </View>
//           </View>

//           {/* Login Button */}
//           <TouchableOpacity
//             style={[styles.button, { backgroundColor: theme.tint }, isLoading && styles.buttonDisabled]}
//             onPress={handleLogin}
//             disabled={isLoading}
//           >
//             {isLoading ? (
//               <ActivityIndicator size="small" color="#fff" />
//             ) : (
//               <Text style={styles.buttonText}>Login</Text>
//             )}
//           </TouchableOpacity>

//           {/* Register Link */}
//           <View style={styles.registerContainer}>
//             <Text style={[styles.registerText, { color: theme.icon }]}>Don't have an account? </Text>
//             <TouchableOpacity onPress={handleRegisterNavigation} disabled={isLoading}>
//               <Text style={[styles.registerLink, { color: theme.tint }]}>Register here</Text>
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
//   title: {
//     fontSize: 32,
//     fontWeight: '700',
//     color: '#2979FF',
//     marginTop: 12,
//   },
//   subtitle: {
//     fontSize: 14,
//     marginTop: 4,
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
//     fontSize: 14,
//   },
//   showButton: {
//     padding: 8,
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
//   registerContainer: {
//     flexDirection: 'row',
//     justifyContent: 'center',
//     marginTop: 12,
//   },
//   registerText: {
//     fontSize: 14,
//   },
//   registerLink: {
//     fontSize: 14,
//     fontWeight: '600',
//   },
// });


import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
import { Colors } from '@/constants/theme';

// Reusable Form Input (Should ideally be extracted to a shared components folder)
interface FormInputProps extends React.ComponentProps<typeof TextInput> {
  label: string;
  icon: any;
  error?: string | null;
  theme: any;
  isPassword?: boolean;
}

const FormInput = React.forwardRef<TextInput, FormInputProps>(({ 
  label, 
  icon, 
  error, 
  theme, 
  isPassword, 
  ...textInputProps 
}, ref) => {
  const [isFocused, setIsFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  return (
    <View style={styles.inputGroup}>
      <Text style={[styles.label, { color: theme.tint }]}>{label}</Text>
      <View 
        style={[
          styles.inputContainer, 
          { 
            backgroundColor: theme.card, 
            borderColor: error ? '#FF3B30' : (isFocused ? theme.tint : theme.border),
            borderWidth: isFocused || error ? 1.5 : 1
          }
        ]}
      >
        <Ionicons name={icon} size={20} color={error ? '#FF3B30' : theme.icon} style={styles.inputIcon} />
        <TextInput
          ref={ref}
          style={[styles.input, { color: theme.text }]}
          placeholderTextColor={theme.icon}
          selectionColor={theme.tint}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          secureTextEntry={isPassword && !showPassword}
          {...textInputProps}
        />
        {isPassword && (
          <TouchableOpacity 
            onPress={() => setShowPassword(!showPassword)} 
            style={styles.showButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons
              name={showPassword ? 'eye-outline' : 'eye-off-outline'}
              size={20}
              color={theme.icon}
            />
          </TouchableOpacity>
        )}
      </View>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
});

export default function LoginScreen() {
  const [formData, setFormData] = useState<Record<string, string>>({ email: 'mailmehere090@gmail.com', password: 'password' });
  const [errors, setErrors] = useState<Record<string, string | undefined | null>>({});
  const [isLoading, setIsLoading] = useState(false);
  
  const { login } = useAuth();
  const router = useRouter();
  const { theme: currentTheme } = useTheme();
  const theme = Colors[currentTheme];

  // Ref for keyboard navigation
  const passwordRef = useRef<TextInput>(null);

  const updateForm = (key: string, value: string) => {
    setFormData(prev => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors(prev => ({ ...prev, [key]: null }));
    if (errors.form) setErrors(prev => ({ ...prev, form: null }));
  };

  const validateForm = () => {
    let newErrors: Record<string, string> = {};
    const { email, password } = formData;

    if (!email.trim()) newErrors.email = 'Email is required';
    else if (!/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/.test(email.trim())) {
      newErrors.email = 'Please enter a valid email';
    }
    
    if (!password) newErrors.password = 'Password is required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    Keyboard.dismiss();

    try {
      await login({ 
        email: formData.email.trim().toLowerCase(), 
        password: formData.password 
      });
      router.replace('/(tabs)');
    } catch (error) {
      setErrors({ form: error instanceof Error ? error.message : 'Invalid email or password' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
        style={styles.flex1}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <ScrollView 
            contentContainerStyle={styles.container}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Header */}
            <View style={styles.header}>
              <View style={[styles.iconContainer, { backgroundColor: theme.card, shadowColor: theme.tint }]}>
                 <Ionicons name="wallet" size={42} color={theme.tint} />
              </View>
              <Text style={[styles.title, { color: theme.text }]}>Welcome Back</Text>
              <Text style={[styles.subtitle, { color: theme.icon }]}>Log in to manage your FinVault</Text>
            </View>

            {/* Global Error Message */}
            {errors.form && <Text style={[styles.errorText, styles.globalError]}>{errors.form}</Text>}

            {/* Form */}
            <View style={styles.form}>
              <FormInput
                label="Email"
                icon="mail-outline"
                placeholder="your@email.com"
                theme={theme}
                value={formData.email}
                onChangeText={(text) => updateForm('email', text)}
                error={errors.email}
                editable={!isLoading}
                keyboardType="email-address"
                autoCapitalize="none"
                returnKeyType="next"
                onSubmitEditing={() => passwordRef.current?.focus()}
              />

              <View>
                <FormInput
                  ref={passwordRef}
                  label="Password"
                  icon="lock-closed-outline"
                  placeholder="••••••••"
                  theme={theme}
                  value={formData.password}
                  onChangeText={(text) => updateForm('password', text)}
                  error={errors.password}
                  editable={!isLoading}
                  isPassword
                  returnKeyType="done"
                  onSubmitEditing={handleLogin}
                />
                
                {/* Forgot Password Link */}
                <TouchableOpacity 
                  style={styles.forgotPassword}
                  onPress={() => router.push('/forgot-password' as any)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Text style={[styles.forgotPasswordText, { color: theme.tint }]}>
                    Forgot Password?
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Login Button */}
              <TouchableOpacity
                style={[styles.button, { backgroundColor: theme.tint }, isLoading && styles.buttonDisabled]}
                onPress={handleLogin}
                disabled={isLoading}
                activeOpacity={0.8}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.buttonText}>Login</Text>
                )}
              </TouchableOpacity>

              {/* Register Link */}
              <View style={styles.registerContainer}>
                <Text style={[styles.registerText, { color: theme.icon }]}>Don't have an account? </Text>
                <TouchableOpacity 
                  onPress={() => router.push('/register')} 
                  disabled={isLoading}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Text style={[styles.registerLink, { color: theme.tint }]}>Register here</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  flex1: { flex: 1 },
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
  },
  form: { gap: 20 },
  inputGroup: { gap: 6 },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    paddingHorizontal: 14,
    minHeight: 52,
  },
  inputIcon: { marginRight: 10 },
  input: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 14,
  },
  showButton: { padding: 8 },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginTop: 12,
  },
  forgotPasswordText: {
    fontSize: 13,
    fontWeight: '600',
  },
  errorText: {
    color: '#FF3B30',
    fontSize: 12,
    marginLeft: 4,
    marginTop: -2,
  },
  globalError: {
    textAlign: 'center',
    marginBottom: 16,
    fontSize: 14,
    padding: 10,
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
    borderRadius: 8,
    overflow: 'hidden',
  },
  button: {
    borderRadius: 14,
    minHeight: 56,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  registerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 16,
  },
  registerText: { fontSize: 14 },
  registerLink: {
    fontSize: 14,
    fontWeight: '700',
  },
});