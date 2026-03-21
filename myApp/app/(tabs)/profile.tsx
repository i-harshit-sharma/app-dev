import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import * as SecureStore from 'expo-secure-store';

import { Colors } from '@/constants/theme';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { useTransactions } from '@/context/TransactionContext';
import { useRouter } from 'expo-router';

const PROFILE_IMAGE = 'https://i.pravatar.cc/300?img=47';

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

    // ── Financial Plan ────────────────────────────────────────────
    const [financialPlanVisible, setFinancialPlanVisible] = useState(false);
    const [monthlyIncomeInput, setMonthlyIncomeInput] = useState('');
    const [monthlyBudgetInput, setMonthlyBudgetInput] = useState('');
    const [emiInput, setEmiInput] = useState('');
    const [fixedOtherInput, setFixedOtherInput] = useState('');
    const [sipInput, setSipInput] = useState('');
    const [mutualFundsInput, setMutualFundsInput] = useState('');
    const [otherSavingsInput, setOtherSavingsInput] = useState('');

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

    const openFinancialPlanModal = () => {
        setMonthlyIncomeInput(String(Math.round(financialPlan.monthlyIncome || 0)));
        setMonthlyBudgetInput(String(Math.round(financialPlan.monthlyBudget || 0)));
        setEmiInput(String(Math.round(financialPlan.fixedObligations.emi || 0)));
        setFixedOtherInput(String(Math.round((financialPlan.fixedObligations.rentAndUtilities + financialPlan.fixedObligations.otherFixed) || 0)));
        setSipInput(String(Math.round(financialPlan.savingsInvestments.sip || 0)));
        setMutualFundsInput(String(Math.round(financialPlan.savingsInvestments.mutualFunds || 0)));
        setOtherSavingsInput(String(Math.round(financialPlan.savingsInvestments.otherSavings || 0)));
        setFinancialPlanVisible(true);
    };

    const handleSaveFinancialPlan = async () => {
        const toNumber = (value: string) => {
            const sanitized = value.replace(/,/g, '').replace(/[^0-9.]/g, '').trim();
            const numeric = Number(sanitized);
            return Number.isFinite(numeric) && numeric >= 0 ? numeric : 0;
        };

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
            Alert.alert('Saved', 'Financial plan updated, but could not be saved permanently on this device.');
            return;
        }
        Alert.alert('Success', 'Financial plan updated successfully.');
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
            Alert.alert('Face ID Enabled', 'Biometric authentication will be used on the next app launch.');
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
            Alert.alert('Success', 'Your PIN has been set successfully.');
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
            Alert.alert('Validation Error', 'Name cannot be empty.');
            return;
        }
        if (!editEmail.trim()) {
            Alert.alert('Validation Error', 'Email cannot be empty.');
            return;
        }
        if (!editPhone.trim()) {
            Alert.alert('Validation Error', 'Phone cannot be empty.');
            return;
        }
        if (editPassword || editPasswordConfirm) {
            if (editPassword !== editPasswordConfirm) {
                Alert.alert('Validation Error', 'Passwords do not match.');
                return;
            }
            if (editPassword.length < 6) {
                Alert.alert('Validation Error', 'Password must be at least 6 characters.');
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
            Alert.alert('Success', 'Profile updated successfully!');
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to update profile.');
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
                    onPress: () => {},
                    style: 'cancel',
                },
                {
                    text: 'Logout',
                    onPress: async () => {
                        try {
                            await logout();
                            router.replace('/login');
                        } catch (error) {
                            Alert.alert('Error', 'Failed to logout');
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
            value: `INR ${Math.round(financialPlan.monthlyIncome).toLocaleString('en-IN')}`,
            icon: 'wallet',
            color: theme.emerald,
            onPress: openFinancialPlanModal,
            editable: true,
        },
        {
            label: 'Monthly Budget',
            value: `INR ${Math.round(financialPlan.monthlyBudget).toLocaleString('en-IN')}`,
            icon: 'cash',
            color: theme.tint,
            onPress: openFinancialPlanModal,
            editable: true,
        },
        {
            label: 'Weekly Budget',
            value: `INR ${Math.round(weeklyBudget).toLocaleString('en-IN')}`,
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
                                source={{ uri: PROFILE_IMAGE }}
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

                {/* Stats Row */}
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.statsContainer}
                    style={{ flexGrow: 0 }}
                >
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
                            <View>
                                <Text style={[styles.statLabel, { color: theme.icon }]}>{stat.label}</Text>
                                <Text style={[styles.statValue, { color: theme.text }]}>{stat.value}</Text>
                            </View>
                        </TouchableOpacity>
                    ))}
                </ScrollView>

                {/* Settings */}
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
                            onPress={() => { }}
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
                    <View style={{ height: 100 }} />
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
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
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

                            <View style={{ height: 32 }} />
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
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
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
                            <Text style={[styles.fieldLabel, { color: theme.icon }]}>Monthly Income (INR)</Text>
                            <View style={[
                                styles.inputWrapper,
                                { backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : '#F3F4F6', borderColor: theme.border }
                            ]}>
                                <Ionicons name="cash-outline" size={18} color={theme.icon} style={styles.inputIcon} />
                                <TextInput
                                    style={[styles.input, { color: theme.text }]}
                                    value={monthlyIncomeInput}
                                    onChangeText={setMonthlyIncomeInput}
                                    placeholder="e.g. 80000"
                                    placeholderTextColor={theme.icon}
                                    keyboardType="numeric"
                                />
                            </View>

                            <Text style={[styles.fieldLabel, { color: theme.icon }]}>Monthly Spending Budget (INR)</Text>
                            <View style={[styles.inputWrapper, { backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : '#F3F4F6', borderColor: theme.border }]}>
                                <Ionicons name="wallet-outline" size={18} color={theme.icon} style={styles.inputIcon} />
                                <TextInput
                                    style={[styles.input, { color: theme.text }]}
                                    value={monthlyBudgetInput}
                                    onChangeText={setMonthlyBudgetInput}
                                    placeholder="e.g. 30000"
                                    placeholderTextColor={theme.icon}
                                    keyboardType="numeric"
                                />
                            </View>

                            <Text style={[styles.sectionLabel, { color: theme.icon }]}>Outflows</Text>

                            <Text style={[styles.fieldLabel, { color: theme.icon }]}>Fixed Obligations: EMI (INR)</Text>
                            <View style={[styles.inputWrapper, { backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : '#F3F4F6', borderColor: theme.border }]}>
                                <Ionicons name="card-outline" size={18} color={theme.icon} style={styles.inputIcon} />
                                <TextInput
                                    style={[styles.input, { color: theme.text }]}
                                    value={emiInput}
                                    onChangeText={setEmiInput}
                                    placeholder="e.g. 12000"
                                    placeholderTextColor={theme.icon}
                                    keyboardType="numeric"
                                />
                            </View>

                            <Text style={[styles.fieldLabel, { color: theme.icon }]}>Fixed Obligations: Other (rent/utilities)</Text>
                            <View style={[styles.inputWrapper, { backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : '#F3F4F6', borderColor: theme.border }]}>
                                <Ionicons name="home-outline" size={18} color={theme.icon} style={styles.inputIcon} />
                                <TextInput
                                    style={[styles.input, { color: theme.text }]}
                                    value={fixedOtherInput}
                                    onChangeText={setFixedOtherInput}
                                    placeholder="e.g. 8000"
                                    placeholderTextColor={theme.icon}
                                    keyboardType="numeric"
                                />
                            </View>

                            <Text style={[styles.sectionLabel, { color: theme.icon }]}>Savings & Investments</Text>

                            <Text style={[styles.fieldLabel, { color: theme.icon }]}>SIP (INR)</Text>
                            <View style={[styles.inputWrapper, { backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : '#F3F4F6', borderColor: theme.border }]}>
                                <Ionicons name="trending-up-outline" size={18} color={theme.icon} style={styles.inputIcon} />
                                <TextInput
                                    style={[styles.input, { color: theme.text }]}
                                    value={sipInput}
                                    onChangeText={setSipInput}
                                    placeholder="e.g. 5000"
                                    placeholderTextColor={theme.icon}
                                    keyboardType="numeric"
                                />
                            </View>

                            <Text style={[styles.fieldLabel, { color: theme.icon }]}>Mutual Funds (INR)</Text>
                            <View style={[styles.inputWrapper, { backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : '#F3F4F6', borderColor: theme.border }]}>
                                <Ionicons name="stats-chart-outline" size={18} color={theme.icon} style={styles.inputIcon} />
                                <TextInput
                                    style={[styles.input, { color: theme.text }]}
                                    value={mutualFundsInput}
                                    onChangeText={setMutualFundsInput}
                                    placeholder="e.g. 3000"
                                    placeholderTextColor={theme.icon}
                                    keyboardType="numeric"
                                />
                            </View>

                            <Text style={[styles.fieldLabel, { color: theme.icon }]}>Other Savings (INR)</Text>
                            <View style={[styles.inputWrapper, { backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : '#F3F4F6', borderColor: theme.border }]}>
                                <Ionicons name="save-outline" size={18} color={theme.icon} style={styles.inputIcon} />
                                <TextInput
                                    style={[styles.input, { color: theme.text }]}
                                    value={otherSavingsInput}
                                    onChangeText={setOtherSavingsInput}
                                    placeholder="e.g. 2000"
                                    placeholderTextColor={theme.icon}
                                    keyboardType="numeric"
                                />
                            </View>

                            <TouchableOpacity
                                style={[styles.saveBtn, { backgroundColor: theme.tint }]}
                                onPress={handleSaveFinancialPlan}
                                activeOpacity={0.8}
                            >
                                <Text style={styles.saveBtnText}>Save Financial Plan</Text>
                            </TouchableOpacity>
                            <View style={{ height: 24 }} />
                        </ScrollView>
                    </View>
                </KeyboardAvoidingView>
            </Modal>
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
        padding: 24,
        paddingTop: 60,
        alignItems: 'center',
        borderBottomLeftRadius: 30,
        borderBottomRightRadius: 30,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 5,
        position: 'relative',
    },
    avatarContainer: {
        marginBottom: 16,
        position: 'relative',
    },
    avatarGradient: {
        padding: 4,
        borderRadius: 60,
    },
    avatar: {
        width: 100,
        height: 100,
        borderRadius: 50,
        borderWidth: 4,
    },
    onlineBadge: {
        position: 'absolute',
        bottom: 8,
        right: 8,
        width: 16,
        height: 16,
        borderRadius: 8,
        backgroundColor: '#10B981',
        borderWidth: 2,
        borderColor: '#FFF',
    },
    headerInfo: {
        alignItems: 'center',
        gap: 6,
    },
    name: {
        fontSize: 24,
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
        marginTop: 12,
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
    },
    editProfileText: {
        fontSize: 12,
        fontWeight: '600',
    },
    statsContainer: {
        paddingHorizontal: 20,
        paddingVertical: 24,
        gap: 12,
    },
    statCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 20,
        gap: 12,
        minWidth: 160,
        borderWidth: 1,
    },
    statIcon: {
        width: 40,
        height: 40,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    statLabel: {
        fontSize: 12,
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
        borderRadius: 14,
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
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 8,
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
});
