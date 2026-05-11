import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, RefreshControl,
  ActivityIndicator, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import client from '../../api/client';
import { ApiResponse, Sale } from '../../types';
import { useAuthStore } from '../../store/authStore';
import { COLORS, SPACING } from '../../constants';

interface SalesResponse { sales: Sale[]; total: number; has_more: boolean; }

function fmt(n: number) { return new Intl.NumberFormat('fr-FR').format(n); }

const PAYMENT_COLORS: Record<string, string> = {
  paid:        COLORS.success,
  partial:     COLORS.warning,
  due:         COLORS.danger,
  overdue:     COLORS.danger,
};

export default function SalesScreen() {
  const { currentLocationId } = useAuthStore();
  const [sales, setSales]       = useState<Sale[]>([]);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch]     = useState('');
  const [page, setPage]         = useState(1);
  const [hasMore, setHasMore]   = useState(false);

  const load = useCallback(async (reset = false) => {
    const p = reset ? 1 : page;
    try {
      const { data } = await client.get<ApiResponse<SalesResponse>>('/sales', {
        params: {
          location_id: currentLocationId,
          search: search || undefined,
          page: p,
          per_page: 20,
        },
      });
      const res = data.data;
      setSales(prev => reset ? res.sales : [...prev, ...res.sales]);
      setHasMore(res.has_more);
      if (reset) setPage(1);
    } catch {
      // ignore
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [currentLocationId, search, page]);

  useEffect(() => { setLoading(true); load(true); }, [currentLocationId]);

  const onSearch = () => { setLoading(true); load(true); };
  const onRefresh = () => { setRefreshing(true); load(true); };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.topBar}>
        <Text style={styles.screenTitle}>Ventes</Text>
      </View>

      <View style={styles.searchBar}>
        <Ionicons name="search" size={18} color={COLORS.textLight} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="N° facture, client..."
          placeholderTextColor={COLORS.textLight}
          value={search}
          onChangeText={setSearch}
          onSubmitEditing={onSearch}
          returnKeyType="search"
        />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <FlatList
          data={sales}
          keyExtractor={item => String(item.id)}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
          onEndReached={() => { if (hasMore) { setPage(p => p + 1); load(); } }}
          onEndReachedThreshold={0.3}
          ListEmptyComponent={<Text style={styles.emptyText}>Aucune vente trouvée</Text>}
          renderItem={({ item }) => (
            <View style={styles.saleCard}>
              <View style={styles.saleHeader}>
                <Text style={styles.invoiceNo}>{item.invoice_no}</Text>
                <Text style={[styles.payStatus, { color: PAYMENT_COLORS[item.payment_status] ?? COLORS.textLight }]}>
                  {item.payment_status}
                </Text>
              </View>
              <View style={styles.saleFooter}>
                <Text style={styles.saleCustomer}>{item.customer?.name ?? 'Client de passage'}</Text>
                <View style={styles.saleRight}>
                  <Text style={styles.saleAmount}>{fmt(item.total)} FCFA</Text>
                  <Text style={styles.saleDate}>{new Date(item.date).toLocaleDateString('fr-FR')}</Text>
                </View>
              </View>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:       { flex: 1, backgroundColor: COLORS.background },
  topBar:     { paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: COLORS.gray200 },
  screenTitle:{ fontSize: 18, fontWeight: '700', color: COLORS.text },
  center:     { flex: 1, justifyContent: 'center', alignItems: 'center' },
  searchBar:  { flexDirection: 'row', alignItems: 'center', margin: SPACING.md, backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 12, borderWidth: 1, borderColor: COLORS.gray200 },
  searchIcon: { marginRight: 8 },
  searchInput:{ flex: 1, height: 44, fontSize: 14, color: COLORS.text },
  list:       { paddingHorizontal: SPACING.md, gap: SPACING.sm, paddingBottom: SPACING.xl },
  saleCard:   {
    backgroundColor: '#fff', borderRadius: 14, padding: SPACING.md,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  saleHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  invoiceNo:  { fontSize: 14, fontWeight: '700', color: COLORS.text },
  payStatus:  { fontSize: 12, fontWeight: '700', textTransform: 'capitalize' },
  saleFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  saleCustomer: { fontSize: 13, color: COLORS.textLight, flex: 1 },
  saleRight:  { alignItems: 'flex-end' },
  saleAmount: { fontSize: 14, fontWeight: '700', color: COLORS.text },
  saleDate:   { fontSize: 11, color: COLORS.textLight, marginTop: 2 },
  emptyText:  { textAlign: 'center', color: COLORS.textLight, marginTop: 60 },
});
