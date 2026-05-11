import React from 'react';
import { View, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants';
import DashboardScreen from '../screens/dashboard/DashboardScreen';
import WhatsAppScreen  from '../screens/whatsapp/WhatsAppScreen';
import PosScreen       from '../screens/pos/PosScreen';
import SalesScreen     from '../screens/sales/SalesScreen';
import SettingsScreen  from '../screens/settings/SettingsScreen';

export type AppTabParamList = {
  Dashboard: undefined;
  WhatsApp:  undefined;
  POS:       undefined;
  Sales:     undefined;
  Settings:  undefined;
};

const Tab = createBottomTabNavigator<AppTabParamList>();

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

const ICONS: Record<string, { active: IoniconsName; inactive: IoniconsName }> = {
  Dashboard: { active: 'grid',          inactive: 'grid-outline' },
  WhatsApp:  { active: 'logo-whatsapp', inactive: 'logo-whatsapp' },
  POS:       { active: 'storefront',    inactive: 'storefront-outline' },
  Sales:     { active: 'receipt',       inactive: 'receipt-outline' },
  Settings:  { active: 'settings',      inactive: 'settings-outline' },
};

export default function AppNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor:   COLORS.primary,
        tabBarInactiveTintColor: COLORS.textLight,
        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopColor:  COLORS.gray200,
          height: 62,
          paddingBottom: 8,
        },
        tabBarIcon: ({ focused, color, size }) => {
          if (route.name === 'POS') {
            return (
              <View style={[styles.posIcon, { backgroundColor: focused ? COLORS.primary : COLORS.gray200 }]}>
                <Ionicons name="storefront" size={22} color={focused ? '#fff' : COLORS.textLight} />
              </View>
            );
          }
          const icons = ICONS[route.name];
          const name  = focused ? icons.active : icons.inactive;
          return <Ionicons name={name} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} options={{ title: 'Accueil' }} />
      <Tab.Screen name="WhatsApp"  component={WhatsAppScreen}  options={{ title: 'Commandes' }} />
      <Tab.Screen name="POS"       component={PosScreen}       options={{ title: 'Vente' }} />
      <Tab.Screen name="Sales"     component={SalesScreen}     options={{ title: 'Historique' }} />
      <Tab.Screen name="Settings"  component={SettingsScreen}  options={{ title: 'Paramètres' }} />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  posIcon: {
    width: 44, height: 44, borderRadius: 22,
    justifyContent: 'center', alignItems: 'center',
    marginTop: -8,
  },
});
