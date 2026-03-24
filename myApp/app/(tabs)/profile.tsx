import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useState, useEffect, useRef } from 'react';
import {
    Alert,
    FlatList,
    Image,
    Linking,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    TouchableOpacity,
    View,
    ActivityIndicator,
    KeyboardAvoidingView,
    Animated,
} from 'react-native';
import * as SecureStore from 'expo-secure-store';

import { Colors } from '@/constants/theme';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { useTransactions } from '@/context/TransactionContext';
import { useNotifications } from '@/context/NotificationContext';
import { useRouter } from 'expo-router';

const getProfileImage = (name?: string) => {
    const displayName = name || 'User';
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=0D8ABC&color=fff&size=300`;
};

const LANGUAGES = [
    { code: 'en', label: 'English (US)', flag: '🇺🇸' },
    { code: 'es', label: 'Español', flag: '🇪🇸' },
    { code: 'hi', label: 'हिंदी', flag: '🇮🇳' },
    { code: 'fr', label: 'Français', flag: '🇫🇷' },
    { code: 'de', label: 'Deutsch', flag: '🇩🇪' },
    { code: 'zh', label: '中文', flag: '🇨🇳' },
    { code: 'ar', label: 'العربية', flag: '🇸🇦' },
    { code: 'pt', label: 'Português', flag: '🇧🇷' },
];

const PREF_KEYS = {
    language: 'selectedLanguage',
    faceId: 'faceIdEnabled',
} as const;

async function getPref(key: string): Promise<string | null> {
    try {
        return await SecureStore.getItemAsync(key);
    } catch {
        return null;
    }
}

async function setPref(key: string, value: string): Promise<boolean> {
    try {
        await SecureStore.setItemAsync(key, value);
        return true;
    } catch {
        return false;
    }
}

export default function ProfileScreen() {
    const { theme: currentTheme, toggleTheme } = useTheme();
    const { user, logout, updateProfile } = useAuth();
    const { financialPlan, updateFinancialPlan, getWeeklyBudgetAllocation, getFinancialHealth } = useTransactions();
    const { notifications, hasPermission, clearAll, clearOne, openPermissionSettings, isLoading: isNotifLoading } = useNotifications();
    const router = useRouter();
    const theme = Colors[currentTheme];
    const isDark = currentTheme === 'dark';

    // ── Language ──────────────────────────────────────────────────
    const [selectedLanguage, setSelectedLanguage] = useState(LANGUAGES[0]);
    const [languageVisible, setLanguageVisible] = useState(false);

    // ── Face ID ──────────────────────────────────────────────────
    const [faceIdEnabled, setFaceIdEnabled] = useState(false);

    // ── Change PIN ───────────────────────────────────────────────
    const [pinVisible, setPinVisible] = useState(false);
    const [pinStep, setPinStep] = useState<'new' | 'confirm'>('new');
    const [pinValue, setPinValue] = useState('');
    const [confirmPinValue, setConfirmPinValue] = useState('');
    const [pinLoading, setPinLoading] = useState(false);
    const [pinError, setPinError] = useState('');

    // ── Help Center & Privacy Policy ─────────────────────────────
    const [helpVisible, setHelpVisible] = useState(false);
    const [privacyVisible, setPrivacyVisible] = useState(false);
    const [notificationsVisible, setNotificationsVisible] = useState(false);

    // ── Financial Plan ────────────────────────────────────────────
    const [financialPlanVisible, setFinancialPlanVisible] = useState(false);
    const [monthlyIncomeInput, setMonthlyIncomeInput] = useState('');
    const [monthlyBudgetInput, setMonthlyBudgetInput] = useState('');
    const [emiInput, setEmiInput] = useState('');
    const [fixedOtherInput, setFixedOtherInput] = useState('');
    const [sipInput, setSipInput] = useState('');
    const [mutualFundsInput, setMutualFundsInput] = useState('');
    const [otherSavingsInput, setOtherSavingsInput] = useState('');
    const [showToast, setShowToast] = useState(false);
    const [toastMessage, setToastMessage] = useState('');
    const [toastType, setToastType] = useState<'success' | 'error' | 'info'>('info');
    const fadeAnim = useRef(new Animated.Value(0)).current;

    // Load persisted preferences on mount
    useEffect(() => {
        const loadPrefs = async () => {
            try {
                const savedLang = await getPref(PREF_KEYS.language);
                if (savedLang) {
                    const found = LANGUAGES.find(l => l.code === savedLang);
                    if (found) setSelectedLanguage(found);
                }
                const savedFaceId = await getPref(PREF_KEYS.faceId);
                if (savedFaceId !== null) setFaceIdEnabled(savedFaceId === 'true');

            } catch { /* ignore */ }
        };
        loadPrefs();
    }, []);

    const formatINR = (num: number | string) => {
        const val = typeof num === 'number' ? Math.round(num).toString() : num.replace(/[^0-9]/g, '');
        if (!val) return '';
        const lastThree = val.substring(val.length - 3);
        const otherNumbers = val.substring(0, val.length - 3);
        if (otherNumbers !== '') {
            return otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ",") + "," + lastThree;
        }
        return lastThree;
    };

    const openFinancialPlanModal = () => {
        setMonthlyIncomeInput(financialPlan.monthlyIncome ? formatINR(financialPlan.monthlyIncome) : '');
        setMonthlyBudgetInput(financialPlan.monthlyBudget ? formatINR(financialPlan.monthlyBudget) : '');
        setEmiInput(financialPlan.fixedObligations.emi ? formatINR(financialPlan.fixedObligations.emi) : '');
        const fixedOther = (financialPlan.fixedObligations.rentAndUtilities + financialPlan.fixedObligations.otherFixed);
        setFixedOtherInput(fixedOther ? formatINR(fixedOther) : '');
        setSipInput(financialPlan.savingsInvestments.sip ? formatINR(financialPlan.savingsInvestments.sip) : '');
        setMutualFundsInput(financialPlan.savingsInvestments.mutualFunds ? formatINR(financialPlan.savingsInvestments.mutualFunds) : '');
        setOtherSavingsInput(financialPlan.savingsInvestments.otherSavings ? formatINR(financialPlan.savingsInvestments.otherSavings) : '');
        setFinancialPlanVisible(true);
    };

    const toNumber = (value: string) => {
        const sanitized = (value || '').replace(/,/g, '').replace(/[^0-9.]/g, '').trim();
        const numeric = Number(sanitized);
        return Number.isFinite(numeric) && numeric >= 0 ? numeric : 0;
    };

    const displayToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
        setToastMessage(message);
        setToastType(type);
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
            }).start(() => setShowToast(false));
        }, 3000);
    };

    const handleSaveFinancialPlan = async () => {

        const persisted = await updateFinancialPlan({
            monthlyIncome: toNumber(monthlyIncomeInput),
            monthlyBudget: toNumber(monthlyBudgetInput),
            fixedObligations: {
                emi: toNumber(emiInput),
                rentAndUtilities: toNumber(fixedOtherInput),
                otherFixed: 0,
            },
            savingsInvestments: {
                sip: toNumber(sipInput),
                mutualFunds: toNumber(mutualFundsInput),
                otherSavings: toNumber(otherSavingsInput),
            },
        });

        setFinancialPlanVisible(false);
        if (!persisted) {
            displayToast('Financial plan updated, but could not be saved permanently.', 'info');
            return;
        }
        displayToast('Financial plan updated successfully.', 'success');
    };

    const handleLanguageSelect = async (lang: typeof LANGUAGES[0]) => {
        setSelectedLanguage(lang);
        setLanguageVisible(false);
        await setPref(PREF_KEYS.language, lang.code);
    };

    const handleFaceIdToggle = async (value: boolean) => {
        setFaceIdEnabled(value);
        await setPref(PREF_KEYS.faceId, String(value));
        if (value) {
            displayToast('Face ID Enabled. Biometric login ready.', 'success');
        }
    };

    const openChangePinModal = () => {
        setPinStep('new');
        setPinValue('');
        setConfirmPinValue('');
        setPinError('');
        setPinVisible(true);
    };

    const handlePinNext = () => {
        if (pinValue.length !== 4) {
            setPinError('PIN must be exactly 4 digits.');
            return;
        }
        setPinError('');
        setPinStep('confirm');
        setConfirmPinValue('');
    };

    const handlePinSave = async () => {
        if (confirmPinValue.length !== 4) {
            setPinError('Please enter the 4-digit PIN to confirm.');
            return;
        }
        if (pinValue !== confirmPinValue) {
            setPinError('PINs do not match. Please try again.');
            setPinStep('new');
            setPinValue('');
            setConfirmPinValue('');
            return;
        }
        setPinLoading(true);
        try {
            await SecureStore.setItemAsync('userPIN', pinValue);
            setPinVisible(false);
            displayToast('Your PIN has been set successfully.', 'success');
        } catch {
            setPinError('Failed to save PIN. Please try again.');
        } finally {
            setPinLoading(false);
        }
    };

    // ── Edit profile modal state ──────────────────────────────────
    const [editVisible, setEditVisible] = useState(false);
    const [editName, setEditName] = useState('');
    const [editEmail, setEditEmail] = useState('');
    const [editPhone, setEditPhone] = useState('');
    const [editPassword, setEditPassword] = useState('');
    const [editPasswordConfirm, setEditPasswordConfirm] = useState('');
    const [editLoading, setEditLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);

    const openEditModal = () => {
        setEditName(user?.name || '');
        setEditEmail(user?.email || '');
        setEditPhone(user?.phone || '');
        setEditPassword('');
        setEditPasswordConfirm('');
        setEditVisible(true);
    };

    const handleSaveProfile = async () => {
        if (!editName.trim()) {
            displayToast('Name cannot be empty.', 'error');
            return;
        }
        if (!editEmail.trim()) {
            displayToast('Email cannot be empty.', 'error');
            return;
        }
        if (!editPhone.trim()) {
            displayToast('Phone cannot be empty.', 'error');
            return;
        }
        if (editPassword || editPasswordConfirm) {
            if (editPassword !== editPasswordConfirm) {
                displayToast('Passwords do not match.', 'error');
                return;
            }
            if (editPassword.length < 6) {
                displayToast('Password must be at least 6 characters.', 'error');
                return;
            }
        }

        setEditLoading(true);
        try {
            const payload: { name?: string; email?: string; phone?: string; password?: string; passwordConfirm?: string } = {
                name: editName.trim(),
                email: editEmail.trim(),
                phone: editPhone.trim(),
            };
            if (editPassword) {
                payload.password = editPassword;
                payload.passwordConfirm = editPasswordConfirm;
            }
            await updateProfile(payload);
            setEditVisible(false);
            displayToast('Profile updated successfully!', 'success');
        } catch (error: any) {
            displayToast(error.message || 'Failed to update profile.', 'error');
        } finally {
            setEditLoading(false);
        }
    };

    const handleLogout = () => {
        Alert.alert(
            'Logout',
            'Are you sure you want to logout?',
            [
                {
                    text: 'Cancel',
                    onPress: () => { },
                    style: 'cancel',
                },
                {
                    text: 'Logout',
                    onPress: async () => {
                        try {
                            await logout();
                            router.replace('/login');
                        } catch (error) {
                            displayToast('Failed to logout', 'error');
                        }
                    },
                    style: 'destructive',
                },
            ]
        );
    };

    // Stats Data
    const weeklyBudget = getWeeklyBudgetAllocation();
    const health = getFinancialHealth();

    const stats = [
        {
            label: 'Monthly Income',
            value: `₹${Math.round(financialPlan.monthlyIncome).toLocaleString('en-IN')}`,
            icon: 'wallet',
            color: theme.emerald,
            onPress: openFinancialPlanModal,
            editable: true,
        },
        {
            label: 'Monthly Budget',
            value: `₹${Math.round(financialPlan.monthlyBudget).toLocaleString('en-IN')}`,
            icon: 'cash',
            color: theme.tint,
            onPress: openFinancialPlanModal,
            editable: true,
        },
        {
            label: 'Weekly Budget',
            value: `₹${Math.round(weeklyBudget).toLocaleString('en-IN')}`,
            icon: 'calendar-week',
            color: theme.warning,
            editable: false,
        },
        {
            label: 'Health Score',
            value: `${Math.round(health.score)}/100`,
            icon: 'heart-pulse',
            color: theme.expense,
            editable: false,
        },
    ];

    const SettingItem = ({
        icon,
        title,
        subtitle,
        onPress,
        isSwitch,
        switchValue,
        onSwitchChange,
        destructive,
        color
    }: {
        icon: any;
        title: string;
        subtitle?: string;
        onPress?: () => void;
        isSwitch?: boolean;
        switchValue?: boolean;
        onSwitchChange?: (val: boolean) => void;
        destructive?: boolean;
        color?: string;
    }) => (
        <TouchableOpacity
            style={styles.settingItem}
            onPress={onPress}
            disabled={isSwitch}
            activeOpacity={0.7}
        >
            <View style={[
                styles.iconContainer,
                { backgroundColor: destructive ? theme.dangerLight : (isDark ? 'rgba(255,255,255,0.05)' : '#F3F4F6') }
            ]}>
                <Ionicons
                    name={icon}
                    size={22}
                    color={destructive ? theme.danger : (color || theme.text)}
                />
            </View>
            <View style={styles.settingContent}>
                <Text style={[
                    styles.settingTitle,
                    { color: destructive ? theme.danger : theme.text }
                ]}>
                    {title}
                </Text>
                {subtitle && <Text style={[styles.settingSubtitle, { color: theme.icon }]}>{subtitle}</Text>}
            </View>

            {isSwitch ? (
                <Switch
                    value={switchValue}
                    onValueChange={onSwitchChange}
                    trackColor={{ false: '#767577', true: theme.tint }}
                    thumbColor={'#fff'}
                    ios_backgroundColor="#3e3e3e"
                />
            ) : (
                <Ionicons name="chevron-forward" size={20} color={theme.icon} style={{ opacity: 0.5 }} />
            )}
        </TouchableOpacity>
    );

    const Section = ({ title, children }: { title?: string, children: React.ReactNode }) => (
        <View style={styles.sectionWrapper}>
            {title && <Text style={[styles.sectionTitle, { color: theme.icon }]}>{title}</Text>}
            <View style={[styles.sectionContainer, { backgroundColor: theme.card, borderColor: theme.border }]}>
                {children}
            </View>
        </View>
    );

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Header */}
                <View style={[styles.header, { backgroundColor: theme.card }]}>
                    <View style={styles.avatarContainer}>
                        <LinearGradient
                            colors={[theme.tint, theme.emerald]}
                            style={styles.avatarGradient}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                        >
                            <Image
                                source={{ uri: getProfileImage(user?.name) }}
                                style={[styles.avatar, { borderColor: theme.card }]}
                            />
                        </LinearGradient>
                        <View style={styles.onlineBadge} />
                    </View>

                    <View style={styles.headerInfo}>
                        <Text style={[styles.name, { color: theme.text }]}>{user?.name || 'User'}</Text>
                        <Text style={[styles.email, { color: theme.icon }]}>{user?.email || 'email@example.com'}</Text>
                        <TouchableOpacity
                            style={[styles.editProfileBtn, { backgroundColor: theme.card, borderColor: theme.border }]}
                            onPress={openEditModal}
                        >
                            <Text style={[styles.editProfileText, { color: theme.text }]}>Edit Profile</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Prominent Action Button */}
                <TouchableOpacity
                    style={[styles.prominentBtn, { backgroundColor: theme.background }]}
                    onPress={openFinancialPlanModal}
                    activeOpacity={0.85}
                >
                    <View style={[styles.prominentIconContainer, { backgroundColor: theme.card }]}>
                        <Ionicons name="wallet-outline" size={24} color={theme.text} />
                    </View>
                    <View style={styles.prominentTextContainer}>
                        <Text style={[styles.prominentTitle, { color: theme.text }]}>Update Financial Plan</Text>
                        <Text style={[styles.prominentSubtitle, { color: theme.icon }]}>Set your income, budget, and savings targets</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={theme.text} />
                </TouchableOpacity>

                {/* Stats Row */}
                <View style={styles.statsContainer}>
                    {stats.map((stat, index) => (
                        <TouchableOpacity
                            key={index}
                            style={[
                                styles.statCard,
                                { backgroundColor: theme.card, borderColor: theme.border }
                            ]}
                            activeOpacity={stat.editable ? 0.75 : 1}
                            onPress={stat.onPress}
                            disabled={!stat.onPress}
                        >
                            <View style={[styles.statIcon, { backgroundColor: stat.color + '15' }]}>
                                <MaterialCommunityIcons name={stat.icon as any} size={20} color={stat.color} />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={[styles.statLabel, { color: theme.icon }]} numberOfLines={1}>{stat.label}</Text>
                                <Text style={[styles.statValue, { color: theme.text }]} numberOfLines={1}>{stat.value}</Text>
                            </View>
                        </TouchableOpacity>
                    ))}
                </View>


                <View style={styles.settingsContainer}>
                    <Section title="Preferences">
                        <SettingItem
                            icon={isDark ? "moon" : "sunny"}
                            title="Dark Mode"
                            isSwitch
                            switchValue={isDark}
                            onSwitchChange={toggleTheme}
                            color={theme.warning}
                        />
                        <View style={[styles.separator, { backgroundColor: theme.border }]} />
                        <SettingItem
                            icon="notifications"
                            title="Notifications"
                            subtitle="Email, Push"
                            color={theme.expense}
                            onPress={() => setNotificationsVisible(true)}
                        />
                        <View style={[styles.separator, { backgroundColor: theme.border }]} />
                        <SettingItem
                            icon="language"
                            title="Language"
                            subtitle={selectedLanguage.label}
                            color={theme.emerald}
                            onPress={() => setLanguageVisible(true)}
                        />
                    </Section>

                    <Section title="Security">
                        <SettingItem
                            icon="shield-checkmark"
                            title="Face ID"
                            isSwitch
                            switchValue={faceIdEnabled}
                            onSwitchChange={handleFaceIdToggle}
                            color={theme.success}
                        />
                        <View style={[styles.separator, { backgroundColor: theme.border }]} />
                        <SettingItem
                            icon="key"
                            title="Change PIN"
                            color={theme.electricBlue}
                            onPress={openChangePinModal}
                        />
                    </Section>

                    <Section title="Support">
                        <SettingItem
                            icon="help-circle"
                            title="Help Center"
                            color={theme.text}
                            onPress={() => setHelpVisible(true)}
                        />
                        <View style={[styles.separator, { backgroundColor: theme.border }]} />
                        <SettingItem
                            icon="document-text"
                            title="Privacy Policy"
                            color={theme.text}
                            onPress={() => setPrivacyVisible(true)}
                        />
                    </Section>

                    <TouchableOpacity
                        style={[styles.logoutBtn, { backgroundColor: theme.danger + '15' }]}
                        activeOpacity={0.7}
                        onPress={handleLogout}
                    >
                        <Ionicons name="log-out-outline" size={20} color={theme.danger} />
                        <Text style={[styles.logoutText, { color: theme.danger }]}>Log Out</Text>
                    </TouchableOpacity>

                    <Text style={[styles.version, { color: theme.icon }]}>Version 2.4.0 (Build 305)</Text>

                    {/* Bottom Padding */}
                    {/* <View style={{ height: 100 }} /> */}
                </View>
            </ScrollView>

            {/* Edit Profile Modal */}
            <Modal
                visible={editVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setEditVisible(false)}
            >
                <KeyboardAvoidingView
                    style={styles.modalOverlay}
                    // behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                >
                    <View style={[styles.modalContainer, { backgroundColor: theme.card }]}>
                        {/* Modal Header */}
                        <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
                            <TouchableOpacity onPress={() => setEditVisible(false)} style={styles.modalCloseBtn}>
                                <Ionicons name="close" size={24} color={theme.text} />
                            </TouchableOpacity>
                            <Text style={[styles.modalTitle, { color: theme.text }]}>Edit Profile</Text>
                            <View style={{ width: 36 }} />
                        </View>

                        <ScrollView contentContainerStyle={styles.modalBody} keyboardShouldPersistTaps="handled">
                            <Text style={[styles.fieldLabel, { color: theme.icon }]}>Full Name</Text>
                            <View style={[styles.inputWrapper, { backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : '#F3F4F6', borderColor: theme.border }]}>
                                <Ionicons name="person-outline" size={18} color={theme.icon} style={styles.inputIcon} />
                                <TextInput
                                    style={[styles.input, { color: theme.text }]}
                                    value={editName}
                                    onChangeText={setEditName}
                                    placeholder="Enter your name"
                                    placeholderTextColor={theme.icon}
                                    autoCapitalize="words"
                                />
                            </View>

                            <Text style={[styles.fieldLabel, { color: theme.icon }]}>Email Address</Text>
                            <View style={[styles.inputWrapper, { backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : '#F3F4F6', borderColor: theme.border }]}>
                                <Ionicons name="mail-outline" size={18} color={theme.icon} style={styles.inputIcon} />
                                <TextInput
                                    style={[styles.input, { color: theme.text }]}
                                    value={editEmail}
                                    onChangeText={setEditEmail}
                                    placeholder="Enter your email"
                                    placeholderTextColor={theme.icon}
                                    keyboardType="email-address"
                                    autoCapitalize="none"
                                />
                            </View>

                            <Text style={[styles.fieldLabel, { color: theme.icon }]}>Phone Number</Text>
                            <View style={[styles.inputWrapper, { backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : '#F3F4F6', borderColor: theme.border }]}>
                                <Ionicons name="call-outline" size={18} color={theme.icon} style={styles.inputIcon} />
                                <TextInput
                                    style={[styles.input, { color: theme.text }]}
                                    value={editPhone}
                                    onChangeText={setEditPhone}
                                    placeholder="Enter 10-digit phone number"
                                    placeholderTextColor={theme.icon}
                                    keyboardType="phone-pad"
                                    maxLength={10}
                                />
                            </View>

                            <View style={[styles.divider, { backgroundColor: theme.border }]} />
                            <Text style={[styles.sectionLabel, { color: theme.icon }]}>Change Password (optional)</Text>

                            <Text style={[styles.fieldLabel, { color: theme.icon }]}>New Password</Text>
                            <View style={[styles.inputWrapper, { backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : '#F3F4F6', borderColor: theme.border }]}>
                                <Ionicons name="lock-closed-outline" size={18} color={theme.icon} style={styles.inputIcon} />
                                <TextInput
                                    style={[styles.input, { color: theme.text }]}
                                    value={editPassword}
                                    onChangeText={setEditPassword}
                                    placeholder="Leave blank to keep current"
                                    placeholderTextColor={theme.icon}
                                    secureTextEntry={!showPassword}
                                    autoCapitalize="none"
                                />
                                <TouchableOpacity onPress={() => setShowPassword(v => !v)} style={styles.eyeBtn}>
                                    <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={18} color={theme.icon} />
                                </TouchableOpacity>
                            </View>

                            <Text style={[styles.fieldLabel, { color: theme.icon }]}>Confirm New Password</Text>
                            <View style={[styles.inputWrapper, { backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : '#F3F4F6', borderColor: theme.border }]}>
                                <Ionicons name="lock-closed-outline" size={18} color={theme.icon} style={styles.inputIcon} />
                                <TextInput
                                    style={[styles.input, { color: theme.text }]}
                                    value={editPasswordConfirm}
                                    onChangeText={setEditPasswordConfirm}
                                    placeholder="Confirm new password"
                                    placeholderTextColor={theme.icon}
                                    secureTextEntry={!showPasswordConfirm}
                                    autoCapitalize="none"
                                />
                                <TouchableOpacity onPress={() => setShowPasswordConfirm(v => !v)} style={styles.eyeBtn}>
                                    <Ionicons name={showPasswordConfirm ? 'eye-off-outline' : 'eye-outline'} size={18} color={theme.icon} />
                                </TouchableOpacity>
                            </View>

                            <TouchableOpacity
                                style={[styles.saveBtn, { backgroundColor: theme.tint, opacity: editLoading ? 0.7 : 1 }]}
                                onPress={handleSaveProfile}
                                disabled={editLoading}
                                activeOpacity={0.8}
                            >
                                {editLoading ? (
                                    <ActivityIndicator color="#fff" size="small" />
                                ) : (
                                    <Text style={styles.saveBtnText}>Save Changes</Text>
                                )}
                            </TouchableOpacity>

                            {/* <View style={{ height: 32 }} /> */}
                        </ScrollView>
                    </View>
                </KeyboardAvoidingView>
            </Modal>

            {/* ── Language Picker Modal ───────────────────────────────── */}
            <Modal visible={languageVisible} animationType="slide" transparent onRequestClose={() => setLanguageVisible(false)}>
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContainer, { backgroundColor: theme.card }]}>
                        <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
                            <TouchableOpacity onPress={() => setLanguageVisible(false)} style={styles.modalCloseBtn}>
                                <Ionicons name="close" size={24} color={theme.text} />
                            </TouchableOpacity>
                            <Text style={[styles.modalTitle, { color: theme.text }]}>Select Language</Text>
                            <View style={{ width: 36 }} />
                        </View>
                        <FlatList
                            data={LANGUAGES}
                            keyExtractor={item => item.code}
                            contentContainerStyle={{ padding: 16 }}
                            renderItem={({ item }) => {
                                const isSelected = item.code === selectedLanguage.code;
                                return (
                                    <TouchableOpacity
                                        style={[styles.langItem, { borderColor: isSelected ? theme.tint : theme.border, backgroundColor: isSelected ? theme.tint + '15' : 'transparent' }]}
                                        onPress={() => handleLanguageSelect(item)}
                                        activeOpacity={0.7}
                                    >
                                        <Text style={styles.langFlag}>{item.flag}</Text>
                                        <Text style={[styles.langLabel, { color: theme.text }]}>{item.label}</Text>
                                        {isSelected && <Ionicons name="checkmark-circle" size={22} color={theme.tint} />}
                                    </TouchableOpacity>
                                );
                            }}
                        />
                        <View style={{ height: 32 }} />
                    </View>
                </View>
            </Modal>

            {/* ── Change PIN Modal ────────────────────────────────────── */}
            <Modal visible={pinVisible} animationType="slide" transparent onRequestClose={() => setPinVisible(false)}>
                <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
                    <View style={[styles.modalContainer, { backgroundColor: theme.card }]}>
                        <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
                            <TouchableOpacity onPress={() => setPinVisible(false)} style={styles.modalCloseBtn}>
                                <Ionicons name="close" size={24} color={theme.text} />
                            </TouchableOpacity>
                            <Text style={[styles.modalTitle, { color: theme.text }]}>Change PIN</Text>
                            <View style={{ width: 36 }} />
                        </View>
                        <View style={styles.modalBody}>
                            <View style={styles.pinIconWrapper}>
                                <Ionicons name="keypad-outline" size={52} color={theme.tint} />
                            </View>
                            <Text style={[styles.pinInstruction, { color: theme.text }]}>
                                {pinStep === 'new' ? 'Enter your new 4-digit PIN' : 'Confirm your new 4-digit PIN'}
                            </Text>
                            {pinError ? <Text style={[styles.pinError, { color: theme.danger }]}>{pinError}</Text> : null}
                            <View style={[styles.inputWrapper, { backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : '#F3F4F6', borderColor: pinError ? theme.danger : theme.border }]}>
                                <Ionicons name="lock-closed-outline" size={18} color={theme.icon} style={styles.inputIcon} />
                                <TextInput
                                    style={[styles.input, { color: theme.text, letterSpacing: 10, fontSize: 20 }]}
                                    value={pinStep === 'new' ? pinValue : confirmPinValue}
                                    onChangeText={pinStep === 'new'
                                        ? (v) => { setPinValue(v); setPinError(''); }
                                        : (v) => { setConfirmPinValue(v); setPinError(''); }
                                    }
                                    keyboardType="numeric"
                                    maxLength={4}
                                    secureTextEntry
                                    placeholder="••••"
                                    placeholderTextColor={theme.icon}
                                    autoFocus
                                />
                            </View>
                            <TouchableOpacity
                                style={[styles.saveBtn, { backgroundColor: theme.tint, opacity: pinLoading ? 0.7 : 1 }]}
                                onPress={pinStep === 'new' ? handlePinNext : handlePinSave}
                                disabled={pinLoading}
                                activeOpacity={0.8}
                            >
                                {pinLoading
                                    ? <ActivityIndicator color="#fff" size="small" />
                                    : <Text style={styles.saveBtnText}>{pinStep === 'new' ? 'Next' : 'Save PIN'}</Text>
                                }
                            </TouchableOpacity>
                            {pinStep === 'confirm' && (
                                <TouchableOpacity style={styles.pinBackBtn} onPress={() => { setPinStep('new'); setPinError(''); setConfirmPinValue(''); }}>
                                    <Text style={[styles.pinBackText, { color: theme.tint }]}>← Change PIN</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>

            {/* ── Help Center Modal ───────────────────────────────────── */}
            <Modal visible={helpVisible} animationType="slide" transparent onRequestClose={() => setHelpVisible(false)}>
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContainer, { backgroundColor: theme.card }]}>
                        <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
                            <TouchableOpacity onPress={() => setHelpVisible(false)} style={styles.modalCloseBtn}>
                                <Ionicons name="close" size={24} color={theme.text} />
                            </TouchableOpacity>
                            <Text style={[styles.modalTitle, { color: theme.text }]}>Help Center</Text>
                            <View style={{ width: 36 }} />
                        </View>
                        <ScrollView contentContainerStyle={styles.modalBody}>
                            {[
                                { q: 'How do I add a transaction?', a: 'Tap the + button on the Home screen. Fill in the amount, category, and date, then tap Save.' },
                                { q: 'How do I set a budget?', a: 'Go to the Budget tab. Tap "Set Budget" to define monthly spending limits per category.' },
                                { q: 'Can I export my data?', a: 'Yes! Go to Profile → Settings → Export Data to download a CSV of all your transactions.' },
                                { q: 'How do I change my password?', a: 'Tap "Edit Profile" on the Profile screen and use the Change Password section at the bottom.' },
                                { q: 'What is the AI Chat feature?', a: 'The AI Chat tab lets you ask questions about your spending, get financial advice, and generate reports using natural language.' },
                                { q: 'Is my data secure?', a: 'All data is encrypted in transit (HTTPS) and at rest. We never share your personal information with third parties.' },
                                { q: 'How do I contact support?', a: 'Email us at support@financeapp.com or tap the button below.' },
                            ].map((faq, i) => (
                                <View key={i} style={[styles.faqItem, { borderColor: theme.border }]}>
                                    <Text style={[styles.faqQ, { color: theme.text }]}>{faq.q}</Text>
                                    <Text style={[styles.faqA, { color: theme.icon }]}>{faq.a}</Text>
                                </View>
                            ))}
                            <TouchableOpacity
                                style={[styles.saveBtn, { backgroundColor: theme.tint, marginTop: 8 }]}
                                onPress={() => Linking.openURL('mailto:support@financeapp.com')}
                                activeOpacity={0.8}
                            >
                                <Text style={styles.saveBtnText}>Contact Support</Text>
                            </TouchableOpacity>
                            <View style={{ height: 32 }} />
                        </ScrollView>
                    </View>
                </View>
            </Modal>

            {/* ── Notifications Modal ───────────────────────────────── */}
            <Modal visible={notificationsVisible} animationType="slide" transparent onRequestClose={() => setNotificationsVisible(false)}>
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContainer, { backgroundColor: theme.card }]}>
                        <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
                            <TouchableOpacity onPress={() => setNotificationsVisible(false)} style={styles.modalCloseBtn}>
                                <Ionicons name="close" size={24} color={theme.text} />
                            </TouchableOpacity>
                            <Text style={[styles.modalTitle, { color: theme.text }]}>Notifications</Text>
                            <View style={{ width: 36 }} />
                        </View>
                        <ScrollView contentContainerStyle={styles.modalBody}>
                           {!hasPermission ? (
                                <TouchableOpacity
                                    style={[styles.permissionBanner, { backgroundColor: theme.warning + '15' }]}
                                    onPress={openPermissionSettings}
                                >
                                    <Ionicons name="notifications-off-outline" size={24} color={theme.warning} />
                                    <View style={styles.permissionTextContainer}>
                                        <Text style={[styles.permissionTitle, { color: theme.text }]}>Notification Access Disabled</Text>
                                        <Text style={[styles.permissionSubtitle, { color: theme.icon }]}>Tap to enable reading phone notifications</Text>
                                    </View>
                                    <Ionicons name="chevron-forward" size={20} color={theme.warning} />
                                </TouchableOpacity>
                            ) : (
                                <>
                                    {notifications.length === 0 ? (
                                        <View style={styles.emptyNotifs}>
                                            <Ionicons name="notifications-outline" size={32} color={theme.icon} style={{ opacity: 0.5 }} />
                                            <Text style={[styles.emptyNotifsText, { color: theme.icon }]}>No notifications yet</Text>
                                        </View>
                                    ) : (
                                        <>
                                            {notifications.map((notif) => (
                                                <View key={notif.id}>
                                                    <View style={styles.notifItem}>
                                                        <View style={[styles.notifIcon, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#F3F4F6' }]}>
                                                            <Text style={{ fontSize: 18 }}>🔔</Text>
                                                        </View>
                                                        <View style={styles.notifContent}>
                                                            <View style={styles.notifHeader}>
                                                                <Text style={[styles.notifApp, { color: theme.tint }]} numberOfLines={1}>{notif.appName}</Text>
                                                                <Text style={[styles.notifTime, { color: theme.icon }]}>
                                                                    {new Date(notif.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                                </Text>
                                                            </View>
                                                            <Text style={[styles.notifTitle, { color: theme.text }]} numberOfLines={1}>{notif.title}</Text>
                                                            <Text style={[styles.notifText, { color: theme.icon }]} numberOfLines={2}>{notif.text}</Text>
                                                        </View>
                                                        <TouchableOpacity onPress={() => clearOne(notif.id)} style={styles.notifDelete}>
                                                            <Ionicons name="close" size={16} color={theme.icon} />
                                                        </TouchableOpacity>
                                                    </View>
                                                    <View style={[styles.separator, { backgroundColor: theme.border }]} />
                                                </View>
                                            ))}
                                            <TouchableOpacity
                                                style={styles.clearAllBtn}
                                                onPress={clearAll}
                                            >
                                                <Text style={[styles.clearAllText, { color: theme.danger }]}>Clear All</Text>
                                            </TouchableOpacity>
                                        </>
                                    )}
                                </>
                            )}
                            <View style={{ height: 32 }} />
                        </ScrollView>
                    </View>
                </View>
            </Modal>

            {/* ── Privacy Policy Modal ────────────────────────────────── */}
            <Modal visible={privacyVisible} animationType="slide" transparent onRequestClose={() => setPrivacyVisible(false)}>
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContainer, { backgroundColor: theme.card }]}>
                        <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
                            <TouchableOpacity onPress={() => setPrivacyVisible(false)} style={styles.modalCloseBtn}>
                                <Ionicons name="close" size={24} color={theme.text} />
                            </TouchableOpacity>
                            <Text style={[styles.modalTitle, { color: theme.text }]}>Privacy Policy</Text>
                            <View style={{ width: 36 }} />
                        </View>
                        <ScrollView contentContainerStyle={styles.modalBody}>
                            <Text style={[styles.privacyDate, { color: theme.icon }]}>Last updated: March 12, 2026</Text>
                            {[
                                { heading: '1. Information We Collect', body: 'We collect information you provide when registering (name, email, phone), transaction data you enter, and device information for analytics and crash reporting.' },
                                { heading: '2. How We Use Your Information', body: 'Your data is used solely to provide and improve the app experience. We generate insights and reports to help you manage finances better. We do not sell your data.' },
                                { heading: '3. Data Storage & Security', body: 'Your data is stored on secure servers with AES-256 encryption. Passwords are hashed with bcrypt and are never stored in plain text.' },
                                { heading: '4. Third-Party Services', body: 'We use third-party services for analytics (crash reporting only). These services have their own privacy policies and cannot access your personal financial data.' },
                                { heading: '5. Data Retention', body: 'We retain your account data as long as your account is active. You may request deletion of your data at any time by contacting support.' },
                                { heading: '6. Your Rights', body: 'You have the right to access, correct, or delete your personal data. You may also export all your data in CSV format at any time from the app.' },
                                { heading: '7. Contact Us', body: 'For privacy-related inquiries, contact us at privacy@financeapp.com.' },
                            ].map((section, i) => (
                                <View key={i} style={styles.privacySection}>
                                    <Text style={[styles.privacyHeading, { color: theme.text }]}>{section.heading}</Text>
                                    <Text style={[styles.privacyBody, { color: theme.icon }]}>{section.body}</Text>
                                </View>
                            ))}
                            <View style={{ height: 32 }} />
                        </ScrollView>
                    </View>
                </View>
            </Modal>

            {/* ── Financial Plan Modal ───────────────────────────────── */}
            <Modal
                visible={financialPlanVisible}
                animationType="slide"
                transparent
                onRequestClose={() => setFinancialPlanVisible(false)}
            >
                <KeyboardAvoidingView
                    style={styles.modalOverlay}
                    // behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                >
                    <View style={[styles.modalContainer, { backgroundColor: theme.card }]}>
                        <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
                            <TouchableOpacity onPress={() => setFinancialPlanVisible(false)} style={styles.modalCloseBtn}>
                                <Ionicons name="close" size={24} color={theme.text} />
                            </TouchableOpacity>
                            <Text style={[styles.modalTitle, { color: theme.text }]}>Financial Inputs</Text>
                            <View style={{ width: 36 }} />
                        </View>

                        <ScrollView contentContainerStyle={styles.modalBody} keyboardShouldPersistTaps="handled">
                            {/* Section: Income & Budget */}
                            <View style={[styles.modalContentCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#fff', borderColor: theme.border, borderWidth: 1, borderRadius: 10, padding: 16 }]}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                                    <View style={[styles.statIcon, { backgroundColor: theme.emerald + '15', marginRight: 12 }]}>
                                        <Ionicons name="wallet-outline" size={20} color={theme.emerald} />
                                    </View>
                                    <Text style={[styles.modalSectionTitle, { color: theme.text, marginBottom: 0 }]}>Income & Budget</Text>
                                </View>

                                <Text style={[styles.fieldLabel, { color: theme.icon }]}>Monthly Income</Text>
                                <View style={[styles.inputWrapper, { backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : '#F9FAFB', borderColor: theme.border }]}>
                                    <Text style={[styles.currencyPrefix, { color: theme.icon }]}>₹</Text>
                                    <TextInput
                                        style={[styles.input, { color: theme.text }]}
                                        value={monthlyIncomeInput}
                                        onChangeText={(v) => setMonthlyIncomeInput(formatINR(v))}
                                        placeholder="0"
                                        placeholderTextColor={theme.icon}
                                        keyboardType="numeric"
                                    />
                                </View>

                                <Text style={[styles.fieldLabel, { color: theme.icon }]}>Monthly Spending Budget</Text>
                                <View style={[styles.inputWrapper, { backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : '#F9FAFB', borderColor: theme.border }]}>
                                    <Text style={[styles.currencyPrefix, { color: theme.icon }]}>₹</Text>
                                    <TextInput
                                        style={[styles.input, { color: theme.text }]}
                                        value={monthlyBudgetInput}
                                        onChangeText={(v) => setMonthlyBudgetInput(formatINR(v))}
                                        placeholder="0"
                                        placeholderTextColor={theme.icon}
                                        keyboardType="numeric"
                                    />
                                </View>
                            </View>

                            {/* Section: Fixed Outflows */}
                            <View style={[styles.modalContentCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#fff', borderColor: theme.border, borderWidth: 1, borderRadius: 10, padding: 16, marginTop: 16 }]}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                                    <View style={[styles.statIcon, { backgroundColor: theme.expense + '15', marginRight: 12 }]}>
                                        <Ionicons name="card-outline" size={20} color={theme.expense} />
                                    </View>
                                    <Text style={[styles.modalSectionTitle, { color: theme.text, marginBottom: 0 }]}>Fixed Outflows</Text>
                                </View>

                                <Text style={[styles.fieldLabel, { color: theme.icon }]}>Fixed EMI</Text>
                                <View style={[styles.inputWrapper, { backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : '#F9FAFB', borderColor: theme.border }]}>
                                    <Text style={[styles.currencyPrefix, { color: theme.icon }]}>₹</Text>
                                    <TextInput
                                        style={[styles.input, { color: theme.text }]}
                                        value={emiInput}
                                        onChangeText={(v) => setEmiInput(formatINR(v))}
                                        placeholder="0"
                                        placeholderTextColor={theme.icon}
                                        keyboardType="numeric"
                                    />
                                </View>

                                <Text style={[styles.fieldLabel, { color: theme.icon }]}>Rent & Utilities</Text>
                                <View style={[styles.inputWrapper, { backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : '#F9FAFB', borderColor: theme.border }]}>
                                    <Text style={[styles.currencyPrefix, { color: theme.icon }]}>₹</Text>
                                    <TextInput
                                        style={[styles.input, { color: theme.text }]}
                                        value={fixedOtherInput}
                                        onChangeText={(v) => setFixedOtherInput(formatINR(v))}
                                        placeholder="0"
                                        placeholderTextColor={theme.icon}
                                        keyboardType="numeric"
                                    />
                                </View>

                                <View style={[styles.calcRow, { borderTopWidth: 1, borderTopColor: theme.border, paddingTop: 12, marginTop: 4 }]}>
                                    <Text style={[styles.calcLabel, { color: theme.icon }]}>Total Fixed Outflows</Text>
                                    <Text style={[styles.calcValue, { color: theme.text }]}>₹{formatINR(toNumber(emiInput) + toNumber(fixedOtherInput)) || '0'}</Text>
                                </View>
                            </View>

                            {/* Section: Savings & Investments */}
                            <View style={[styles.modalContentCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#fff', borderColor: theme.border, borderWidth: 1, borderRadius: 20, padding: 16, marginTop: 16 }]}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                                    <View style={[styles.statIcon, { backgroundColor: theme.tint + '15', marginRight: 12 }]}>
                                        <Ionicons name="trending-up-outline" size={20} color={theme.tint} />
                                    </View>
                                    <Text style={[styles.modalSectionTitle, { color: theme.text, marginBottom: 0 }]}>Savings & Investments</Text>
                                </View>

                                <Text style={[styles.fieldLabel, { color: theme.icon }]}>Monthly SIP</Text>
                                <View style={[styles.inputWrapper, { backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : '#F9FAFB', borderColor: theme.border }]}>
                                    <Text style={[styles.currencyPrefix, { color: theme.icon }]}>₹</Text>
                                    <TextInput
                                        style={[styles.input, { color: theme.text }]}
                                        value={sipInput}
                                        onChangeText={(v) => setSipInput(formatINR(v))}
                                        placeholder="0"
                                        placeholderTextColor={theme.icon}
                                        keyboardType="numeric"
                                    />
                                </View>

                                <Text style={[styles.fieldLabel, { color: theme.icon }]}>Mutual Funds</Text>
                                <View style={[styles.inputWrapper, { backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : '#F9FAFB', borderColor: theme.border }]}>
                                    <Text style={[styles.currencyPrefix, { color: theme.icon }]}>₹</Text>
                                    <TextInput
                                        style={[styles.input, { color: theme.text }]}
                                        value={mutualFundsInput}
                                        onChangeText={(v) => setMutualFundsInput(formatINR(v))}
                                        placeholder="0"
                                        placeholderTextColor={theme.icon}
                                        keyboardType="numeric"
                                    />
                                </View>

                                <Text style={[styles.fieldLabel, { color: theme.icon }]}>Other Savings</Text>
                                <View style={[styles.inputWrapper, { backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : '#F9FAFB', borderColor: theme.border }]}>
                                    <Text style={[styles.currencyPrefix, { color: theme.icon }]}>₹</Text>
                                    <TextInput
                                        style={[styles.input, { color: theme.text }]}
                                        value={otherSavingsInput}
                                        onChangeText={(v) => setOtherSavingsInput(formatINR(v))}
                                        placeholder="0"
                                        placeholderTextColor={theme.icon}
                                        keyboardType="numeric"
                                    />
                                </View>

                                <View style={[styles.calcRow, { borderTopWidth: 1, borderTopColor: theme.border, paddingTop: 12, marginTop: 4 }]}>
                                    <Text style={[styles.calcLabel, { color: theme.icon }]}>Total Target Savings</Text>
                                    <Text style={[styles.calcValue, { color: theme.text }]}>₹{formatINR(toNumber(sipInput) + toNumber(mutualFundsInput) + toNumber(otherSavingsInput)) || '0'}</Text>
                                </View>
                            </View>

                            <TouchableOpacity
                                style={[styles.saveBtn, { backgroundColor: theme.income, marginTop: 24, shadowColor: theme.tint, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 }]}
                                onPress={handleSaveFinancialPlan}
                                activeOpacity={0.8}
                            >
                                <Text style={styles.saveBtnText}>Save Financial Plan</Text>
                            </TouchableOpacity>
                            {/* <View style={{ height: 40 }} /> */}
                        </ScrollView>
                    </View>
                </KeyboardAvoidingView>
            </Modal>

            {showToast && (
                <Animated.View style={[
                    styles.toastContainer, 
                    { opacity: fadeAnim, backgroundColor: toastType === 'error' ? theme.danger : (toastType === 'success' ? '#10B981' : '#333') }
                ]}>
                    <Ionicons 
                        name={toastType === 'success' ? 'checkmark-circle' : (toastType === 'error' ? 'alert-circle' : 'information-circle')} 
                        size={20} 
                        color="#fff" 
                    />
                    <Text style={styles.toastText}>{toastMessage}</Text>
                </Animated.View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    scrollContent: {
        paddingTop: Platform.OS === 'android' ? 20 : 0,
    },
    header: {
        padding: 16,
        paddingTop: 10,
        alignItems: 'center',
        borderBottomLeftRadius: 30,
        borderBottomRightRadius: 30,

        position: 'relative',
    },
    avatarContainer: {
        marginBottom: 12,
        position: 'relative',
    },
    avatarGradient: {
        padding: 3,
        borderRadius: 40,
    },
    avatar: {
        width: 70,
        height: 70,
        borderRadius: 35,
        borderWidth: 3,
    },
    onlineBadge: {
        position: 'absolute',
        bottom: 2,
        right: 2,
        width: 14,
        height: 14,
        borderRadius: 7,
        backgroundColor: '#10B981',
        borderWidth: 2,
        borderColor: '#FFF',
    },
    headerInfo: {
        alignItems: 'center',
        gap: 2,
    },
    name: {
        fontSize: 20,
        fontWeight: '700',
    },
    badgeContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
        gap: 4,
    },
    badgeText: {
        fontSize: 12,
        fontWeight: '600',
    },
    email: {
        fontSize: 14,
    },
    editProfileBtn: {
        marginTop: 8,
        paddingHorizontal: 14,
        paddingVertical: 6,
        borderRadius: 18,
        borderWidth: 1,
    },
    editProfileText: {
        fontSize: 12,
        fontWeight: '600',
    },
    statsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        paddingHorizontal: 20,
        paddingVertical: 8,
        gap: 12,
        justifyContent: 'space-between',
    },
    statCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 10,
        gap: 8,
        width: '48%',
        borderWidth: 1,
        marginBottom: 2,
    },
    statIcon: {
        width: 40,
        height: 40,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    statLabel: {
        fontSize: 11,
        fontWeight: '500',
    },
    statValue: {
        fontSize: 16,
        fontWeight: '700',
    },
    settingsContainer: {
        padding: 20,
    },
    sectionWrapper: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 13,
        fontWeight: '600',
        textTransform: 'uppercase',
        marginBottom: 10,
        marginLeft: 8,
    },
    sectionContainer: {
        borderRadius: 20,
        overflow: 'hidden',
        borderWidth: 1,
    },
    settingItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        gap: 16,
    },
    iconContainer: {
        width: 36,
        height: 36,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    settingContent: {
        flex: 1,
    },
    settingTitle: {
        fontSize: 16,
        fontWeight: '500',
    },
    settingSubtitle: {
        fontSize: 13,
        marginTop: 2,
    },
    separator: {
        height: 1,
        marginLeft: 68,
        opacity: 0.5,
    },
    logoutBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 18,
        borderRadius: 20,
        gap: 8,
        marginTop: 8,
        marginBottom: 24,
    },
    logoutText: {
        fontSize: 16,
        fontWeight: '600',
    },
    version: {
        textAlign: 'center',
        fontSize: 13,
        opacity: 0.5,
    },
    // Prominent Button
    prominentBtn: {
        marginHorizontal: 20,
        marginBottom: 10,
        borderRadius: 10,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: "#ddd",
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        gap: 16,
    },
    prominentIconContainer: {
        width: 48,
        height: 48,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: '#ddd',
        alignItems: 'center',
        justifyContent: 'center',
    },
    prominentTextContainer: {
        flex: 1,
    },
    prominentTitle: {
        color: '#333',
        fontSize: 17,
        fontWeight: '700',
    },
    prominentSubtitle: {
        color: '#333',
        fontSize: 12,
        marginTop: 2,
    },
    // Modal styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContainer: {
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        maxHeight: '92%',
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: 16,
        borderBottomWidth: 1,
    },
    modalCloseBtn: {
        width: 36,
        height: 36,
        alignItems: 'center',
        justifyContent: 'center',
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '700',
    },
    modalBody: {
        padding: 20,
    },
    fieldLabel: {
        fontSize: 13,
        fontWeight: '600',
        marginBottom: 8,
        marginLeft: 4,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 10,
        borderWidth: 1,
        paddingHorizontal: 14,
        marginBottom: 18,
        height: 52,
    },
    inputIcon: {
        marginRight: 10,
    },
    input: {
        flex: 1,
        fontSize: 15,
        height: '100%',
    },
    eyeBtn: {
        padding: 4,
    },
    divider: {
        height: 1,
        marginVertical: 8,
        marginBottom: 16,
    },
    sectionLabel: {
        fontSize: 13,
        fontWeight: '600',
        textTransform: 'uppercase',
        marginBottom: 16,
        letterSpacing: 0.5,
    },
    saveBtn: {
        height: 54,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 0,
    },
    saveBtnText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
    },
    // Language picker
    langItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 14,
        borderRadius: 14,
        borderWidth: 1,
        marginBottom: 10,
        gap: 14,
    },
    langFlag: {
        fontSize: 24,
    },
    langLabel: {
        flex: 1,
        fontSize: 16,
        fontWeight: '500',
    },
    // PIN modal
    pinIconWrapper: {
        alignItems: 'center',
        marginTop: 12,
        marginBottom: 20,
    },
    pinInstruction: {
        fontSize: 16,
        fontWeight: '600',
        textAlign: 'center',
        marginBottom: 16,
    },
    pinError: {
        fontSize: 13,
        textAlign: 'center',
        marginBottom: 12,
        fontWeight: '500',
    },
    pinBackBtn: {
        alignItems: 'center',
        marginTop: 16,
    },
    pinBackText: {
        fontSize: 14,
        fontWeight: '600',
    },
    // Help Center
    faqItem: {
        borderWidth: 1,
        borderRadius: 14,
        padding: 16,
        marginBottom: 12,
    },
    faqQ: {
        fontSize: 15,
        fontWeight: '600',
        marginBottom: 6,
    },
    faqA: {
        fontSize: 14,
        lineHeight: 20,
    },
    // Privacy Policy
    privacyDate: {
        fontSize: 13,
        marginBottom: 20,
        textAlign: 'center',
    },
    privacySection: {
        marginBottom: 20,
    },
    privacyHeading: {
        fontSize: 15,
        fontWeight: '700',
        marginBottom: 6,
    },
    privacyBody: {
        fontSize: 14,
        lineHeight: 22,
    },
    modalContentCard: {
        marginBottom: 6,
    },
    modalSectionTitle: {
        fontSize: 15,
        fontWeight: '700',
        marginBottom: 8,
    },
    currencyPrefix: {
        fontSize: 16,
        fontWeight: '600',
        marginRight: 8,
    },
    calcRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    calcLabel: {
        fontSize: 14,
        fontWeight: '600',
    },
    calcValue: {
        fontSize: 16,
        fontWeight: '700',
    },
    toastContainer: {
        position: 'absolute',
        bottom: 20,
        left: 20,
        right: 20,
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 12,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 6,
        zIndex: 9999,
    },
    toastText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
        flex: 1,
    },
    // Notifications styles
    permissionBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 14,
        gap: 12,
    },
    permissionTextContainer: {
        flex: 1,
    },
    permissionTitle: {
        fontSize: 15,
        fontWeight: '700',
        marginBottom: 2,
    },
    permissionSubtitle: {
        fontSize: 13,
    },
    emptyNotifs: {
        alignItems: 'center',
        paddingVertical: 30,
        gap: 10,
    },
    emptyNotifsText: {
        fontSize: 14,
        fontWeight: '500',
    },
    notifItem: {
        flexDirection: 'row',
        paddingVertical: 12,
        paddingHorizontal: 16,
        gap: 12,
        alignItems: 'flex-start',
    },
    notifIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    notifContent: {
        flex: 1,
    },
    notifHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 2,
    },
    notifApp: {
        fontSize: 11,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    notifTime: {
        fontSize: 11,
    },
    notifTitle: {
        fontSize: 14,
        fontWeight: '700',
        marginBottom: 2,
    },
    notifText: {
        fontSize: 13,
        lineHeight: 18,
    },
    notifDelete: {
        padding: 4,
        marginTop: 4,
    },
    clearAllBtn: {
        paddingVertical: 16,
        alignItems: 'center',
    },
    clearAllText: {
        fontSize: 14,
        fontWeight: '600',
    },
    viewMoreBtn: {
        paddingVertical: 12,
        alignItems: 'center',
    },
    viewMoreText: {
        fontSize: 13,
        fontWeight: '600',
    },
});
