import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Alert,
  ActivityIndicator, ScrollView, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../store/authStore';
import { C } from '../../constants';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

const { width } = Dimensions.get('window');
const COLS      = 4;
const CARD_SIZE = (width - 32 - (COLS - 1) * 10) / COLS;

interface MenuCard {
  icon:    IoniconsName;
  label:   string;
  color:   string;
  screen?: string;
  soon?:   boolean;
}

const MENUS: MenuCard[] = [
  { icon: 'cash-outline',           label: 'Dépenses',     color: '#EF4444', soon: true },
  { icon: 'cube-outline',           label: 'Stock',        color: '#8B5CF6', soon: true },
  { icon: 'people-outline',         label: 'Clients',      color: '#06B6D4', soon: true },
  { icon: 'cart-outline',           label: 'Achats',       color: '#F59E0B', soon: true },
  { icon: 'swap-horizontal-outline',label: 'Transferts',   color: '#10B981', soon: true },
  { icon: 'stats-chart-outline',    label: 'Rapports',     color: '#3B82F6', soon: true },
  { icon: 'construct-outline',      label: 'Ajustements',  color: '#EC4899', soon: true },
  { icon: 'receipt-outline',        label: 'Factures',     color: '#6366F1', soon: true },
  { icon: 'megaphone-outline',      label: 'Promotions',   color: '#F97316', soon: true },
  { icon: 'people-circle-outline',  label: 'Utilisateurs', color: '#14B8A6', soon: true },
  { icon: 'bar-chart-outline',      label: 'Analytique',   color: '#A855F7', soon: true },
  { icon: 'settings-outline',       label: 'Paramètres',   color: '#64748B', soon: true },
];

function Card({ item, onPress }: { item: MenuCard; onPress: () => void }) {
  return (
    <TouchableOpacity style={[s.card, { width: CARD_SIZE, height: CARD_SIZE + 20 }]}
      onPress={onPress} activeOpacity={0.75}>
      <View style={[s.cardIcon, { backgroundColor: item.color + '18' }]}>
        <Ionicons name={item.icon} size={24} color={item.color} />
        {item.soon && (
          <View style={s.soonDot} />
        )}
      </View>
      <Text style={s.cardLabel} numberOfLines={1}>{item.label}</Text>
    </TouchableOpacity>
  );
}

export default function SettingsScreen() {
  const { user, business, locations, currentLocationId, setLocation, logout } = useAuthStore();
  const [loggingOut, setLoggingOut] = useState(false);

  const currentLocation = locations.find(l => l.id === currentLocationId);

  const handleLogout = () => {
    Alert.alert('Déconnexion', 'Voulez-vous vraiment vous déconnecter ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Déconnecter', style: 'destructive',
        onPress: async () => {
          setLoggingOut(true);
          try { await logout(); } catch { setLoggingOut(false); }
        },
      },
    ]);
  };

  const handleChangeLocation = () => {
    if (locations.length <= 1) return;
    Alert.alert('Choisir un point de vente', '', [
      ...locations.map(l => ({ text: l.name, onPress: () => setLocation(l.id) })),
      { text: 'Annuler', style: 'cancel' as const },
    ]);
  };

  const handleCard = (item: MenuCard) => {
    if (item.soon) {
      Alert.alert('Bientôt disponible', `La section "${item.label}" arrive prochainement.`);
      return;
    }
    // navigation future
  };

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.topBar}>
        <Text style={s.title}>Plus</Text>
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* Profil */}
        <View style={s.profileCard}>
          <View style={s.avatar}>
            <Text style={s.avatarText}>{user?.name?.charAt(0).toUpperCase()}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.profileName}>{user?.name}</Text>
            <Text style={s.profileSub}>{business?.name}</Text>
          </View>
          {locations.length > 1 && (
            <TouchableOpacity style={s.locationPill} onPress={handleChangeLocation}>
              <Ionicons name="location-outline" size={13} color={C.primary} />
              <Text style={s.locationText} numberOfLines={1}>{currentLocation?.name ?? '—'}</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Grille de menus */}
        <View style={s.grid}>
          {MENUS.map((item) => (
            <Card key={item.label} item={item} onPress={() => handleCard(item)} />
          ))}
        </View>

        {/* Déconnexion */}
        <TouchableOpacity style={s.logoutBtn} onPress={handleLogout} disabled={loggingOut} activeOpacity={0.8}>
          {loggingOut
            ? <ActivityIndicator size="small" color="#fff" />
            : <Ionicons name="log-out-outline" size={18} color="#fff" />
          }
          <Text style={s.logoutText}>Déconnexion</Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:         { flex: 1, backgroundColor: '#F1F5F9' },
  topBar:       { paddingHorizontal: 16, paddingVertical: 14, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  title:        { fontSize: 18, fontWeight: '700', color: '#0F172A' },
  scroll:       { padding: 16, gap: 16, paddingBottom: 32 },

  profileCard:  {
    backgroundColor: '#fff', borderRadius: 18, padding: 16,
    flexDirection: 'row', alignItems: 'center', gap: 14,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 10, elevation: 3,
  },
  avatar:       { width: 52, height: 52, borderRadius: 26, backgroundColor: C.primary, justifyContent: 'center', alignItems: 'center' },
  avatarText:   { color: '#fff', fontSize: 22, fontWeight: '700' },
  profileName:  { fontSize: 16, fontWeight: '700', color: '#0F172A' },
  profileSub:   { fontSize: 12, color: '#64748B', marginTop: 2 },
  locationPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: C.primary + '12', borderRadius: 20,
    paddingHorizontal: 10, paddingVertical: 6, maxWidth: 110,
  },
  locationText: { fontSize: 11, color: C.primary, fontWeight: '600', flexShrink: 1 },

  grid:         { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  card:         {
    backgroundColor: '#fff', borderRadius: 14,
    alignItems: 'center', justifyContent: 'center', gap: 8,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 2,
  },
  cardIcon:     { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  cardLabel:    { fontSize: 11, fontWeight: '600', color: '#334155', textAlign: 'center', paddingHorizontal: 4 },
  soonDot:      { position: 'absolute', top: 0, right: 0, width: 8, height: 8, borderRadius: 4, backgroundColor: '#F59E0B', borderWidth: 1.5, borderColor: '#fff' },

  logoutBtn:    {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#EF4444', borderRadius: 14, paddingVertical: 14,
    shadowColor: '#EF4444', shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  logoutText:   { color: '#fff', fontSize: 15, fontWeight: '700' },
});
