import { Colors } from '@/constants/theme';
import { useTheme } from '@/context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { usePathname, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';

export default function FloatingActions() {
    const router = useRouter();
    const { theme: currentTheme } = useTheme();
    const theme = Colors[currentTheme];
    const pathname = usePathname();
    const [isOpen, setIsOpen] = useState(false);

    // Animation values
    const rotation = useSharedValue(0);
    const translationY = useSharedValue(0);
    const opacity = useSharedValue(0);

    const isHome = pathname === '/' || pathname === '/index' || pathname === '/(tabs)/index'; // exact match might be needed depending on router setup



    const toggleMenu = () => {
        const nextState = !isOpen;
        setIsOpen(nextState);

        rotation.value = withSpring(nextState ? 45 : 0);
        translationY.value = withSpring(nextState ? -10 : 0); // slight move up
        opacity.value = withTiming(nextState ? 1 : 0, { duration: 200 });
    };

    const handleAction = (action: string) => {
        toggleMenu(); // Close menu
        switch (action) {
            case 'scan':
                router.push({
                    pathname: '/ocr-camera',
                    params: { returnTo: pathname },
                });
                break;
            case 'voice':
                router.push('/voice-command');
                break;
            case 'manual':
                router.push('/add-transaction');
                break;
        }
    };

    const animatedFabStyle = useAnimatedStyle(() => {
        return {
            transform: [{ rotate: `${rotation.value}deg` }],
        };
    });

    const animatedMenuStyle = useAnimatedStyle(() => {
        return {
            opacity: opacity.value,
            transform: [
                { translateY: withSpring(isOpen ? 0 : 20) },
                { scale: withSpring(isOpen ? 1 : 0.8) }
            ],
        };
    });

    if (!isHome) return null;

    return (
        <View style={styles.root} pointerEvents="box-none">
            {/* Backdrop only while menu is open */}
            {isOpen && <Pressable style={styles.backdrop} onPress={toggleMenu} />}

            <View style={styles.fabArea} pointerEvents="box-none">
                {/* Menu Items are mounted only when open so hidden views never block touches */}
                {isOpen && (
                    <Animated.View style={[styles.menuContainer, animatedMenuStyle]}>
                        <TouchableOpacity style={styles.actionButton} onPress={() => handleAction('scan')}>
                            <View style={[styles.actionIcon, { backgroundColor: '#E3F2FD' }]}>
                                <Ionicons name="scan" size={20} color={theme.tint} />
                            </View>
                            <Text style={[styles.actionLabel, { color: theme.text }]}>Scan Receipt</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.actionButton} onPress={() => handleAction('voice')}>
                            <View style={[styles.actionIcon, { backgroundColor: '#EAF2FF' }]}>
                                <Ionicons name="mic" size={20} color={theme.tint} />
                            </View>
                            <Text style={[styles.actionLabel, { color: theme.text }]}>Voice Command</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.actionButton} onPress={() => handleAction('manual')}>
                            <View style={[styles.actionIcon, { backgroundColor: '#FCE4EC' }]}>
                                <Ionicons name="create" size={20} color={theme.expense} />
                            </View>
                            <Text style={[styles.actionLabel, { color: theme.text }]}>Manual Entry</Text>
                        </TouchableOpacity>
                    </Animated.View>
                )}

                {/* Main FAB */}
                <TouchableOpacity
                    style={[styles.fab, { backgroundColor: theme.tint, shadowColor: theme.tint, marginBottom: 60 }]}
                    onPress={toggleMenu}
                    activeOpacity={0.8}
                >
                    <Animated.View style={animatedFabStyle}>
                        <Ionicons name="add" size={32} color="white" />
                    </Animated.View>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    root: {
        ...StyleSheet.absoluteFillObject,
        zIndex: 1000,
    },
    fabArea: {
        position: 'absolute',
        bottom: 30, // Adjusted for typical tab bar height if overlaying, or just above it
        right: 20,
        alignItems: 'flex-end',
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.2)', // gentle dim
    },
    menuContainer: {
        marginBottom: 16,
        alignItems: 'flex-end',
        gap: 12,
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    actionLabel: {
        fontSize: 14,
        fontWeight: '600',
        backgroundColor: 'white',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        overflow: 'hidden',
    },
    actionIcon: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
    },
    fab: {
        width: 64,
        height: 64,
        borderRadius: 32,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 8,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
    },
});