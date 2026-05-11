import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants';
import DashboardScreen  from '../screens/dashboard/DashboardScreen';
import WhatsAppScreen   from '../screens/whatsapp/WhatsAppScreen';
import SalesScreen      from '../screens/sales/SalesScreen';
import SettingsScreen   from '../screens/settings/SettingsScreen';

export type AppTabParamList = {
  Dashboard: undefined;
  WhatsApp:  undefined;
  Sales:     undefined;
  Settings:  undefined;
};

const Tab = createBottomTabNavigator<AppTabParamList>();

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

const ICONS: Record<string, { active: IoniconsName; inactive: IoniconsName }> = {
  Dashboard: { active: 'grid',         inactive: 'grid-outline' },
  WhatsApp:  { active: 'logo-whatsapp', inactive: 'logo-whatsapp' },
  Sales:     { active: 'receipt',      inactive: 'receipt-outline' },
  Settings:  { active: 'settings',     inactive: 'settings-outline' },
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
          borderTopColor: '#e5e7eb',
          height: 60,
          paddingBottom: 8,
        },
        tabBarIcon: ({ focused, color, size }) => {
          const icons = ICONS[route.name];
          const name = focused ? icons.active : icons.inactive;
          return <Ionicons name={name} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} options={{ title: 'Tableau de bord' }} />
      <Tab.Screen name="WhatsApp"  component={WhatsAppScreen}  options={{ title: 'Commandes' }} />
      <Tab.Screen name="Sales"     component={SalesScreen}     options={{ title: 'Ventes' }} />
      <Tab.Screen name="Settings"  component={SettingsScreen}  options={{ title: 'Paramètres' }} />
    </Tab.Navigator>
  );
}
