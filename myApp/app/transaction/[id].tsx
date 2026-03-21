import { useTransactions } from '@/context/TransactionContext';
import { Colors } from '@/constants/theme';
import { useTheme } from '@/context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import {
    Alert,
    Image,
    Platform,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';

let MapsModule: any = null;
try {
    // Expo Go may not include react-native-maps in every runtime.
    MapsModule = require('react-native-maps');
} catch {
    MapsModule = null;
}

export default function TransactionDetailsScreen() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const { transactions: expenses, deleteTransaction } = useTransactions();
    const { theme: currentTheme } = useTheme();
    const theme = Colors[currentTheme];

    const transaction = useMemo(() => {
        for (const group of expenses) {
            const found = group.items.find((item) => item.id === id);
            if (found) return { ...found, date: group.date };
        }
        return null;
    }, [id, expenses]);

    const MapViewComponent = MapsModule?.default;
    const MarkerComponent = MapsModule?.Marker;

    const handleDelete = () => {
        if (!transaction) return;

        // Show confirmation dialog
        Alert.alert(
            'Delete Transaction',
            'Are you sure you want to delete this transaction?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        await deleteTransaction(transaction.id);
                        router.back();
                    },
                },
            ]
        );
    };

    const handleEdit = () => {
        if (!transaction) return;

        router.push({
            pathname: '/add-transaction',
            params: {
                transactionId: transaction.id,
                amount: Math.abs(transaction.amount).toString(),
                title: transaction.title,
                category: transaction.category,
                type: transaction.type,
                method: transaction.paymentMethod || transaction.subtitle || 'Cash',
                date: new Date(transaction.date).toISOString(),
                notes: transaction.note || '',
                location: transaction.location || '',
                latitude: transaction.latitude?.toString() || '',
                longitude: transaction.longitude?.toString() || '',
                subtitle: transaction.subtitle || '',
            },
        });
    };

    if (!transaction) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.iconButton}>
                        <Ionicons name="close" size={24} color="#000" />
                    </TouchableOpacity>
                </View>
                <View style={styles.centerContent}>
                    <Text style={styles.errorText}>Transaction not found</Text>
                </View>
            </SafeAreaView>
        );
    }

    const formatCurrency = (amount: number) => {
        return `₹${Math.abs(amount).toFixed(2)}`;
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
            <Stack.Screen options={{ headerShown: false }} />

            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Transaction Details</Text>
                <TouchableOpacity onPress={() => router.back()} style={[styles.iconButton, styles.leftIconButton]}>
                    <Ionicons name="close" size={28} color={theme.tint} />
                </TouchableOpacity>
                <View style={styles.rightActions}>
                    <TouchableOpacity onPress={handleEdit} style={styles.iconButton}>
                        <Ionicons name="create-outline" size={24} color={theme.tint} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={handleDelete} style={styles.iconButton}>
                        <Ionicons name="trash" size={24} color="#D32F2F" />
                    </TouchableOpacity>
                </View>
            </View>

            <ScrollView contentContainerStyle={styles.content}>

                {/* Main Amount Card */}
                <View style={styles.amountCard}>
                    <View style={[styles.iconContainer, { backgroundColor: transaction.color }]}>
                        <Ionicons name={transaction.icon as any} size={32} color="white" />
                    </View>
                    <Text style={styles.title}>{transaction.title}</Text>
                    <Text style={styles.subtitle}>{transaction.subtitle}</Text>

                    <Text style={[
                        styles.amount,
                        { color: transaction.type === 'expense' ? '#D32F2F' : theme.tint }
                    ]}>
                        {transaction.amount < 0 ? '-' : ''}{formatCurrency(transaction.amount)}
                    </Text>

                    <Text style={styles.date}>
                        {transaction.date.toLocaleDateString('default', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                        })} • {transaction.time}
                    </Text>
                </View>

                {/* Details Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Details</Text>

                    <View style={styles.row}>
                        <View style={styles.rowLabelContainer}>
                            <Ionicons name="grid-outline" size={20} color="#666" />
                            <Text style={styles.rowLabel}>Category</Text>
                        </View>
                        <Text style={styles.rowValue}>{transaction.category}</Text>
                    </View>

                    <View style={styles.divider} />

                    <View style={styles.row}>
                        <View style={styles.rowLabelContainer}>
                            <Ionicons name="location-outline" size={20} color="#666" />
                            <Text style={styles.rowLabel}>Location</Text>
                        </View>
                        <Text style={styles.rowValue}>{transaction.location}</Text>
                    </View>

                    {transaction.latitude && transaction.longitude && (
                        <View style={styles.mapContainer}>
                            {MapViewComponent && MarkerComponent ? (
                                <MapViewComponent
                                    style={styles.map}
                                    initialRegion={{
                                        latitude: transaction.latitude,
                                        longitude: transaction.longitude,
                                        latitudeDelta: 0.005,
                                        longitudeDelta: 0.005,
                                    }}
                                    scrollEnabled={false}
                                    zoomEnabled={false}
                                >
                                    <MarkerComponent
                                        coordinate={{
                                            latitude: transaction.latitude,
                                            longitude: transaction.longitude,
                                        }}
                                    />
                                </MapViewComponent>
                            ) : (
                                <View style={styles.mapFallback}>
                                    <Ionicons name="location-outline" size={18} color="#666" />
                                    <Text style={styles.mapFallbackText}>Map preview unavailable in Expo Go</Text>
                                </View>
                            )}
                        </View>
                    )}

                    <View style={styles.divider} />

                    <View style={styles.row}>
                        <View style={styles.rowLabelContainer}>
                            <Ionicons name="card-outline" size={20} color="#666" />
                            <Text style={styles.rowLabel}>Payment</Text>
                        </View>
                        <Text style={styles.rowValue}>{transaction.paymentMethod}</Text>
                    </View>

                    {transaction.note && (
                        <>
                            <View style={styles.divider} />
                            <View style={styles.row}>
                                <View style={styles.rowLabelContainer}>
                                    <Ionicons name="document-text-outline" size={20} color="#666" />
                                    <Text style={styles.rowLabel}>Note</Text>
                                </View>
                                <Text style={styles.rowValue}>{transaction.note}</Text>
                            </View>
                        </>
                    )}
                </View>

                {/* Receipt / Image Section */}
                {transaction.image && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Receipt / Image</Text>
                        <Image
                            source={{ uri: transaction.image }}
                            style={styles.receiptImage}
                            resizeMode="cover"
                        />
                    </View>
                )}

            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: Platform.OS === 'android' ? 40 : 10,
        paddingBottom: 20,
        position: 'relative',
    },
    iconButton: {
        padding: 4,
    },
    leftIconButton: {
        position: 'absolute',
        left: 20,
        top: Platform.OS === 'android' ? 40 : 10,
    },
    rightIconButton: {
        position: 'absolute',
        right: 20,
        top: Platform.OS === 'android' ? 40 : 10,
    },
    rightActions: {
        position: 'absolute',
        right: 20,
        top: Platform.OS === 'android' ? 40 : 10,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#2979FF',
        textAlign: 'center',
        maxWidth: '70%',
    },
    content: {
        paddingHorizontal: 20,
        paddingBottom: 40,
    },
    centerContent: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    errorText: {
        fontSize: 16,
        color: '#666',
    },
    amountCard: {
        alignItems: 'center',
        backgroundColor: 'white',
        borderRadius: 20,
        padding: 30,
        marginBottom: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 2,
    },
    iconContainer: {
        width: 64,
        height: 64,
        borderRadius: 32,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    title: {
        fontSize: 20,
        fontWeight: '600',
        color: '#1a1a1a',
        marginBottom: 4,
    },
    subtitle: {
        fontSize: 14,
        color: '#666',
        marginBottom: 16,
    },
    amount: {
        fontSize: 32,
        fontWeight: '700',
        marginBottom: 8,
    },
    date: {
        fontSize: 12,
        color: '#888',
        fontWeight: '500',
    },
    section: {
        backgroundColor: 'white',
        borderRadius: 20,
        padding: 20,
        marginBottom: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 2,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#2979FF',
        marginBottom: 16,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 8,
    },
    rowLabelContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    rowLabel: {
        fontSize: 14,
        color: '#666',
        fontWeight: '500',
    },
    rowValue: {
        fontSize: 14,
        color: '#1a1a1a',
        fontWeight: '500',
        maxWidth: '60%',
        textAlign: 'right',
    },
    divider: {
        height: 1,
        backgroundColor: '#f0f0f0',
        marginVertical: 4,
    },
    receiptImage: {
        width: '100%',
        height: 200,
        borderRadius: 12,
        marginTop: 8,
    },
    mapContainer: {
        height: 150,
        borderRadius: 12,
        overflow: 'hidden',
        marginTop: 10,
        marginBottom: 10,
    },
    map: {
        width: '100%',
        height: '100%',
    },
    mapFallback: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: '#F3F4F6',
    },
    mapFallbackText: {
        color: '#666',
        fontSize: 12,
        fontWeight: '500',
    },
});