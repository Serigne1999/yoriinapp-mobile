import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import client from '../../api/client';
import { ApiResponse, Sale } from '../../types';
import { useAuthStore } from '../../store/authStore';
import { C, fcfa } from '../../constants';

const RANGES = ["Aujourd'hui", 'Hier', 'Semaine', 'Mois'] as const;
const FILTERS = [
  { id: 'all',    label: 'Toutes' },
  { id: 'final',  label: 'Payées',  dot: C.success },
  { id: 'credit', label: 'Crédit',  dot: C.warning },
] as const;

const PAY_INFO: Record<string, { label: string; fg: string; bg: string }> = {
  cash:   { label: 'Espèces',      fg: '#374151', bg: '#F3F4F6' },
  wave:   { label: 'Wave',         fg: '#1E40AF', bg: '#DBEAFE' },
  orange: { label: 'Orange Money', fg: '#B45309', bg: '#FEF3C7' },
  credit: { label: 'Crédit',       fg: '#9333EA', bg: '#F3E8FF' },
};

export default function SalesScreen() {
  const { currentLocationId } = useAuthStore();
  const [sales, setSales]     = useState<Sale[]>([]);
  const [range, setRange]     = useState<string>("Aujourd'hui");
  const [filter, setFilter]   = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const params: any = { page: 1 };
      if (currentLocationId) params.location_id = currentLocationId;
      const { data } = await client.get<ApiResponse<{ data: Sale[] }>>('/sales', { params });
      setSales(data.data.data ?? []);
    } catch {}
    finally { setLoading(false); setRefreshing(false); }
  }, [currentLocationId]);

  useEffect(() => { load(); }, [load]);

  const total = sales.reduce((s, x) => s + x.total, 0);
  const filtered = filter === 'all' ? sales : sales.filter(s => s.payment_status === filter);

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.header}>
        <View style={{ flex: 1 }}>
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
        contentContainerStyle={{ gap: 6, paddingHorizontal: 16, paddingBottom: 10 }}
        keyExtractor={item => item}
        renderItem={({ item }) => {
          const on = range === item;
          return (
            <TouchableOpacity style={[s.pill, on && s.pillOn]} onPress={() => setRange(item)}>
              <Text style={[s.pillText, on && s.pillTextOn]}>{item}</Text>
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

      {/* Day total banner */}
      <View style={s.bannerWrap}>
        <View style={s.banner}>
          <View style={s.bannerIcon}>
            <Ionicons name="bar-chart-outline" size={20} color="#fff" />
          </View>
          <View>
            <Text style={s.bannerLabel}>Encaissement du jour</Text>
            <Text style={s.bannerValue}>{fcfa(total)}</Text>
          </View>
          <View style={{ flex: 1 }} />
          <Text style={s.bannerCount}>{filtered.length} tickets</Text>
        </View>
      </View>

      {loading ? (
        <View style={s.center}><ActivityIndicator size="large" color={C.primary} /></View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={item => String(item.id)}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); load(); }}
              tintColor={C.primary} colors={[C.primary]}
            />
          }
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
          ListEmptyComponent={
            <View style={s.empty}><Text style={s.emptyText}>Aucune vente pour cette période</Text></View>
          }
          renderItem={({ item }) => {
            const pay = PAY_INFO[item.payment_status] ?? PAY_INFO.cash;
            return (
              <TouchableOpacity style={s.saleCard} activeOpacity={0.85}>
                <View style={s.saleLeft}>
                  <Ionicons name="receipt-outline" size={20} color={C.secondary} />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={s.saleInvoice}>{item.invoice_no}</Text>
                    <Text style={s.saleAmount}>{fcfa(item.total)}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
                    <Text style={s.saleClient} numberOfLines={1}>{item.customer?.name ?? 'Passage'}</Text>
                    <View style={[s.payBadge, { backgroundColor: pay.bg }]}>
                      <Text style={[s.payText, { color: pay.fg }]}>{pay.label}</Text>
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12 },
  title:    { fontSize: 22, fontWeight: '800', color: C.text, letterSpacing: -0.5 },
  subtitle: { fontSize: 12.5, color: C.muted, marginTop: 1 },
  iconBtn: {
    width: 36, height: 36, borderRadius: 10, backgroundColor: '#fff',
    borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center',
  },
  pill:       { height: 32, paddingHorizontal: 14, borderRadius: 9, backgroundColor: '#fff', borderWidth: 1, borderColor: C.border, justifyContent: 'center' },
  pillOn:     { backgroundColor: C.primary, borderWidth: 0 },
  pillText:   { fontSize: 12.5, fontWeight: '600', color: C.text2 },
  pillTextOn: { color: '#fff' },
  filterRow: { flexDirection: 'row', gap: 6, paddingHorizontal: 16, marginBottom: 12 },
  filterBtn:    { height: 28, paddingHorizontal: 10, borderRadius: 7, borderWidth: 1, borderColor: C.border, flexDirection: 'row', alignItems: 'center', gap: 5 },
  filterBtnOn:  { backgroundColor: C.text, borderColor: C.text },
  filterDot:    { width: 6, height: 6, borderRadius: 3 },
  filterText:   { fontSize: 11.5, fontWeight: '600', color: C.muted },
  filterTextOn: { color: '#fff' },
  bannerWrap: { paddingHorizontal: 16, marginBottom: 12 },
  banner:     { borderRadius: 14, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: C.secondary },
  bannerIcon: { width: 38, height: 38, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  bannerLabel: { fontSize: 12, color: 'rgba(255,255,255,0.8)', fontWeight: '500' },
  bannerValue: { fontSize: 18, fontWeight: '800', color: '#fff', marginTop: 2, letterSpacing: -0.4 },
  bannerCount: { fontSize: 13, color: 'rgba(255,255,255,0.8)', fontWeight: '600' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  saleCard: { backgroundColor: '#fff', borderRadius: 14, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: C.border },
  saleLeft: { width: 40, height: 40, borderRadius: 10, backgroundColor: C.primarySoft, alignItems: 'center', justifyContent: 'center' },
  saleInvoice: { fontSize: 13.5, fontWeight: '700', color: C.text },
  saleAmount:  { fontSize: 14, fontWeight: '800', color: C.text },
  saleClient:  { fontSize: 12.5, color: C.muted, flex: 1 },
  payBadge:    { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 7 },
  payText:     { fontSize: 11.5, fontWeight: '600' },
  empty:     { paddingVertical: 48, alignItems: 'center' },
  emptyText: { fontSize: 14, color: C.muted },
});
