/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import { Platform } from 'react-native';

const tintColorLight = '#0a7ea4';
const tintColorDark = '#fff';

export const Colors = {
  light: {
    text: '#1A2B3C', // Deep Navy
    background: '#FFFFFF',
    tint: '#2979FF', // Electric Blue
    icon: '#1A2B3C',
    tabIconDefault: '#9BA1A6',
    tabIconSelected: '#2979FF',
    income: '#10B981', // Emerald Green
    expense: '#FF8A80', // Soft Coral
    navy: '#1A2B3C',
    emerald: '#10B981',
    coral: '#FF8A80',
    electricBlue: '#2979FF',
    card: '#FFFFFF',
    border: '#E5E7EB',
    // Traffic Light & Pastels
    success: '#10B981', // Emerald
    successLight: '#D1FAE5', // Soft Emerald
    warning: '#F59E0B', // Amber
    warningLight: '#FEF3C7', // Soft Amber
    danger: '#EF4444', // Red
    dangerLight: '#FEE2E2', // Soft Red
  },
  dark: {
    text: '#ECEDEE',
    background: '#151718',
    tint: '#2979FF',
    icon: '#9BA1A6',
    tabIconDefault: '#9BA1A6',
    tabIconSelected: '#2979FF',
    income: '#34D399',
    expense: '#F87171',
    navy: '#A0B0C0', // Light Navy for dark mode text
    emerald: '#34D399',
    coral: '#F87171',
    electricBlue: '#2979FF',
    card: '#1E1E1E',
    border: '#333333',
    // Traffic Light & Pastels (Dark Mode adjusted)
    success: '#34D399',
    successLight: '#064E3B', // Darker background for dark mode
    warning: '#FBBF24',
    warningLight: '#78350F',
    danger: '#F87171',
    dangerLight: '#7F1D1D',
  },
};

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});