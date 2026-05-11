import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, RefreshControl,
  TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../store/authStore';
import { getDashboard, getRevenue } from '../../api/dashboard';
import { DashboardData, RevenueReport } from '../../types';
import { COLORS, SPACING } from '../../constants';

type Period = 'week' | 'month' | 'year';

function StatCard({ label, value, sub, icon, color }: {
  label: string; value: string; sub?: string;
  icon: React.ComponentProps<typeof Ionicons>['name']; color: string;
}) {
  return (
    <View style={[styles.card, styles.statCard]}>
      <View style={[styles.iconBox, { backgroundColor: color + '20' }]}>
        <Ionicons name={icon} size={22} color={color} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
      {sub && <Text style={styles.statSub}>{sub}</Text>}
    </View>
  );
}

function RevenueBar({ labels, data }: { labels: string[]; data: number[] }) {
  const max = Math.max(...data, 1);
  return (
    <View style={styles.barChart}>
      {data.map((val, i) => (
        <View key={i} style={styles.barCol}>
          <View style={[styles.bar, { height: Math.max((val / max) * 100, 2) }]} />
          <Text style={styles.barLabel}>{labels[i]}</Text>
        </View>
      ))}
    </View>
  );
}

function fmt(n: number, currency = 'FCFA') {
  return new Intl.NumberFormat('fr-FR').format(n) + ' ' + currency;
}

export default function DashboardScreen() {
  const { business, currentLocationId, user } = useAuthStore();
  const [dash, setDash]       = useState<DashboardData | null>(null);
  const [revenue, setRevenue] = useState<RevenueReport | null>(null);
  const [period, setPeriod]   = useState<Period>('month');
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
    } catch (e) {
      // silently ignore, stale data stays
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [currentLocationId, period]);

  useEffect(() => { load(); }, [load]);

  const onRefresh = () => { setRefreshing(true); load(); };

  const currency = business?.currency ?? 'FCFA';

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.topBar}>
        <View>
          <Text style={styles.greeting}>Bonjour, {user?.name?.split(' ')[0]} 👋</Text>
          <Text style={styles.bizName}>{business?.name}</Text>
        </View>
        <TouchableOpacity onPress={onRefresh}>
          <Ionicons name="refresh" size={22} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scroll}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
        >
          {/* KPI Cards */}
          <View style={styles.row}>
            <StatCard
              label="Ventes aujourd'hui"
              value={fmt(dash?.sales_today.revenue ?? 0, currency)}
              sub={`${dash?.sales_today.count ?? 0} transaction(s)`}
              icon="trending-up"
              color={COLORS.success}
            />
            <StatCard
              label="Dépenses"
              value={fmt(dash?.expenses_today.total ?? 0, currency)}
              sub={`${dash?.expenses_today.count ?? 0} dépense(s)`}
              icon="trending-down"
              color={COLORS.danger}
            />
          </View>

          <StatCard
            label="Stock faible"
            value={`${dash?.low_stock_count ?? 0} produit(s)`}
            icon="alert-circle"
            color={COLORS.warning}
          />

          {/* Revenue chart */}
          <View style={styles.card}>
            <View style={styles.chartHeader}>
              <Text style={styles.sectionTitle}>Chiffre d'affaires</Text>
              <View style={styles.periodRow}>
                {(['week', 'month', 'year'] as Period[]).map(p => (
                  <TouchableOpacity
                    key={p}
                    style={[styles.periodBtn, period === p && styles.periodBtnActive]}
                    onPress={() => setPeriod(p)}
                  >
                    <Text style={[styles.periodText, period === p && styles.periodTextActive]}>
                      {p === 'week' ? 'Sem.' : p === 'month' ? 'Mois' : 'Année'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {revenue && revenue.data.length > 0 ? (
              <>
                <RevenueBar labels={revenue.labels} data={revenue.data} />
                <View style={styles.summaryRow}>
                  <View style={styles.summaryItem}>
                    <Text style={styles.summaryVal}>{fmt(revenue.summary.total, currency)}</Text>
                    <Text style={styles.summaryLabel}>Total</Text>
                  </View>
                  <View style={styles.summaryItem}>
                    <Text style={styles.summaryVal}>{fmt(revenue.summary.average, currency)}</Text>
                    <Text style={styles.summaryLabel}>Moyenne</Text>
                  </View>
                  {revenue.summary.variation !== null && (
                    <View style={styles.summaryItem}>
                      <Text style={[
                        styles.summaryVal,
                        { color: revenue.summary.variation >= 0 ? COLORS.success : COLORS.danger }
                      ]}>
                        {revenue.summary.variation >= 0 ? '+' : ''}{revenue.summary.variation.toFixed(1)}%
                      </Text>
                      <Text style={styles.summaryLabel}>vs précédent</Text>
                    </View>
                  )}
                </View>
              </>
            ) : (
              <Text style={styles.emptyText}>Aucune donnée pour cette période</Text>
            )}
          </View>

          {/* Top produits */}
          {dash && dash.top_products.length > 0 && (
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Top produits</Text>
              {dash.top_products.slice(0, 5).map((p, i) => (
                <View key={p.id} style={styles.productRow}>
                  <View style={[styles.rank, { backgroundColor: i === 0 ? COLORS.warning : COLORS.gray100 }]}>
                    <Text style={[styles.rankText, { color: i === 0 ? '#fff' : COLORS.textLight }]}>
                      {i + 1}
                    </Text>
                  </View>
                  <Text style={styles.productName} numberOfLines={1}>{p.name}</Text>
                  <Text style={styles.productStat}>{p.qty_sold} vendus</Text>
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  topBar: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: COLORS.gray200,
  },
  greeting: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  bizName:  { fontSize: 13, color: COLORS.textLight, marginTop: 2 },
  center:   { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll:   { padding: SPACING.md, gap: SPACING.md },
  row:      { flexDirection: 'row', gap: SPACING.md },
  card: {
    backgroundColor: '#fff', borderRadius: 16, padding: SPACING.md,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
    flex: 1,
  },
  statCard: { alignItems: 'flex-start' },
  iconBox:  { padding: 10, borderRadius: 12, marginBottom: SPACING.sm },
  statValue:{ fontSize: 17, fontWeight: '700', color: COLORS.text },
  statLabel:{ fontSize: 12, color: COLORS.textLight, marginTop: 2 },
  statSub:  { fontSize: 11, color: COLORS.gray400, marginTop: 1 },
  chartHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.md },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  periodRow: { flexDirection: 'row', gap: 4 },
  periodBtn: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, backgroundColor: COLORS.gray100 },
  periodBtnActive: { backgroundColor: COLORS.primary },
  periodText: { fontSize: 12, color: COLORS.textLight, fontWeight: '600' },
  periodTextActive: { color: '#fff' },
  barChart: { flexDirection: 'row', alignItems: 'flex-end', height: 120, gap: 3, marginBottom: SPACING.md },
  barCol:   { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
  bar:      { width: '100%', backgroundColor: COLORS.primary, borderRadius: 4, opacity: 0.8 },
  barLabel: { fontSize: 9, color: COLORS.textLight, marginTop: 3 },
  summaryRow:   { flexDirection: 'row', justifyContent: 'space-around', paddingTop: SPACING.md, borderTopWidth: 1, borderTopColor: COLORS.gray100 },
  summaryItem:  { alignItems: 'center' },
  summaryVal:   { fontSize: 14, fontWeight: '700', color: COLORS.text },
  summaryLabel: { fontSize: 11, color: COLORS.textLight, marginTop: 2 },
  emptyText:    { textAlign: 'center', color: COLORS.textLight, paddingVertical: SPACING.lg },
  productRow:   { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: COLORS.gray100 },
  rank:         { width: 26, height: 26, borderRadius: 13, justifyContent: 'center', alignItems: 'center', marginRight: SPACING.sm },
  rankText:     { fontSize: 12, fontWeight: '700' },
  productName:  { flex: 1, fontSize: 13, color: COLORS.text },
  productStat:  { fontSize: 12, color: COLORS.textLight },
});
