import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, RefreshControl,
  TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuthStore } from '../../store/authStore';
import { getDashboard, getRevenue } from '../../api/dashboard';
import { DashboardData, RevenueReport } from '../../types';
import { C, fcfa } from '../../constants';

type Period = 'week' | 'month';

const AVATAR_COLORS = ['#FDE68A','#FBCFE8','#BFDBFE','#C7F0D9','#FECACA','#DDD6FE','#FED7AA','#A7F3D0'];
function avatarColor(name: string) {
  const idx = ((name.charCodeAt(0) || 0) + (name.charCodeAt(1) || 0)) % AVATAR_COLORS.length;
  return AVATAR_COLORS[idx];
}
function initials(name: string) {
  return name.split(/\s+/).map(s => s[0]).slice(0,2).join('').toUpperCase();
}

const TOP_COLORS = ['#FDE68A','#FECACA','#FBCFE8','#BFDBFE','#C7F0D9'];

export default function DashboardScreen() {
  const navigation = useNavigation<any>();
  const { business, user, currentLocationId } = useAuthStore();
  const [dash, setDash]       = useState<DashboardData | null>(null);
  const [revenue, setRevenue] = useState<RevenueReport | null>(null);
  const [period, setPeriod]   = useState<Period>('week');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [d, r] = await Promise.all([
        getDashboard(currentLocationId ?? undefined),
        getRevenue(period, currentLocationId ?? undefined),
      ]);
      setDash(d);
      setRevenue(r);
    } catch {}
    finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [currentLocationId, period]);

  useEffect(() => { load(); }, [load]);

  const kpis = dash ? [
    { id: 'ca',    label: "Chiffre d'affaires", value: fcfa(dash.sales_today.revenue), sub: "Aujourd'hui", delta: `+${dash.sales_today.count}`, up: true,  tint: C.primarySoft, fg: C.secondary, icon: 'cash-outline' as const },
    { id: 'ventes',label: 'Ventes',              value: String(dash.sales_today.count), sub: 'tickets',     delta: `+${dash.sales_today.count}`, up: true,  tint: C.infoSoft,    fg: C.info,      icon: 'receipt-outline' as const },
    { id: 'dep',   label: 'Dépenses',            value: fcfa(dash.expenses_today.total), sub: "Aujourd'hui", delta: `${dash.expenses_today.count > 0 ? '+' : ''}${dash.expenses_today.count}`, up: false, tint: C.warningSoft, fg: '#B45309', icon: 'card-outline' as const },
    { id: 'stock', label: 'Stock faible',         value: String(dash.low_stock_count), sub: 'produits',     delta: dash.low_stock_count > 0 ? 'alerte' : 'OK', up: dash.low_stock_count === 0, tint: C.dangerSoft, fg: C.danger, icon: 'alert-circle-outline' as const },
  ] : [];

  const chartData = revenue?.data ?? [];
  const chartLabels = revenue?.labels ?? [];
  const chartMax = Math.max(...chartData, 1);
  const chartTotal = chartData.reduce((a, b) => a + b, 0);

  const userName = user?.name ?? 'Commerçant';
  const bizName  = business?.name ?? 'Ma Boutique';

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); load(); }}
            tintColor={C.primary}
            colors={[C.primary]}
          />
        }
      >
        {/* Header */}
        <View style={s.header}>
          <View style={[s.avatar, { backgroundColor: avatarColor(userName) }]}>
            <Text style={s.avatarText}>{initials(userName)}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.greeting}>Bonjour 👋</Text>
            <Text style={s.bizName}>{bizName}</Text>
          </View>
          <TouchableOpacity style={s.iconBtn}>
            <Ionicons name="notifications-outline" size={22} color={C.text2} />
            <View style={s.notifDot} />
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={s.center}>
            <ActivityIndicator size="large" color={C.primary} />
          </View>
        ) : (
          <>
            {/* KPI 2×2 */}
            <View style={s.kpiGrid}>
              {kpis.map((k) => (
                <View key={k.id} style={s.kpiCard}>
                  <View style={s.kpiTop}>
                    <View style={[s.kpiIcon, { backgroundColor: k.tint }]}>
                      <Ionicons name={k.icon} size={18} color={k.fg} />
                    </View>
                    {k.delta !== '' && (
                      <View style={[s.badge, { backgroundColor: k.up ? '#DCFCE7' : '#FEE2E2' }]}>
                        {k.delta !== 'alerte' && k.delta !== 'OK' && (
                          <Ionicons
                            name={k.up ? 'arrow-up' : 'arrow-down'}
                            size={10} color={k.up ? '#15803D' : '#B91C1C'}
                          />
                        )}
                        <Text style={[s.badgeText, { color: k.up ? '#15803D' : '#B91C1C' }]}>
                          {k.delta}
                        </Text>
                      </View>
                    )}
                  </View>
                  <Text style={s.kpiValue} numberOfLines={1}>{k.value}</Text>
                  <Text style={s.kpiLabel}>{k.label}</Text>
                  <Text style={s.kpiSub}>{k.sub}</Text>
                </View>
              ))}
            </View>

            {/* Chart card */}
            <View style={s.card}>
              <View style={s.chartHeader}>
                <View>
                  <Text style={s.chartLabel}>Chiffre d'affaires</Text>
                  <Text style={s.chartTotal}>{fcfa(chartTotal)}</Text>
                </View>
                <View style={s.periodWrap}>
                  {(['week','month'] as Period[]).map(p => (
                    <TouchableOpacity
                      key={p}
                      onPress={() => setPeriod(p)}
                      style={[s.periodBtn, period === p && s.periodBtnOn]}
                    >
                      <Text style={[s.periodText, period === p && s.periodTextOn]}>
                        {p === 'week' ? 'Semaine' : 'Mois'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Bars */}
              <View style={s.barChart}>
                {chartData.map((val, i) => {
                  const h = Math.max((val / chartMax) * 100, 3);
                  const isMax = val === chartMax;
                  return (
                    <View key={i} style={s.barCol}>
                      <View style={s.barTrack}>
                        <View style={[
                          s.bar,
                          { height: `${h}%` as any },
                          isMax ? s.barMax : s.barNorm,
                        ]} />
                      </View>
                      <Text style={[s.barLabel, isMax && { color: C.text, fontWeight: '600' }]}>
                        {chartLabels[i] ?? ''}
                      </Text>
                    </View>
                  );
                })}
              </View>

              {revenue && (
                <View style={s.summaryRow}>
                  <View style={s.summaryItem}>
                    <Text style={s.summaryVal}>{fcfa(revenue.summary.total)}</Text>
                    <Text style={s.summaryLabel}>Total</Text>
                  </View>
                  <View style={s.summaryItem}>
                    <Text style={s.summaryVal}>{fcfa(revenue.summary.average)}</Text>
                    <Text style={s.summaryLabel}>Moyenne</Text>
                  </View>
                  {revenue.summary.variation !== null && (
                    <View style={s.summaryItem}>
                      <Text style={[
                        s.summaryVal,
                        { color: revenue.summary.variation >= 0 ? C.success : C.danger },
                      ]}>
                        {revenue.summary.variation >= 0 ? '+' : ''}{revenue.summary.variation.toFixed(1)}%
                      </Text>
                      <Text style={s.summaryLabel}>vs précédent</Text>
                    </View>
                  )}
                </View>
              )}
            </View>

            {/* Quick actions */}
            <View style={s.quickRow}>
              <QuickAction icon="bag-outline" label="Nouvelle vente" primary onPress={() => navigation.navigate('POS')} />
              <QuickAction icon="cube-outline" label="Ajouter stock" />
              <QuickAction icon="card-outline" label="Dépense" />
            </View>

            {/* Top 5 produits */}
            {dash && dash.top_products.length > 0 && (
              <View style={{ marginTop: 18, marginBottom: 8 }}>
                <View style={s.sectionHeader}>
                  <Text style={s.sectionTitle}>Top 5 produits</Text>
                  <Text style={s.sectionLink}>Voir tout</Text>
                </View>
                <View style={s.card}>
                  {dash.top_products.slice(0,5).map((p, i) => {
                    const maxQty = dash.top_products[0]?.qty_sold ?? 1;
                    return (
                      <View key={p.id} style={[s.productRow, i > 0 && s.productRowBorder]}>
                        <View style={[s.rankBadge, { backgroundColor: TOP_COLORS[i] }]}>
                          <Text style={s.rankText}>{i + 1}</Text>
                        </View>
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <Text style={s.productName} numberOfLines={1}>{p.name}</Text>
                          <View style={s.progressTrack}>
                            <View style={[s.progressBar, { width: `${(p.qty_sold / maxQty) * 100}%` as any }]} />
                          </View>
                        </View>
                        <View style={{ alignItems: 'flex-end' }}>
                          <Text style={s.productQty}>{p.qty_sold}</Text>
                          <Text style={s.productCa}>{fcfa(p.revenue)}</Text>
                        </View>
                      </View>
                    );
                  })}
                </View>
              </View>
            )}
          </>
        )}
        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function QuickAction({ icon, label, primary, onPress }: { icon: any; label: string; primary?: boolean; onPress?: () => void }) {
  return (
    <TouchableOpacity style={[s.quickBtn, primary && s.quickBtnPrimary]} activeOpacity={0.8} onPress={onPress}>
      <Ionicons name={icon} size={22} color={primary ? '#fff' : C.secondary} />
      <Text style={[s.quickLabel, primary && { color: '#fff' }]}>{label}</Text>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: C.bg },
  scroll: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 100 },

  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  avatar: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: 16, fontWeight: '700', color: '#3B3320' },
  greeting: { fontSize: 13, color: C.muted, fontWeight: '500' },
  bizName:  { fontSize: 17, fontWeight: '700', color: C.text, letterSpacing: -0.2 },
  iconBtn: {
    width: 40, height: 40, borderRadius: 12, backgroundColor: '#fff',
    borderWidth: 1, borderColor: C.border,
    alignItems: 'center', justifyContent: 'center',
  },
  notifDot: {
    position: 'absolute', top: 8, right: 8,
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: C.danger, borderWidth: 1.5, borderColor: '#fff',
  },
  center: { paddingVertical: 60, alignItems: 'center' },

  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 14 },
  kpiCard: {
    width: '48%', backgroundColor: '#fff', borderRadius: 16, padding: 14,
    borderWidth: 1, borderColor: C.border,
  },
  kpiTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  kpiIcon: { width: 32, height: 32, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 2, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 8 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  kpiValue: { fontSize: 18, fontWeight: '700', color: C.text, letterSpacing: -0.5 },
  kpiLabel: { fontSize: 11.5, color: C.muted, marginTop: 2, fontWeight: '500' },
  kpiSub:   { fontSize: 11, color: '#9CA3AF', marginTop: 1 },

  card: {
    backgroundColor: '#fff', borderRadius: 18, padding: 16,
    borderWidth: 1, borderColor: C.border,
  },
  chartHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 },
  chartLabel:  { fontSize: 13, color: C.muted, fontWeight: '500' },
  chartTotal:  { fontSize: 22, fontWeight: '800', color: C.text, letterSpacing: -0.6, marginTop: 2 },
  periodWrap:  { flexDirection: 'row', backgroundColor: C.borderL, borderRadius: 10, padding: 3, gap: 2 },
  periodBtn:   { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  periodBtnOn: { backgroundColor: '#fff', shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 2, elevation: 1 },
  periodText:  { fontSize: 12, fontWeight: '600', color: C.muted },
  periodTextOn:{ color: C.text },

  barChart: { flexDirection: 'row', alignItems: 'flex-end', height: 120, gap: 6, marginBottom: 4 },
  barCol:   { flex: 1, alignItems: 'center' },
  barTrack: { flex: 1, width: '100%', justifyContent: 'flex-end' },
  bar:      { width: '100%', borderRadius: 5 },
  barMax:   { backgroundColor: C.primary },
  barNorm:  { backgroundColor: '#E5F8EC' },
  barLabel: { fontSize: 11, color: C.muted, fontWeight: '500', marginTop: 5 },

  summaryRow:   { flexDirection: 'row', justifyContent: 'space-around', paddingTop: 14, borderTopWidth: 1, borderTopColor: C.borderL, marginTop: 10 },
  summaryItem:  { alignItems: 'center' },
  summaryVal:   { fontSize: 14, fontWeight: '700', color: C.text },
  summaryLabel: { fontSize: 11, color: C.muted, marginTop: 2 },

  quickRow: { flexDirection: 'row', gap: 8, marginTop: 14 },
  quickBtn: {
    flex: 1, height: 70, borderRadius: 14, backgroundColor: '#fff',
    borderWidth: 1, borderColor: C.border,
    alignItems: 'center', justifyContent: 'center', gap: 5,
  },
  quickBtnPrimary: {
    backgroundColor: C.primary, borderWidth: 0,
    shadowColor: C.primary, shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3, shadowRadius: 14, elevation: 6,
  },
  quickLabel: { fontSize: 11.5, fontWeight: '600', color: C.text, letterSpacing: 0.1, textAlign: 'center' },

  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 },
  sectionTitle:  { fontSize: 15, fontWeight: '700', color: C.text },
  sectionLink:   { fontSize: 12, color: C.secondary, fontWeight: '600' },

  productRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  productRowBorder: { borderTopWidth: 1, borderTopColor: C.borderL },
  rankBadge: { width: 36, height: 36, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  rankText:  { fontSize: 13, fontWeight: '700', color: C.text },
  productName: { fontSize: 14, fontWeight: '600', color: C.text, marginBottom: 6 },
  progressTrack: { height: 4, backgroundColor: C.borderL, borderRadius: 2 },
  progressBar:   { height: 4, backgroundColor: C.primary, borderRadius: 2 },
  productQty: { fontSize: 13.5, fontWeight: '700', color: C.text },
  productCa:  { fontSize: 11, color: C.muted, fontWeight: '500' },
});
