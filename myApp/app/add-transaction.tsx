
import { TransactionType, useTransactions } from '@/context/TransactionContext';
import { Colors } from '@/constants/theme';
import { useTheme } from '@/context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Location from 'expo-location';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    KeyboardAvoidingView,
    Modal,
    Platform,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import MapView, { Marker, Region } from 'react-native-maps';

export default function AddTransactionScreen() {
    const router = useRouter();
    const { theme: currentTheme } = useTheme();
    const theme = Colors[currentTheme];
    const {
        transactionId: paramTransactionId,
        amount: paramAmount,
        title: paramTitle,
        category: paramCategory,
        date: paramDate,
        type: paramType,
        method: paramMethod,
        notes: paramNotes,
        returnTo: paramReturnTo,
        location: paramLocation,
        latitude: paramLatitude,
        longitude: paramLongitude,
        subtitle: paramSubtitle,
    } = useLocalSearchParams();
    const { addTransaction, updateTransaction } = useTransactions();

    const isEditMode = !!paramTransactionId;

    const [type, setType] = useState<TransactionType>('expense');
    const [amount, setAmount] = useState('');
    const [title, setTitle] = useState('');
    const [subtitle, setSubtitle] = useState('');
    const [category, setCategory] = useState('');
    const [location, setLocation] = useState('Kolkata');
    const [coordinates, setCoordinates] = useState<{ latitude: number; longitude: number } | null>(null);
    const [isLoadingLocation, setIsLoadingLocation] = useState(false);
    const [time, setTime] = useState(new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: 'numeric', hour12: true }));
    const [pickerDate, setPickerDate] = useState(new Date());
    const [showPicker, setShowPicker] = useState(false);
    const [mapRegion, setMapRegion] = useState({
        latitude: 22.5726, // Default to Kolkata (matching initial state)
        longitude: 88.3639,
        latitudeDelta: 0.0922,
        longitudeDelta: 0.0421,
    });

    useEffect(() => {
        if (paramAmount) setAmount(paramAmount.toString());
        if (paramTitle) setTitle(paramTitle.toString());
        if (paramCategory) setCategory(paramCategory.toString());
        if (paramMethod) setSubtitle(paramMethod.toString());
        if (paramSubtitle) setSubtitle(paramSubtitle.toString());
        if (paramLocation) setLocation(paramLocation.toString());
        if (paramType === 'income' || paramType === 'expense') setType(paramType);
        if (paramNotes) setNote(paramNotes.toString());
        if (paramLatitude && paramLongitude) {
            const latitude = Number(paramLatitude);
            const longitude = Number(paramLongitude);
            if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
                setCoordinates({ latitude, longitude });
                setMapRegion((prev) => ({ ...prev, latitude, longitude }));
            }
        }
        if (paramDate) {
            const d = new Date(paramDate.toString());
            if (!isNaN(d.getTime())) {
                setPickerDate(d);
                setTime(d.toLocaleTimeString('en-US', { hour: 'numeric', minute: 'numeric', hour12: true }));
            }
        }
    }, [paramAmount, paramTitle, paramCategory, paramDate, paramMethod, paramType, paramNotes, paramLocation, paramLatitude, paramLongitude, paramSubtitle]);

    useEffect(() => {
        if (isEditMode) return;

        (async () => {
            // Basic permission check - attempt to fetch if already granted or just try
            // We can use requestForegroundPermissionsAsync which is idempotent-ish or check status first
            try {
                const { status } = await Location.requestForegroundPermissionsAsync();
                if (status === 'granted') {
                    const loc = await Location.getCurrentPositionAsync({});
                    const { latitude, longitude } = loc.coords;
                    setCoordinates({ latitude, longitude });
                    setMapRegion(prev => ({ ...prev, latitude, longitude }));

                    // Also reverse geocode if we don't have a manual location yet (or to update it)
                    // Ideally we only overwrite if user hasn't typed anything, but here we'll just do it for 'automatically add'
                    const reverseGeocode = await Location.reverseGeocodeAsync({ latitude, longitude });
                    if (reverseGeocode.length > 0) {
                        const address = reverseGeocode[0];
                        const locationName = address.city || address.region || address.country || '';
                        if (locationName) setLocation(locationName);
                    }
                }
            } catch (e) {
                console.log("Auto-location failed", e);
            }
        })();
    }, [isEditMode]);

    // Dropdown states
    const [showCategoryPicker, setShowCategoryPicker] = useState(false);
    const [showMethodPicker, setShowMethodPicker] = useState(false);
    const [note, setNote] = useState('');

    const categories = ['Food', 'Shopping', 'Entertainment', 'Transport', 'Health', 'Bills', 'Education', 'Salary', 'Rent', 'Groceries', 'Others'];
    const paymentMethods = ['Cash', 'UPI', 'Card', 'Bank Transfer'];

    const onTimeChange = (event: any, selectedDate?: Date) => {
        const currentDate = selectedDate || pickerDate;
        if (Platform.OS === 'android') {
            setShowPicker(false);
        }
        setPickerDate(currentDate);
        setTime(currentDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: 'numeric', hour12: true }));
    };

    const handleGetLocation = async () => {
        setIsLoadingLocation(true);
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission denied', 'Permission to access location was denied');
                setIsLoadingLocation(false);
                return;
            }

            const location = await Location.getCurrentPositionAsync({});
            setCoordinates({
                latitude: location.coords.latitude,
                longitude: location.coords.longitude
            });
            setMapRegion({
                latitude: location.coords.latitude,
                longitude: location.coords.longitude,
                latitudeDelta: 0.005, // Zoom in
                longitudeDelta: 0.005,
            });


            const reverseGeocode = await Location.reverseGeocodeAsync({
                latitude: location.coords.latitude,
                longitude: location.coords.longitude
            });

            if (reverseGeocode.length > 0) {
                const address = reverseGeocode[0];
                // Prioritize city, then region/state, then country
                const locationName = address.city || address.region || address.country || '';
                if (locationName) {
                    setLocation(locationName);
                }
            }
        } catch (error) {
            console.log(error);
            Alert.alert('Error', 'Could not fetch current location');
        } finally {
            setIsLoadingLocation(false);
        }
    };

    const handleSetCurrentTime = () => {
        const now = new Date();
        setPickerDate(now);
        setTime(now.toLocaleTimeString('en-US', { hour: 'numeric', minute: 'numeric', hour12: true }));
    };

    const handleSave = async () => {
        if (!amount || !title) {
            Alert.alert('Error', 'Please enter at least an amount and a title.');
            return;
        }

        const numAmount = parseFloat(amount);
        if (isNaN(numAmount)) {
            Alert.alert('Error', 'Please enter a valid amount.');
            return;
        }

        // Adjust amount sign based on type
        const finalAmount = type === 'expense' ? -Math.abs(numAmount) : Math.abs(numAmount);

        const transactionDate = new Date(pickerDate);
        transactionDate.setHours(pickerDate.getHours());
        transactionDate.setMinutes(pickerDate.getMinutes());
        transactionDate.setSeconds(0);

        const payload = {
            title,
            subtitle: subtitle || (type === 'expense' ? 'Cash' : 'Income'),
            amount: finalAmount,
            currency: '₹',
            type,
            icon: type === 'expense' ? 'cart' : 'cash', // Default icons
            color: type === 'expense' ? '#D32F2F' : theme.tint,
            location: location || 'Kolkata',
            latitude: coordinates?.latitude,
            longitude: coordinates?.longitude,
            time: time,
            category: category || 'General',
            paymentMethod: subtitle || 'Cash', // Using subtitle as payment method for consistency
            date: transactionDate,
            note,
        };

        if (isEditMode && typeof paramTransactionId === 'string') {
            await updateTransaction(paramTransactionId, payload);
        } else {
            await addTransaction(payload);
        }

        if (typeof paramReturnTo === 'string' && paramReturnTo.trim().length > 0) {
            router.replace(paramReturnTo as any);
            return;
        }

        router.back();
    };

    const renderPickerModal = (visible: boolean, onClose: () => void, data: string[], onSelect: (item: string) => void, title: string) => (
        <Modal
            visible={visible}
            transparent={true}
            animationType="slide"
            onRequestClose={onClose}
        >
            <TouchableOpacity
                style={styles.modalOverlay}
                activeOpacity={1}
                onPress={onClose}
            >
                <View style={styles.modalContent}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>{title}</Text>
                        <TouchableOpacity onPress={onClose}>
                            <Ionicons name="close" size={24} color="#666" />
                        </TouchableOpacity>
                    </View>
                    <FlatList
                        data={data}
                        keyExtractor={(item) => item}
                        renderItem={({ item }) => (
                            <TouchableOpacity
                                style={styles.modalItem}
                                onPress={() => {
                                    onSelect(item);
                                    onClose();
                                }}
                            >
                                <Text style={styles.modalItemText}>{item}</Text>
                            </TouchableOpacity>
                        )}
                    />
                </View>
            </TouchableOpacity>
        </Modal>
    );

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.closeButton}>
                    <Ionicons name="close" size={28} color={theme.tint} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: theme.tint }]}>{isEditMode ? 'Edit Transaction' : 'New Transaction'}</Text>
                <TouchableOpacity onPress={handleSave} style={[styles.saveButton, { backgroundColor: theme.tint }]}>
                    <Text style={styles.saveButtonText}>{isEditMode ? 'Update' : 'Save'}</Text>
                </TouchableOpacity>
            </View>

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
            >
                <ScrollView contentContainerStyle={styles.content}>

                    {/* Type Segmented Control */}
                    <View style={styles.segmentContainer}>
                        <TouchableOpacity
                            style={[
                                styles.segmentButton,
                                type === 'expense' && styles.segmentButtonActive,
                                type === 'expense' && { backgroundColor: '#FFF0EE' }
                            ]}
                            onPress={() => setType('expense')}
                        >
                            <Text style={[
                                styles.segmentText,
                                type === 'expense' && { color: '#D32F2F', fontWeight: 'bold' }
                            ]}>Expense</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[
                                styles.segmentButton,
                                type === 'income' && styles.segmentButtonActive,
                                type === 'income' && { backgroundColor: '#EAF2FF' }
                            ]}
                            onPress={() => setType('income')}
                        >
                            <Text style={[
                                styles.segmentText,
                                type === 'income' && { color: theme.tint, fontWeight: 'bold' }
                            ]}>Income</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Amount Input */}
                    <View style={styles.inputContainer}>
                        <Text style={styles.label}>Amount</Text>
                        <View style={styles.amountInputWrapper}>
                            <Text style={styles.currencySymbol}>₹</Text>
                            <TextInput
                                style={styles.amountInput}
                                value={amount}
                                onChangeText={setAmount}
                                placeholder="0.00"
                                keyboardType="numeric"
                                placeholderTextColor="#ccc"
                                autoFocus
                            />
                        </View>
                    </View>

                    {/* Details Form */}
                    <View style={styles.formSection}>
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Title</Text>
                            <TextInput
                                style={styles.textInput}
                                value={title}
                                onChangeText={setTitle}
                                placeholder="e.g. Lunch, Salary"
                                placeholderTextColor="#999"
                            />
                        </View>

                        <View style={styles.row}>
                            <View style={[styles.inputGroup, { flex: 1, marginRight: 10 }]}>
                                <Text style={styles.label}>Category</Text>
                                <TouchableOpacity
                                    onPress={() => setShowCategoryPicker(true)}
                                    style={styles.dropdownButton}
                                >
                                    <Text style={[styles.dropdownText, !category && { color: '#999' }]}>
                                        {category || 'Select'}
                                    </Text>
                                    <Ionicons name="chevron-down" size={20} color="#666" />
                                </TouchableOpacity>
                            </View>
                            <View style={[styles.inputGroup, { flex: 1, marginLeft: 10 }]}>
                                <Text style={styles.label}>Method</Text>
                                <TouchableOpacity
                                    onPress={() => setShowMethodPicker(true)}
                                    style={styles.dropdownButton}
                                >
                                    <Text style={[styles.dropdownText, !subtitle && { color: '#999' }]}>
                                        {subtitle || 'Select'}
                                    </Text>
                                    <Ionicons name="chevron-down" size={20} color="#666" />
                                </TouchableOpacity>
                            </View>
                        </View>

                        <View style={styles.row}>
                            <View style={[styles.inputGroup, { flex: 1, marginRight: 10 }]}>
                                <Text style={styles.label}>Location</Text>
                                <View style={{ flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#e0e0e0' }}>
                                    <TextInput
                                        style={{ flex: 1, paddingVertical: 8, fontSize: 16, color: '#1a1a1a' }}
                                        value={location}
                                        onChangeText={setLocation}
                                        placeholder="e.g. Kolkata"
                                        placeholderTextColor="#999"
                                    />
                                    <TouchableOpacity onPress={handleGetLocation} style={{ padding: 4 }}>
                                        {isLoadingLocation ? (
                                            <ActivityIndicator size="small" color={theme.tint} />
                                        ) : (
                                            <Ionicons name="location-outline" size={20} color={theme.tint} />
                                        )}
                                    </TouchableOpacity>
                                </View>
                            </View>
                            <View style={[styles.inputGroup, { flex: 1, marginLeft: 10 }]}>
                                <Text style={styles.label}>Time</Text>
                                <View style={{ flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#e0e0e0' }}>
                                    <TouchableOpacity onPress={() => setShowPicker(!showPicker)} style={{ flex: 1 }}>
                                        <View style={{ paddingVertical: 8 }}>
                                            <Text style={{ fontSize: 16, color: '#1a1a1a' }}>{time}</Text>
                                        </View>
                                    </TouchableOpacity>
                                    <TouchableOpacity onPress={handleSetCurrentTime} style={{ padding: 4 }}>
                                        <Ionicons name="time-outline" size={20} color={theme.tint} />
                                    </TouchableOpacity>
                                </View>
                                {showPicker && (
                                    <DateTimePicker
                                        testID="dateTimePicker"
                                        value={pickerDate}
                                        mode="time"
                                        is24Hour={false}
                                        display="default"
                                        onChange={onTimeChange}
                                    />
                                )}
                            </View>
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Note</Text>
                            <TextInput
                                style={styles.textInput}
                                value={note}
                                onChangeText={setNote}
                                placeholder="Optional note"
                                placeholderTextColor="#999"
                                multiline
                            />
                        </View>
                    </View>

                    {/* Map View */}
                    {/* <View style={styles.mapContainer}>
                        <MapView
                            style={styles.map}
                            region={mapRegion}
                            onRegionChangeComplete={(region: Region) => setMapRegion(region)}
                        >
                            {coordinates && (
                                <Marker
                                    coordinate={coordinates}
                                    title="Transaction Location"
                                />
                            )}
                        </MapView>
                    </View> */}

                </ScrollView>
            </KeyboardAvoidingView>

            {renderPickerModal(showCategoryPicker, () => setShowCategoryPicker(false), categories, setCategory, 'Select Category')}
            {renderPickerModal(showMethodPicker, () => setShowMethodPicker(false), paymentMethods, setSubtitle, 'Select Payment Method')}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: Platform.OS === 'android' ? 40 : 10,
        paddingBottom: 20,
        backgroundColor: '#FFFFFF',
        zIndex: 10,
    },
    closeButton: {
        padding: 4,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#2979FF',
    },
    saveButton: {
        paddingVertical: 6,
        paddingHorizontal: 12,
        backgroundColor: '#2979FF',
        borderRadius: 20,
    },
    saveButtonText: {
        color: 'white',
        fontWeight: '600',
    },
    content: {
        padding: 20,
    },
    segmentContainer: {
        flexDirection: 'row',
        backgroundColor: '#f5f5f5',
        borderRadius: 12,
        padding: 4,
        marginBottom: 24,
    },
    segmentButton: {
        flex: 1,
        paddingVertical: 10,
        alignItems: 'center',
        borderRadius: 10,
    },
    segmentButtonActive: {
        backgroundColor: 'white',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 1,
        elevation: 1,
    },
    segmentText: {
        fontSize: 14,
        fontWeight: '500',
        color: '#666',
    },
    inputContainer: {
        marginBottom: 30,
        alignItems: 'center',
    },
    amountInputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    currencySymbol: {
        fontSize: 40,
        fontWeight: '700',
        color: '#1a1a1a',
        marginRight: 4,
    },
    amountInput: {
        fontSize: 40,
        fontWeight: '700',
        color: '#1a1a1a',
        minWidth: 100,
    },
    formSection: {
        backgroundColor: 'white',
        borderRadius: 20,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 2,
    },
    inputGroup: {
        marginBottom: 16,
    },
    row: {
        flexDirection: 'row',
    },
    label: {
        fontSize: 12,
        color: '#666',
        fontWeight: '600',
        marginBottom: 8,
        textTransform: 'uppercase',
    },
    textInput: {
        borderBottomWidth: 1,
        borderBottomColor: '#e0e0e0',
        paddingVertical: 8,
        fontSize: 16,
        color: '#1a1a1a',
    },
    dropdownButton: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: '#e0e0e0',
        paddingVertical: 8,
    },
    dropdownText: {
        fontSize: 16,
        color: '#1a1a1a',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: 'white',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        maxHeight: '50%',
        paddingBottom: 20,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#1a1a1a',
    },
    modalItem: {
        paddingVertical: 15,
        paddingHorizontal: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#f9f9f9',
    },
    modalItemText: {
        fontSize: 16,
        color: '#333',
    },
    mapContainer: {
        marginTop: 20,
        height: 200,
        borderRadius: 20,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#e0e0e0',
    },
    map: {
        width: '100%',
        height: '100%',
    },
});