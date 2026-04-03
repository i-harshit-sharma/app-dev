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
  TextInputProps,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
import { Colors } from '@/constants/theme';

interface FormInputProps extends TextInputProps {
  label: string;
  icon: any; // Using any for icon name to avoid complex Ionicon type issues for now, but label is typed
  error?: string;
  theme: any;
  isPassword?: boolean;
}

// 1. Abstracted Reusable Input Component with forwardRef for keyboard navigation
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
          placeholderTextColor="#A0A0A0"
          selectionColor={theme.tint}
          onFocus={(e) => {
            setIsFocused(true);
            textInputProps.onFocus?.(e);
          }}
          onBlur={(e) => {
            setIsFocused(false);
            textInputProps.onBlur?.(e);
          }}
          secureTextEntry={isPassword && !showPassword}
          {...textInputProps}
        />
        {isPassword && (
          <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.showButton}>
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

type FormDataType = typeof initialFormData;
type FormErrors = Partial<Record<keyof FormDataType | 'form', string>>;

const initialFormData = {
  name: '',
  email: '',
  phone: '',
  password: '',
  confirmPassword: '',
};

export default function RegisterScreen() {
  const [formData, setFormData] = useState<FormDataType>(initialFormData);
  const [errors, setErrors] = useState<FormErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  
  const { register } = useAuth();
  const router = useRouter();
  const { theme: currentTheme } = useTheme();
  const theme = Colors[currentTheme];

  // Refs for smooth keyboard navigation
  const emailRef = useRef<TextInput>(null);
  const phoneRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const confirmRef = useRef<TextInput>(null);

  const updateForm = (key: keyof FormDataType, value: string) => {
    setFormData(prev => ({ ...prev, [key]: value }));
    if (errors[key]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[key];
        return newErrors;
      });
    }
  };

  const validateForm = () => {
    let newErrors: FormErrors = {};
    const { name, email, phone, password, confirmPassword } = formData;

    if (!name.trim()) newErrors.name = 'Name is required';
    if (!/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/.test(email.trim())) newErrors.email = 'Valid email is required';
    if (!/^[0-9]{10}$/.test(phone.trim())) newErrors.phone = 'Valid 10-digit phone number is required';
    if (password.length < 6) newErrors.password = 'Password must be at least 6 characters';
    if (password !== confirmPassword) newErrors.confirmPassword = 'Passwords do not match';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRegister = async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      await register({ 
        name: formData.name.trim(), 
        email: formData.email.trim().toLowerCase(), 
        phone: formData.phone.trim(), 
        password: formData.password,
        passwordConfirm: formData.confirmPassword // User calls it confirmPassword locally, backend likely expects passwordConfirm
      });
      router.push({ pathname: '/verify-otp', params: { email: formData.email.trim().toLowerCase() } });
    } catch (error) {
      setErrors({ form: error instanceof Error ? error.message : 'Registration failed' });
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
            <View style={styles.header}>
              <Ionicons name="wallet-outline" size={48} color={theme.tint} />
              <Text style={[styles.title, { color: theme.text }]}>Create Account</Text>
              <Text style={[styles.subtitle, { color: theme.icon }]}>Join FinVault today</Text>
            </View>

            {errors.form && <Text style={[styles.errorText, styles.globalError]}>{errors.form}</Text>}

            <View style={styles.form}>
              <FormInput
                label="Full Name"
                icon="person-outline"
                placeholder="John Doe"
                theme={theme}
                value={formData.name}
                onChangeText={(text) => updateForm('name', text)}
                error={errors.name}
                editable={!isLoading}
                autoCapitalize="words"
                returnKeyType="next"
                onSubmitEditing={() => emailRef.current?.focus()}
              />

              <FormInput
                ref={emailRef}
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
                onSubmitEditing={() => phoneRef.current?.focus()}
              />

              <FormInput
                ref={phoneRef}
                label="Phone Number"
                icon="call-outline"
                placeholder="XXX-XXX-XXXX"
                theme={theme}
                value={formData.phone}
                onChangeText={(text) => updateForm('phone', text)}
                error={errors.phone}
                editable={!isLoading}
                keyboardType="phone-pad"
                maxLength={10}
                returnKeyType="next"
                onSubmitEditing={() => passwordRef.current?.focus()}
              />

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
                returnKeyType="next"
                onSubmitEditing={() => confirmRef.current?.focus()}
              />

              <FormInput
                ref={confirmRef}
                label="Confirm Password"
                icon="lock-closed-outline"
                placeholder="••••••••"
                theme={theme}
                value={formData.confirmPassword}
                onChangeText={(text) => updateForm('confirmPassword', text)}
                error={errors.confirmPassword}
                editable={!isLoading}
                isPassword
                returnKeyType="done"
                onSubmitEditing={handleRegister}
              />

              <TouchableOpacity
                style={[styles.button, { backgroundColor: theme.tint }, isLoading && styles.buttonDisabled]}
                onPress={handleRegister}
                disabled={isLoading}
                activeOpacity={0.8}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.buttonText}>Register</Text>
                )}
              </TouchableOpacity>

              <View style={styles.loginContainer}>
                <Text style={[styles.loginText, { color: theme.icon }]}>Already have an account? </Text>
                <TouchableOpacity onPress={() => router.push('/login')} disabled={isLoading} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <Text style={[styles.loginLink, { color: theme.tint }]}>Login here</Text>
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
    paddingVertical: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 6,
    marginTop: 16,
  },
  subtitle: { fontSize: 16 },
  form: { gap: 16 },
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
    fontSize: 16,
    fontWeight: '500',
    paddingVertical: 14,
  },
  showButton: { padding: 8 },
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
  },
  button: {
    borderRadius: 14,
    minHeight: 56,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
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
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 16,
  },
  loginText: { fontSize: 14 },
  loginLink: {
    fontSize: 14,
    fontWeight: '700',
  },
});