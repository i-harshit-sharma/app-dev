import { Colors } from '@/constants/theme';
import { useTheme } from '@/context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, TextInput, TextInputProps, TouchableOpacity, View } from 'react-native';

interface SearchBarProps {
    value: string;
    onChangeText: (value: string) => void;
    placeholder?: string;
    inputRef?: TextInputProps['ref'];
}

export default function SearchBar({ value, onChangeText, placeholder = 'Search transactions or goals...', inputRef }: SearchBarProps) {
    const { theme: currentTheme } = useTheme();
    const theme = Colors[currentTheme];
    const isDark = currentTheme === 'dark';

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            <View style={[styles.searchContainer, { backgroundColor: isDark ? '#2A2A2A' : '#F0F2F5' }]}>
                <Ionicons name="search" size={20} color={theme.icon} style={styles.icon} />
                <TextInput
                    ref={inputRef}
                    placeholder={placeholder}
                    placeholderTextColor={theme.icon}
                    style={[styles.input, { color: theme.text }]}
                    value={value}
                    onChangeText={onChangeText}
                    returnKeyType="search"
                />
                {value.trim() ? (
                    <TouchableOpacity onPress={() => onChangeText('')}>
                        <Ionicons name="close-circle" size={18} color={theme.icon} />
                    </TouchableOpacity>
                ) : null}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: 16,
        paddingVertical: 10,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 24,
        paddingHorizontal: 16,
        height: 44,
    },
    icon: {
        marginRight: 8,
    },
    input: {
        flex: 1,
        fontSize: 16,
    },
});