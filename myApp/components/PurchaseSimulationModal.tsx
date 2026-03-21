import { Colors } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { useTransactions } from '@/context/TransactionContext';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Dimensions,
    Keyboard,
    KeyboardAvoidingView,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View,
} from 'react-native';

const { width, height } = Dimensions.get('window');

interface PurchaseSimulationModalProps {
    visible: boolean;
    onClose: () => void;
}

const CATEGORIES = [
    { id: '1', name: 'Food', dbCategory: 'Food', icon: 'fast-food' },
    { id: '2', name: 'Shopping', dbCategory: 'Shopping', icon: 'bag' },
    { id: '3', name: 'Transport', dbCategory: 'Transport', icon: 'car' },
    { id: '4', name: 'Bills', dbCategory: 'Bills', icon: 'document-text' },
    { id: '5', name: 'Health', dbCategory: 'Health', icon: 'medical' },
    { id: '6', name: 'Others', dbCategory: 'Others', icon: 'ellipsis-horizontal' },
];

export function PurchaseSimulationModal({ visible, onClose }: PurchaseSimulationModalProps) {
    const { theme: currentTheme } = useTheme();
    const { user } = useAuth();
    const { transactions, netWorth, addTransaction, getMonthlySummary } = useTransactions();
    const theme = Colors[currentTheme];
    const isDark = currentTheme === 'dark';

    const [amount, setAmount] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [selectedDbCategory, setSelectedDbCategory] = useState<string | null>(null);
    const [prediction, setPrediction] = useState<string | null>(null);
    const [impactData, setImpactData] = useState<any>(null);
    const [isAdding, setIsAdding] = useState(false);

    // Reset state when modal opens/closes
    useEffect(() => {
        if (visible) {
            setAmount('');
            setSelectedCategory(null);
            setSelectedDbCategory(null);
            setPrediction(null);
            setImpactData(null);
            setIsAdding(false);
        }
    }, [visible]);

    const handleCategorySelect = (cat: any) => {
        setSelectedCategory(cat.name);
        setSelectedDbCategory(cat.dbCategory);
        if (prediction) setPrediction(null);
    };

    const handlePredict = () => {
        const numAmount = parseFloat(amount);
        if (!numAmount || numAmount <= 0 || !selectedDbCategory) {
            return;
        }

        // Get current month summary
        const monthlySummary = getMonthlySummary(new Date());
        const remainingAfterPurchase = netWorth - numAmount;
        const monthlySpentAfter = monthlySummary.expense + numAmount;
        const monthlyBudget = 45000; // Total monthly budget estimate
        
        const percentageUsed = (monthlySpentAfter / monthlyBudget) * 100;
        let impact = 'Safe to buy';
        let tone = 'success';
        
        if (percentageUsed > 100) {
            impact = `This purchase will exceed your monthly budget by ${Math.round(monthlySpentAfter - monthlyBudget)}. You'll overspend this month.`;
            tone = 'danger';
        } else if (percentageUsed > 85) {
            impact = `Careful! This brings you to ${Math.round(percentageUsed)}% of your monthly budget. Little room left.`;
            tone = 'warning';
        } else if (remainingAfterPurchase < 5000) {
            impact = `This leaves you with only ₹${remainingAfterPurchase.toLocaleString('en-IN')} in net worth. Consider waiting a few days.`;
            tone = 'warning';
        }

        setImpactData({
            remainingNetWorth: remainingAfterPurchase,
            monthlySpentAfter,
            percentageUsed: Math.round(percentageUsed),
            tone,
        });
        setPrediction(impact);
    };

    const handleAddPurchase = async () => {
        const numAmount = parseFloat(amount);
        if (!numAmount || !selectedDbCategory) return;

        setIsAdding(true);
        try {
            await addTransaction({
                title: `${selectedCategory} Purchase`,
                subtitle: selectedCategory,
                amount: numAmount,
                category: selectedDbCategory,
                type: 'expense',
                date: new Date(),
                icon: CATEGORIES.find(c => c.name === selectedCategory)?.icon || 'shopping-outline',
                color: theme.expense,
                paymentMethod: 'UPI',
            });
            
            // Close modal and reset
            setTimeout(() => {
                onClose();
            }, 300);
        } catch (err) {
            console.error('Failed to add transaction:', err);
        } finally {
            setIsAdding(false);
        }
    };

    if (!visible) return null;

    return (
        <Modal
            animationType="slide"
            transparent={true}
            visible={visible}
            onRequestClose={onClose}
        >
            <TouchableWithoutFeedback onPress={onClose}>
                <BlurView
                    intensity={Platform.OS === 'ios' ? 25 : 100}
                    tint={isDark ? 'dark' : 'light'}
                    style={styles.absoluteBlur}
                >
                    {/* This empty view is just to catch taps on the blurred area */}
                    <View style={styles.dismissArea} />
                </BlurView>
            </TouchableWithoutFeedback>

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.keyboardAvoidingView}
                pointerEvents="box-none" // Allow touches to pass through mostly, but catch on content
            >
                <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                    <View style={styles.modalContentWrapper}>
                        <View style={[styles.modalContainer, { backgroundColor: isDark ? '#1E1E1E' : '#FFFFFF' }]}>

                            {/* Handle Bar */}
                            <View style={styles.handleBarContainer}>
                                <View style={[styles.handleBar, { backgroundColor: theme.border }]} />
                            </View>

                            {/* Header / Title */}
                            <Text style={[styles.modalTitle, { color: theme.text }]}>Simulate Purchase</Text>

                            {/* Massive Input Field */}
                            <View style={styles.inputContainer}>
                                <Text style={[styles.currencySymbol, { color: theme.tint }]}>₹</Text>
                                <TextInput
                                    style={[styles.amountInput, { color: theme.text }]}
                                    placeholder="0"
                                    placeholderTextColor={theme.icon} // Lighter color for placeholder
                                    keyboardType="numeric"
                                    value={amount}
                                    onChangeText={(text) => {
                                        setAmount(text);
                                        if (prediction) setPrediction(null); // Clear prediction on edit
                                    }}
                                    autoFocus={true}
                                    selectionColor={theme.tint}
                                />
                            </View>

                            {/* Categories or Result */}
                            {!prediction ? (
                                <>
                                    {/* Category Pills */}
                                    <View style={styles.categoriesContainer}>
                                        <Text style={[styles.sectionLabel, { color: theme.icon }]}>Select Category</Text>
                                        <ScrollView
                                            horizontal
                                            showsHorizontalScrollIndicator={false}
                                            contentContainerStyle={styles.categoriesScrollContent}
                                        >
                                            {CATEGORIES.map((cat) => (
                                                <TouchableOpacity
                                                    key={cat.id}
                                                    style={[
                                                        styles.categoryPill,
                                                        {
                                                            backgroundColor: selectedCategory === cat.name ? theme.tint : (isDark ? '#333' : '#F3F4F6'),
                                                            borderColor: selectedCategory === cat.name ? theme.tint : theme.border,
                                                            borderWidth: 1,
                                                        }
                                                    ]}
                                                    onPress={() => handleCategorySelect(cat)}
                                                >
                                                    <Ionicons
                                                        name={cat.icon as any}
                                                        size={16}
                                                        color={selectedCategory === cat.name ? '#FFF' : theme.text}
                                                    />
                                                    <Text style={[
                                                        styles.categoryText,
                                                        { color: selectedCategory === cat.name ? '#FFF' : theme.text }
                                                    ]}>
                                                        {cat.name}
                                                    </Text>
                                                </TouchableOpacity>
                                            ))}
                                        </ScrollView>
                                    </View>

                                    {/* Action Button */}
                                    <TouchableOpacity
                                        style={styles.actionButtonContainer}
                                        onPress={handlePredict}
                                        activeOpacity={0.8}
                                        disabled={!amount || !selectedCategory}
                                    >
                                        <LinearGradient
                                            colors={[theme.electricBlue || '#2979FF', '#2196F3']}
                                            style={[styles.actionButton, (!amount || !selectedCategory) && { opacity: 0.5 }]}
                                            start={{ x: 0, y: 0 }}
                                            end={{ x: 1, y: 0 }}
                                        >
                                            <MaterialCommunityIcons name="star-four-points" size={20} color="#FFF" style={styles.actionIcon} />
                                            <Text style={styles.actionButtonText}>Predict Impact</Text>
                                        </LinearGradient>
                                    </TouchableOpacity>
                                </>
                            ) : (
                                <View style={[styles.predictionCard, { 
                                    backgroundColor: isDark ? '#2C2C2E' : '#FFFAED', 
                                    borderColor: impactData?.tone === 'danger' ? theme.expense : impactData?.tone === 'warning' ? theme.warning : theme.income 
                                }]}>
                                    <View style={styles.predictionHeader}>
                                        <MaterialCommunityIcons 
                                            name={impactData?.tone === 'danger' ? 'alert-circle-outline' : impactData?.tone === 'warning' ? 'alert-outline' : 'check-circle-outline'} 
                                            size={24} 
                                            color={impactData?.tone === 'danger' ? theme.expense : impactData?.tone === 'warning' ? theme.warning : theme.income} 
                                        />
                                        <Text style={[styles.predictionTitle, { color: impactData?.tone === 'danger' ? theme.expense : impactData?.tone === 'warning' ? theme.warning : theme.income }]}>
                                            {impactData?.tone === 'danger' ? 'Caution' : impactData?.tone === 'warning' ? 'Warning' : 'All Good'}
                                        </Text>
                                    </View>
                                    <Text style={[styles.predictionText, { color: isDark ? '#EEE' : '#333' }]}>
                                        {prediction}
                                    </Text>

                                    {impactData && (
                                        <View style={[styles.statsGrid, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }]}>
                                            <View style={styles.statItem}>
                                                <Text style={[styles.statLabel, { color: theme.icon }]}>Remaining</Text>
                                                <Text style={[styles.statValue, { color: theme.text }]}>₹{impactData.remainingNetWorth.toLocaleString('en-IN')}</Text>
                                            </View>
                                            <View style={styles.statDivider} />
                                            <View style={styles.statItem}>
                                                <Text style={[styles.statLabel, { color: theme.icon }]}>Month Used</Text>
                                                <Text style={[styles.statValue, { color: theme.text }]}>{impactData.percentageUsed}%</Text>
                                            </View>
                                        </View>
                                    )}

                                    {/* Action Buttons */}
                                    <View style={styles.actionButtons}>
                                        <TouchableOpacity 
                                            style={[styles.cancelButton, { borderColor: theme.border }]}
                                            onPress={() => setPrediction(null)}
                                            disabled={isAdding}
                                        >
                                            <Text style={[styles.cancelButtonText, { color: theme.text }]}>Back</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity 
                                            style={[styles.confirmButton, { backgroundColor: impactData?.tone === 'danger' ? theme.expense : theme.tint }]}
                                            onPress={handleAddPurchase}
                                            disabled={isAdding}
                                        >
                                            {isAdding ? (
                                                <ActivityIndicator color="#FFF" size="small" />
                                            ) : (
                                                <>
                                                    <MaterialCommunityIcons name="check-circle" size={18} color="#FFF" />
                                                    <Text style={styles.confirmButtonText}>Add Purchase</Text>
                                                </>
                                            )}
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            )}

                        </View>
                    </View>
                </TouchableWithoutFeedback>
            </KeyboardAvoidingView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    absoluteBlur: {
        position: 'absolute',
        top: 0,
        left: 0,
        bottom: 0,
        right: 0,
        zIndex: 1,
    },
    dismissArea: {
        flex: 1,
    },
    keyboardAvoidingView: {
        flex: 1,
        justifyContent: 'flex-end',
        zIndex: 2,
    },
    modalContentWrapper: {
        justifyContent: 'flex-end',
    },
    modalContainer: {
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        padding: 24,
        paddingBottom: Platform.OS === 'ios' ? 40 : 24,
        width: '100%',
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: -4,
        },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 20,
    },
    handleBarContainer: {
        alignItems: 'center',
        marginBottom: 16,
    },
    handleBar: {
        width: 40,
        height: 4,
        borderRadius: 2,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '600',
        textAlign: 'center',
        marginBottom: 32,
    },
    inputContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 40,
    },
    currencySymbol: {
        fontSize: 40,
        fontWeight: '300',
        marginRight: 4,
        marginTop: -8, // Slight adjustment to align with massive text
    },
    amountInput: {
        fontSize: 64,
        fontWeight: '200',
        minWidth: 100,
        textAlign: 'center',
        padding: 0, // Remove default padding
    },
    categoriesContainer: {
        marginBottom: 32,
    },
    sectionLabel: {
        fontSize: 14,
        fontWeight: '500',
        marginBottom: 12,
        marginLeft: 4,
    },
    categoriesScrollContent: {
        gap: 12,
        paddingRight: 20, // Add some padding at the end of scroll
    },
    categoryPill: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 20,
        gap: 8,
    },
    categoryText: {
        fontSize: 14,
        fontWeight: '500',
    },
    actionButtonContainer: {
        width: '100%',
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 18,
        borderRadius: 24,
        shadowColor: '#2979FF',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 16,
        elevation: 8,
    },
    actionIcon: {
        marginRight: 8,
    },
    actionButtonText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: 'bold',
        letterSpacing: 0.5,
    },
    predictionCard: {
        borderRadius: 20,
        padding: 20,
        borderWidth: 1,
        gap: 12,
    },
    predictionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    predictionTitle: {
        fontSize: 16,
        fontWeight: '700',
    },
    predictionText: {
        fontSize: 15,
        lineHeight: 24,
        fontWeight: '500',
    },
    statsGrid: {
        flexDirection: 'row',
        borderRadius: 12,
        padding: 12,
        marginVertical: 8,
    },
    statItem: {
        flex: 1,
        alignItems: 'center',
    },
    statLabel: {
        fontSize: 11,
        fontWeight: '600',
        marginBottom: 4,
    },
    statValue: {
        fontSize: 16,
        fontWeight: '800',
    },
    statDivider: {
        width: 1,
        backgroundColor: 'rgba(255,255,255,0.1)',
    },
    actionButtons: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 16,
    },
    cancelButton: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 16,
        borderWidth: 1.5,
        alignItems: 'center',
        justifyContent: 'center',
    },
    cancelButtonText: {
        fontSize: 15,
        fontWeight: '700',
    },
    confirmButton: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        gap: 8,
    },
    confirmButtonText: {
        color: '#FFF',
        fontSize: 15,
        fontWeight: '700',
    },
    suggestionBox: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 12,
        gap: 8,
        marginTop: 8,
    },
    suggestionText: {
        fontSize: 14,
        fontWeight: '600',
    },
});