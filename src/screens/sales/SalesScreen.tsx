import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SalesStackParamList } from '../../navigation/SalesNavigator';
import client from '../../api/client';
import { ApiResponse, Sale } from '../../types';
import { useAuthStore } from '../../store/authStore';
import { C, fcfa } from '../../constants';

type Props = NativeStackScreenProps<SalesStackParamList, 'SalesList'>;

const RANGES = [
  { label: "Aujourd'hui", api: 'today'     },
  { label: 'Hier',        api: 'yesterday' },
  { label: 'Semaine',     api: 'week'      },
  { label: 'Mois',        api: 'month'     },
  { label: 'Tout',        api: 'all'       },
] as const;
type RangeApi = typeof RANGES[number]['api'];

const FILTERS = [
  { id: 'all',    label: 'Toutes' },
  { id: 'paid',   label: 'Payées',      dot: C.success },
  { id: 'due',    label: 'Crédit',      dot: C.warning },
  { id: 'refund', label: 'Remboursées', dot: C.danger },
] as const;

// Méthodes de paiement connues (retournées par l'API /sales/{id})
const PAY_INFO: Record<string, { label: string; fg: string; bg: string }> = {
  cash:         { label: 'Espèces',      fg: '#374151', bg: '#F3F4F6' },
  wave:         { label: 'Wave',         fg: '#1E40AF', bg: '#DBEAFE' },
  orange_money: { label: 'Orange Money', fg: '#B45309', bg: '#FEF3C7' },
  card:         { label: 'Carte',        fg: '#9333EA', bg: '#F3E8FF' },
  credit:       { label: 'Crédit',       fg: '#9333EA', bg: '#F3E8FF' },
};

// UltimatePOS payment_status values: paid | due | partial | refund
const STATUS_INFO: Record<string, { icon: any; fg: string; bg: string; label: string }> = {
  paid:    { icon: 'checkmark',    fg: '#15803D', bg: '#DCFCE7', label: 'Payé' },
  partial: { icon: 'alert-circle', fg: '#B45309', bg: '#FEF3C7', label: 'Partiel' },
  due:     { icon: 'alert-circle', fg: '#B45309', bg: '#FEF3C7', label: 'À recouvrer' },
  refund:  { icon: 'close',        fg: '#B91C1C', bg: '#FEE2E2', label: 'Remboursé' },
  // aliases legacy
  final:   { icon: 'checkmark',    fg: '#15803D', bg: '#DCFCE7', label: 'Payé' },
  credit:  { icon: 'alert-circle', fg: '#B45309', bg: '#FEF3C7', label: 'À recouvrer' },
};

function saleTime(dateStr: string) {
  try {
    return new Date(dateStr).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  } catch { return ''; }
}

export default function SalesScreen({ navigation }: Props) {
  const { currentLocationId } = useAuthStore();
  const [sales, setSales]     = useState<Sale[]>([]);
  const [range, setRange]     = useState<RangeApi>('today');
  const [filter, setFilter]   = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const params: any = { page: 1, range };
      if (currentLocationId) params.location_id = currentLocationId;
      const { data } = await client.get<ApiResponse<{ sales: Sale[]; total: number }>>('/sales', { params });
      setSales(data.data.sales ?? []);
    } catch (e: any) {
      setError(e?.response?.data?.message ?? e?.message ?? 'Erreur de chargement');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [currentLocationId, range]);

  useEffect(() => { load(); }, [load]);

  const total    = sales.filter(s => s.payment_status !== 'refund').reduce((a, b) => a + b.total, 0);
  const filtered = filter === 'all' ? sales : sales.filter(s => s.payment_status === filter);

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      {/* Header */}
      <View style={s.header}>
        <View>
          <Text style={s.title}>Ventes</Text>
          <Text style={s.subtitle}>{sales.length} tickets · {fcfa(total)}</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity style={s.iconBtn}>
            <Ionicons name="funnel-outline" size={20} color={C.text2} />
          </TouchableOpacity>
          <TouchableOpacity style={s.iconBtn}>
            <Ionicons name="print-outline" size={20} color={C.text2} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Range pills */}
      <FlatList
        data={RANGES as any}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.rangeScroll}
        keyExtractor={(item: any) => item.api}
        renderItem={({ item }: any) => {
          const on = range === item.api;
          return (
            <TouchableOpacity style={[s.pill, on && s.pillOn]} onPress={() => { setRange(item.api); setLoading(true); }}>
              <Text style={[s.pillText, on && s.pillTextOn]}>{item.label}</Text>
            </TouchableOpacity>
          );
        }}
      />

      {/* Status filters */}
      <View style={s.filterRow}>
        {FILTERS.map(f => {
          const on = filter === f.id;
          return (
            <TouchableOpacity key={f.id} style={[s.filterBtn, on && s.filterBtnOn]} onPress={() => setFilter(f.id)}>
              {'dot' in f && <View style={[s.filterDot, { backgroundColor: f.dot }]} />}
              <Text style={[s.filterText, on && s.filterTextOn]}>{f.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Day total banner — gradient vert */}
      <View style={s.bannerWrap}>
        <LinearGradient
          colors={['#128C7E', '#1FB855']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={s.banner}
        >
          <View style={s.bannerIcon}>
            <Ionicons name="cash-outline" size={20} color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.bannerLabel}>Encaissé aujourd'hui</Text>
            <Text style={s.bannerValue}>{fcfa(total)}</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#fff" />
        </LinearGradient>
      </View>

      {/* Date section label */}
      <View style={s.sectionWrap}>
        <Text style={s.sectionLabel}>
          AUJOURD'HUI · {new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' }).toUpperCase()}
        </Text>
      </View>

      {error && (
        <View style={s.errorWrap}>
          <Ionicons name="alert-circle-outline" size={16} color={C.danger} />
          <Text style={s.errorText}>{error}</Text>
        </View>
      )}

      {loading ? (
        <View style={s.center}><ActivityIndicator size="large" color={C.primary} /></View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={item => String(item.id)}
          contentContainerStyle={s.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); load(); }}
              tintColor={C.primary} colors={[C.primary]}
            />
          }
          ListEmptyComponent={
            <View style={s.empty}><Text style={s.emptyText}>Aucune vente pour cette période</Text></View>
          }
          renderItem={({ item, index }) => {
            const pay = PAY_INFO[item.payment_status] ?? PAY_INFO.cash;
            const si  = STATUS_INFO[item.payment_status] ?? STATUS_INFO.final;
            const isRefund = item.payment_status === 'refund';
            return (
              <TouchableOpacity
                style={[s.saleRow, index > 0 && s.saleRowBorder]}
                onPress={() => navigation.navigate('SaleDetail', { saleId: item.id })}
                activeOpacity={0.7}
              >
                {/* Status icon */}
                <View style={[s.statusIcon, { backgroundColor: si.bg }]}>
                  <Ionicons name={si.icon} size={18} color={si.fg} strokeWidth={2.4} />
                </View>

                {/* Info */}
                <View style={{ flex: 1, minWidth: 0 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
                    <Text style={s.clientName} numberOfLines={1}>
                      {item.customer?.name ?? 'Passage'}
                    </Text>
                    <Text style={s.invoiceNo}>{item.invoice_no}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 3 }}>
                    <View style={[s.payBadge, { backgroundColor: pay.bg }]}>
                      <Text style={[s.payText, { color: pay.fg }]}>{pay.label}</Text>
                    </View>
                    <Text style={s.metaText}>
                      {saleTime(item.date)}
                    </Text>
                  </View>
                </View>

                {/* Amount */}
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={[
                    s.amount,
                    isRefund && { color: C.danger, textDecorationLine: 'line-through' },
                  ]}>
                    {fcfa(item.total)}
                  </Text>
                  <Text style={[s.statusLabel, { color: si.fg }]}>{si.label}</Text>
                </View>

                <Ionicons name="chevron-forward" size={16} color={C.border} />
              </TouchableOpacity>
            );
          }}
          ListFooterComponent={
            filtered.length > 0 ? (
              <TouchableOpacity style={s.loadMore}>
                <Ionicons name="chevron-down" size={16} color={C.muted} />
                <Text style={s.loadMoreText}>Charger plus</Text>
              </TouchableOpacity>
            ) : null
          }
        />
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },

  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12,
  },
  title:    { fontSize: 22, fontWeight: '800', color: C.text, letterSpacing: -0.5, flex: 1 },
  subtitle: { fontSize: 12.5, color: C.muted, marginTop: 1 },
  iconBtn: {
    width: 38, height: 38, borderRadius: 10, backgroundColor: '#fff',
    borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center',
  },

  rangeScroll: { gap: 6, paddingHorizontal: 16, paddingBottom: 10 },
  pill:       { height: 32, paddingHorizontal: 14, borderRadius: 9, backgroundColor: '#fff', borderWidth: 1, borderColor: C.border, justifyContent: 'center' },
  pillOn:     { backgroundColor: C.primary, borderWidth: 0 },
  pillText:   { fontSize: 12.5, fontWeight: '600', color: C.text2 },
  pillTextOn: { color: '#fff' },

  filterRow: { flexDirection: 'row', gap: 6, paddingHorizontal: 16, marginBottom: 12 },
  filterBtn: {
    height: 28, paddingHorizontal: 10, borderRadius: 7,
    borderWidth: 1, borderColor: C.border,
    flexDirection: 'row', alignItems: 'center', gap: 5,
  },
  filterBtnOn:  { backgroundColor: C.text, borderColor: C.text },
  filterDot:    { width: 6, height: 6, borderRadius: 3 },
  filterText:   { fontSize: 11.5, fontWeight: '600', color: C.muted },
  filterTextOn: { color: '#fff' },

  bannerWrap: { paddingHorizontal: 16, marginBottom: 12 },
  banner: {
    borderRadius: 14, padding: 12, paddingHorizontal: 14,
    flexDirection: 'row', alignItems: 'center', gap: 14,
  },
  bannerIcon: {
    width: 38, height: 38, borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center', justifyContent: 'center',
  },
  bannerLabel: { fontSize: 12, color: 'rgba(255,255,255,0.85)', fontWeight: '500' },
  bannerValue: { fontSize: 22, fontWeight: '800', color: '#fff', letterSpacing: -0.5, lineHeight: 26 },

  sectionWrap: { paddingHorizontal: 20, marginBottom: 8 },
  sectionLabel: { fontSize: 11.5, color: C.muted, fontWeight: '700', letterSpacing: 0.6 },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  errorWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginHorizontal: 16, marginBottom: 8,
    backgroundColor: C.dangerSoft, borderRadius: 10, padding: 10,
  },
  errorText: { fontSize: 13, color: C.danger, flex: 1 },
  list:   {
    marginHorizontal: 16, backgroundColor: '#fff',
    borderRadius: 14, borderWidth: 1, borderColor: C.border,
    overflow: 'hidden', paddingBottom: 100,
  },
  empty:     { paddingVertical: 48, alignItems: 'center' },
  emptyText: { fontSize: 14, color: C.muted },

  saleRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  saleRowBorder: { borderTopWidth: 1, borderTopColor: C.borderL },

  statusIcon: {
    width: 38, height: 38, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  clientName: { fontSize: 14, fontWeight: '700', color: C.text },
  invoiceNo:  { fontSize: 11, color: C.muted, fontFamily: 'Courier' },
  payBadge:   { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5 },
  payText:    { fontSize: 10.5, fontWeight: '600' },
  metaText:   { fontSize: 12, color: C.muted, fontWeight: '500' },
  amount:     { fontSize: 14.5, fontWeight: '700', color: C.text, letterSpacing: -0.2 },
  statusLabel:{ fontSize: 10.5, fontWeight: '600', marginTop: 1 },

  loadMore: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, padding: 20,
  },
  loadMoreText: { fontSize: 13, fontWeight: '600', color: C.text2 },
});
