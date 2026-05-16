import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet, Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { C } from '../constants';
import { useAuthStore } from '../store/authStore';
import DashboardScreen from '../screens/dashboard/DashboardScreen';
import WhatsAppScreen  from '../screens/whatsapp/WhatsAppScreen';
import PosScreen       from '../screens/pos/PosScreen';
import SalesNavigator  from './SalesNavigator';
import SettingsScreen  from '../screens/settings/SettingsScreen';

export type AppTabParamList = {
  Dashboard: undefined;
  Sales:     undefined;
  POS:       undefined;
  WhatsApp:  undefined;
  Settings:  undefined;
};

const Tab = createBottomTabNavigator<AppTabParamList>();

// ── Custom tab bar with centred FAB ──────────────────────────────────────────
function YoriinTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const business = useAuthStore(s => s.business);
  const hasWhatsApp = business?.has_whatsapp ?? false;

  const LEFT  = ['Dashboard', 'Sales'];
  const RIGHT = hasWhatsApp ? ['WhatsApp', 'Settings'] : ['Settings'];

  const badge: Record<string, number | undefined> = {
    WhatsApp: 4,
  };

  const icons: Record<string, { on: any; off: any; label: string }> = {
    Dashboard: { on: 'home',    off: 'home-outline',    label: 'Accueil'  },
    Sales:     { on: 'receipt', off: 'receipt-outline', label: 'Ventes'   },
    WhatsApp:  { on: 'chatbubble', off: 'chatbubble-outline', label: 'WhatsApp' },
    Settings:  { on: 'grid',    off: 'grid-outline',    label: 'Plus'     },
  };

  const activeRoute = state.routes[state.index]?.name;
  const isPOS = activeRoute === 'POS';

  const renderTab = (routeName: string) => {
    const route = state.routes.find(r => r.name === routeName);
    if (!route) return null;
    const isFocused = activeRoute === routeName;
    const ic = icons[routeName];
    const b = badge[routeName];

    return (
      <TouchableOpacity
        key={routeName}
        style={tb.tab}
        onPress={() => {
          if (!isFocused) navigation.navigate(routeName as any);
        }}
        activeOpacity={0.7}
      >
        <View>
          <Ionicons
            name={isFocused ? ic.on : ic.off}
            size={24}
            color={isFocused ? C.primary : '#9CA3AF'}
          />
          {b !== undefined && (
            <View style={tb.badge}>
              <Text style={tb.badgeText}>{b}</Text>
            </View>
          )}
        </View>
        <Text style={[tb.label, isFocused && tb.labelOn]}>{ic.label}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={tb.container}>
      {/* Left tabs */}
      <View style={tb.side}>
        {LEFT.map(renderTab)}
      </View>

      {/* FAB */}
      <View style={tb.fabWrap}>
        <TouchableOpacity
          style={[tb.fab, isPOS && { backgroundColor: C.primaryD }]}
          onPress={() => navigation.navigate('POS' as any)}
          activeOpacity={0.85}
        >
          <Ionicons name="add" size={28} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Right tabs */}
      <View style={[tb.side, RIGHT.length === 1 && { justifyContent: 'center' }]}>
        {RIGHT.map(renderTab)}
      </View>
    </View>
  );
}

export default function AppNavigator() {
  const business = useAuthStore(s => s.business);
  const hasWhatsApp = business?.has_whatsapp ?? false;

  return (
    <Tab.Navigator
      tabBar={(props) => <YoriinTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="Sales"     component={SalesNavigator} />
      <Tab.Screen name="POS"       component={PosScreen} />
      {hasWhatsApp && (
        <Tab.Screen name="WhatsApp" component={WhatsAppScreen} />
      )}
      <Tab.Screen name="Settings"  component={SettingsScreen} />
    </Tab.Navigator>
  );
}

const tb = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: 'rgba(255,255,255,0.96)',
    borderTopWidth: 1,
    borderTopColor: C.border,
    paddingBottom: Platform.OS === 'ios' ? 26 : 8,
    paddingTop: 6,
  },
  side:  { flex: 2, flexDirection: 'row' },
  tab:   { flex: 1, alignItems: 'center', justifyContent: 'flex-end', paddingVertical: 4, gap: 3 },
  label: { fontSize: 10.5, fontWeight: '500', color: '#9CA3AF', letterSpacing: 0.1 },
  labelOn: { color: C.primary, fontWeight: '600' },
  badge: {
    position: 'absolute', top: -4, right: -8,
    minWidth: 16, height: 16, borderRadius: 9, padding: 0, paddingHorizontal: 4,
    backgroundColor: C.danger, borderWidth: 1.5, borderColor: '#fff',
    alignItems: 'center', justifyContent: 'center',
  },
  badgeText: { fontSize: 10, fontWeight: '700', color: '#fff' },

  fabWrap: { flex: 1, alignItems: 'center', marginBottom: 0 },
  fab: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: C.primary,
    alignItems: 'center', justifyContent: 'center',
    marginTop: -22,
    borderWidth: 4, borderColor: '#fff',
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 18,
    elevation: 10,
  },
});
