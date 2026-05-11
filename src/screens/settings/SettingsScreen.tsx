import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Alert,
  ActivityIndicator, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../store/authStore';
import { COLORS, SPACING } from '../../constants';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

function MenuItem({ icon, label, value, onPress, danger }: {
  icon: IoniconsName; label: string; value?: string;
  onPress?: () => void; danger?: boolean;
}) {
  return (
    <TouchableOpacity
      style={styles.menuItem}
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.menuIcon, { backgroundColor: (danger ? COLORS.danger : COLORS.primary) + '15' }]}>
        <Ionicons name={icon} size={18} color={danger ? COLORS.danger : COLORS.primary} />
      </View>
      <Text style={[styles.menuLabel, danger && { color: COLORS.danger }]}>{label}</Text>
      {value && <Text style={styles.menuValue}>{value}</Text>}
      {onPress && !danger && <Ionicons name="chevron-forward" size={16} color={COLORS.textLight} />}
    </TouchableOpacity>
  );
}

export default function SettingsScreen() {
  const { user, business, locations, currentLocationId, setLocation, logout } = useAuthStore();
  const [loggingOut, setLoggingOut] = useState(false);

  const currentLocation = locations.find(l => l.id === currentLocationId);

  const handleLogout = () => {
    Alert.alert(
      'Déconnexion',
      'Voulez-vous vraiment vous déconnecter ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Déconnecter', style: 'destructive',
          onPress: async () => {
            setLoggingOut(true);
            try { await logout(); } catch { setLoggingOut(false); }
          }
        }
      ]
    );
  };

  const handleChangeLocation = () => {
    if (locations.length <= 1) return;
    const options = locations.map(l => ({
      text: l.name,
      onPress: () => setLocation(l.id),
    }));
    Alert.alert('Choisir un point de vente', '', [
      ...options,
      { text: 'Annuler', style: 'cancel' as const },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.topBar}>
        <Text style={styles.screenTitle}>Paramètres</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Profile */}
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{user?.name?.charAt(0).toUpperCase()}</Text>
          </View>
          <View>
            <Text style={styles.profileName}>{user?.name}</Text>
            <Text style={styles.profileEmail}>{user?.email}</Text>
          </View>
        </View>

        {/* Business */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Entreprise</Text>
          <View style={styles.card}>
            <MenuItem icon="business" label="Nom" value={business?.name} />
            <MenuItem icon="cash" label="Devise" value={business?.currency} />
            <MenuItem
              icon="location"
              label="Point de vente"
              value={currentLocation?.name ?? '—'}
              onPress={locations.length > 1 ? handleChangeLocation : undefined}
            />
          </View>
        </View>

        {/* App info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Application</Text>
          <View style={styles.card}>
            <MenuItem icon="information-circle" label="Version" value="1.0.0" />
            <MenuItem icon="globe" label="API" value="yoriinapp.com" />
          </View>
        </View>

        {/* Logout */}
        <View style={styles.section}>
          <View style={styles.card}>
            <TouchableOpacity style={styles.menuItem} onPress={handleLogout} disabled={loggingOut}>
              <View style={[styles.menuIcon, { backgroundColor: COLORS.danger + '15' }]}>
                {loggingOut
                  ? <ActivityIndicator size="small" color={COLORS.danger} />
                  : <Ionicons name="log-out" size={18} color={COLORS.danger} />
                }
              </View>
              <Text style={[styles.menuLabel, { color: COLORS.danger }]}>Déconnexion</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:        { flex: 1, backgroundColor: COLORS.background },
  topBar:      { paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: COLORS.gray200 },
  screenTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  scroll:      { padding: SPACING.md, gap: SPACING.md },
  profileCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: SPACING.lg,
    flexDirection: 'row', alignItems: 'center', gap: SPACING.md,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  avatar:      { width: 54, height: 54, borderRadius: 27, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center' },
  avatarText:  { color: '#fff', fontSize: 24, fontWeight: '700' },
  profileName: { fontSize: 17, fontWeight: '700', color: COLORS.text },
  profileEmail:{ fontSize: 13, color: COLORS.textLight, marginTop: 2 },
  section:     { gap: SPACING.xs },
  sectionTitle:{ fontSize: 12, fontWeight: '700', color: COLORS.textLight, textTransform: 'uppercase', letterSpacing: 1, paddingHorizontal: 4 },
  card:        { backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 2 },
  menuItem:    { flexDirection: 'row', alignItems: 'center', padding: SPACING.md, borderBottomWidth: 1, borderBottomColor: COLORS.gray100, gap: 12 },
  menuIcon:    { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  menuLabel:   { flex: 1, fontSize: 14, color: COLORS.text, fontWeight: '500' },
  menuValue:   { fontSize: 13, color: COLORS.textLight, marginRight: 4 },
});
