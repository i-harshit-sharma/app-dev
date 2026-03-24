import { Ionicons } from '@expo/vector-icons';
import { createMaterialTopTabNavigator, MaterialTopTabNavigationEventMap, MaterialTopTabNavigationOptions } from '@react-navigation/material-top-tabs';
import { ParamListBase, TabNavigationState } from '@react-navigation/native';
import { withLayoutContext, Redirect } from 'expo-router';
import React from 'react';
import { StyleSheet, View } from 'react-native';

import CustomHeader from '@/components/CustomHeader';
import FloatingActions from '@/components/FloatingActions';
import { Colors } from '@/constants/theme';

const { Navigator } = createMaterialTopTabNavigator();

export const MaterialTopTabs = withLayoutContext<
  MaterialTopTabNavigationOptions,
  typeof Navigator,
  TabNavigationState<ParamListBase>,
  MaterialTopTabNavigationEventMap
>(Navigator);

import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';

export default function TabLayout() {
  const { theme: currentTheme } = useTheme();
  const theme = Colors[currentTheme];
  const { isSignedIn, isLoading } = useAuth();

  if (isLoading) return null;

  if (!isSignedIn) {
    return <Redirect href="/login" />;
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <CustomHeader />

      <MaterialTopTabs
        tabBarPosition="bottom"
        screenOptions={{
          tabBarActiveTintColor: theme.tint,
          tabBarInactiveTintColor: theme.icon,
          tabBarStyle: {
            backgroundColor: theme.background,
            borderTopWidth: 1,
            borderTopColor: theme.border,
            elevation: 0,
            shadowOpacity: 0,
            height: 70,
            paddingBottom: 10,
          },
          tabBarIndicatorStyle: {
            height: 0, // Remove indicator for a bottom-tab feel
          },
          tabBarLabelStyle: {
            textTransform: 'none',
            fontSize: 10,
            fontWeight: '600',
            marginTop: 4,
          },
          tabBarIconStyle: {
            height: 24,
            width: 24,
          },
          animationEnabled: false,
          swipeEnabled: false,
          lazy: false,
          lazyPreloadDistance: 5,
        }}
      >
        <MaterialTopTabs.Screen
          name="index"
          options={{
            title: 'Home',
            tabBarIcon: ({ color, focused }) => <Ionicons size={24} name={focused ? 'home' : 'home-outline'} color={color} />,
          }}
        />
        <MaterialTopTabs.Screen
          name="explore"
          options={{
            title: 'Trends',
            tabBarIcon: ({ color, focused }) => <Ionicons size={24} name={focused ? 'analytics' : 'analytics-outline'} color={color} />,
          }}
        />
        <MaterialTopTabs.Screen
          name="chat"
          options={{
            title: 'AI Chat',
            tabBarIcon: ({ color, focused }) => <Ionicons size={24} name={focused ? 'sparkles' : 'sparkles-outline'} color={color} />,
          }}
        />
        <MaterialTopTabs.Screen
          name="budget"
          options={{
            title: 'Budget',
            tabBarIcon: ({ color, focused }) => <Ionicons size={24} name={focused ? 'wallet' : 'wallet-outline'} color={color} />,
          }}
        />
        <MaterialTopTabs.Screen
          name="profile"
          options={{
            title: 'Profile',
            tabBarIcon: ({ color, focused }) => <Ionicons size={24} name={focused ? 'person-circle' : 'person-circle-outline'} color={color} />
          }}
        />

        {/* Hiding budget for now if Trends covers it, or I could not list it to hide it from tabs but keep route? 
            MaterialTopTabs shows all screens unless mapped. 
            I should ensure 'budget' isn't shown if I don't want it. 
            If I don't include a Screen component, it might not be in the tab bar but might not be accessible?
            Actually with Expo Router, file-based routing exists. 
            If I want to HIDE it from the tab bar but keep it accessible via generic routing, 
            I can just NOT include <MaterialTopTabs.Screen /> for it? 
            Wait, MaterialTopTabs requires defining screens as children.
            If I omit 'budget', it won't be in the tab bar.
        */}
      </MaterialTopTabs>

      <FloatingActions />
    </View >
  );
}

const styles = StyleSheet.create({
});