import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl, ActivityIndicator, Alert, Modal,
  ScrollView, Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../store/authStore';
import { getWhatsAppOrders, approveOrder, rejectOrder } from '../../api/whatsapp';
import { WhatsAppOrder } from '../../types';
import { COLORS, SPACING } from '../../constants';

const STATUS_LABELS: Record<string, string> = {
  pending_verification: 'En attente',
  approved:  'Approuvé',
  rejected:  'Rejeté',
};

const STATUS_COLORS: Record<string, string> = {
  pending_verification: COLORS.warning,
  approved:  COLORS.success,
  rejected:  COLORS.danger,
};

function fmt(n: number) { return new Intl.NumberFormat('fr-FR').format(n); }

type FilterStatus = 'all' | 'pending_verification' | 'approved' | 'rejected';

function OrderCard({ order, onPress }: { order: WhatsAppOrder; onPress: () => void }) {
  const color = STATUS_COLORS[order.status] ?? COLORS.gray400;
  return (
    <TouchableOpacity style={styles.orderCard} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.orderHeader}>
        <View>
          <Text style={styles.customerName}>{order.customer_name}</Text>
          <Text style={styles.orderDate}>{new Date(order.created_at).toLocaleString('fr-FR')}</Text>
        </View>
        <View style={[styles.badge, { backgroundColor: color + '20' }]}>
          <Text style={[styles.badgeText, { color }]}>{STATUS_LABELS[order.status]}</Text>
        </View>
      </View>
      <Text style={styles.productName} numberOfLines={1}>{order.product_name}</Text>
      <View style={styles.orderFooter}>
        <Text style={styles.orderPhone}>{order.customer_phone}</Text>
        <Text style={styles.orderTotal}>{fmt(order.total)} FCFA</Text>
      </View>
    </TouchableOpacity>
  );
}

function DetailModal({ order, onClose, onApprove, onReject, acting }: {
  order: WhatsAppOrder;
  onClose: () => void;
  onApprove: () => void;
  onReject: () => void;
  acting: boolean;
}) {
  const color = STATUS_COLORS[order.status] ?? COLORS.gray400;
  const isPending = order.status === 'pending_verification';

  return (
    <Modal visible animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>Commande WhatsApp</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={COLORS.text} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={[styles.statusBanner, { backgroundColor: color + '15' }]}>
              <Text style={[styles.statusText, { color }]}>{STATUS_LABELS[order.status]}</Text>
            </View>

            {[
              ['Client', order.customer_name],
              ['Téléphone', order.customer_phone],
              ['Produit', order.product_name],
              ['Quantité', String(order.qty)],
              ['Prix unitaire', fmt(order.unit_price) + ' FCFA'],
              ['Total', fmt(order.total) + ' FCFA'],
              ['Adresse', order.address],
              ['Paiement', order.payment_method],
            ].map(([label, value]) => (
              <View key={label} style={styles.detailRow}>
                <Text style={styles.detailLabel}>{label}</Text>
                <Text style={styles.detailValue}>{value}</Text>
              </View>
            ))}

            <TouchableOpacity
              style={styles.callBtn}
              onPress={() => Linking.openURL(`tel:${order.customer_phone}`)}
            >
              <Ionicons name="call" size={16} color={COLORS.primary} />
              <Text style={styles.callText}>Appeler le client</Text>
            </TouchableOpacity>

            {isPending && (
              <View style={styles.actionRow}>
                <TouchableOpacity
                  style={[styles.actionBtn, styles.rejectBtn, acting && styles.btnDisabled]}
                  onPress={onReject}
                  disabled={acting}
                >
                  {acting ? <ActivityIndicator color="#fff" size="small" /> : (
                    <>
                      <Ionicons name="close-circle" size={18} color="#fff" />
                      <Text style={styles.actionText}>Rejeter</Text>
                    </>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionBtn, styles.approveBtn, acting && styles.btnDisabled]}
                  onPress={onApprove}
                  disabled={acting}
                >
                  {acting ? <ActivityIndicator color="#fff" size="small" /> : (
                    <>
                      <Ionicons name="checkmark-circle" size={18} color="#fff" />
                      <Text style={styles.actionText}>Approuver</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

export default function WhatsAppScreen() {
  const { currentLocationId } = useAuthStore();
  const [orders, setOrders]       = useState<WhatsAppOrder[]>([]);
  const [counts, setCounts]       = useState<Record<string, number>>({});
  const [filter, setFilter]       = useState<FilterStatus>('pending_verification');
  const [page, setPage]           = useState(1);
  const [hasMore, setHasMore]     = useState(false);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selected, setSelected]   = useState<WhatsAppOrder | null>(null);
  const [acting, setActing]       = useState(false);

  const load = useCallback(async (reset = false) => {
    const p = reset ? 1 : page;
    try {
      const res = await getWhatsAppOrders({
        location_id: currentLocationId ?? undefined,
        status: filter === 'all' ? undefined : filter,
        page: p,
      });
      if (!res) return;
      setOrders(prev => reset ? res.orders : [...prev, ...res.orders]);
      setHasMore(res.has_more);
      setCounts(res.counts ?? {});
      if (reset) setPage(1);
    } catch {
      // ignore
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [currentLocationId, filter, page]);

  useEffect(() => { setLoading(true); load(true); }, [filter, currentLocationId]);

  const onRefresh = () => { setRefreshing(true); load(true); };
  const loadMore  = () => { if (hasMore) { setPage(p => p + 1); load(); } };

  const handleApprove = async () => {
    if (!selected) return;
    setActing(true);
    try {
      await approveOrder(selected.id);
      setSelected(null);
      load(true);
    } catch {
      Alert.alert('Erreur', 'Impossible d\'approuver cette commande.');
    } finally {
      setActing(false);
    }
  };

  const handleReject = async () => {
    if (!selected) return;
    Alert.alert('Rejeter', 'Confirmer le rejet de cette commande ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Rejeter', style: 'destructive',
        onPress: async () => {
          setActing(true);
          try {
            await rejectOrder(selected.id);
            setSelected(null);
            load(true);
          } catch {
            Alert.alert('Erreur', 'Impossible de rejeter.');
          } finally {
            setActing(false);
          }
        }
      }
    ]);
  };

  const FILTERS: { key: FilterStatus; label: string }[] = [
    { key: 'pending_verification', label: `En attente ${counts.pending_verification ? `(${counts.pending_verification})` : ''}` },
    { key: 'approved',  label: 'Approuvés' },
    { key: 'rejected',  label: 'Rejetés' },
    { key: 'all',       label: 'Tous' },
  ];

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.topBar}>
        <Text style={styles.screenTitle}>Commandes WhatsApp</Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterBar} contentContainerStyle={styles.filterContent}>
        {FILTERS.map(f => (
          <TouchableOpacity
            key={f.key}
            style={[styles.filterBtn, filter === f.key && styles.filterBtnActive]}
            onPress={() => setFilter(f.key)}
          >
            <Text style={[styles.filterText, filter === f.key && styles.filterTextActive]}>{f.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={item => String(item.id)}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => <OrderCard order={item} onPress={() => setSelected(item)} />}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
          onEndReached={loadMore}
          onEndReachedThreshold={0.3}
          ListEmptyComponent={<Text style={styles.emptyText}>Aucune commande dans cette catégorie</Text>}
        />
      )}

      {selected && (
        <DetailModal
          order={selected}
          onClose={() => setSelected(null)}
          onApprove={handleApprove}
          onReject={handleReject}
          acting={acting}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:      { flex: 1, backgroundColor: COLORS.background },
  topBar:    { paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: COLORS.gray200 },
  screenTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  center:    { flex: 1, justifyContent: 'center', alignItems: 'center' },
  filterBar: { backgroundColor: '#fff', maxHeight: 52, borderBottomWidth: 1, borderBottomColor: COLORS.gray200 },
  filterContent: { paddingHorizontal: SPACING.md, paddingVertical: 10, gap: 8 },
  filterBtn: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, backgroundColor: COLORS.gray100 },
  filterBtnActive: { backgroundColor: COLORS.primary },
  filterText: { fontSize: 13, color: COLORS.textLight, fontWeight: '500' },
  filterTextActive: { color: '#fff', fontWeight: '600' },
  list:      { padding: SPACING.md, gap: SPACING.sm },
  orderCard: {
    backgroundColor: '#fff', borderRadius: 14, padding: SPACING.md,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  orderHeader:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 },
  customerName: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  orderDate:    { fontSize: 11, color: COLORS.textLight, marginTop: 2 },
  badge:        { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 },
  badgeText:    { fontSize: 11, fontWeight: '700' },
  productName:  { fontSize: 13, color: COLORS.gray600, marginBottom: 8 },
  orderFooter:  { flexDirection: 'row', justifyContent: 'space-between' },
  orderPhone:   { fontSize: 12, color: COLORS.textLight },
  orderTotal:   { fontSize: 14, fontWeight: '700', color: COLORS.text },
  emptyText:    { textAlign: 'center', color: COLORS.textLight, marginTop: 60 },
  // Modal
  overlay:   { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet:     { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '90%', padding: SPACING.lg },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.md },
  sheetTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  statusBanner: { borderRadius: 10, padding: 12, marginBottom: SPACING.md, alignItems: 'center' },
  statusText: { fontSize: 14, fontWeight: '700' },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: COLORS.gray100 },
  detailLabel: { fontSize: 13, color: COLORS.textLight, flex: 1 },
  detailValue: { fontSize: 13, fontWeight: '600', color: COLORS.text, flex: 2, textAlign: 'right' },
  callBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: SPACING.md, padding: 12, borderRadius: 10, borderWidth: 1, borderColor: COLORS.primary },
  callText: { color: COLORS.primary, fontWeight: '600' },
  actionRow: { flexDirection: 'row', gap: SPACING.md, marginTop: SPACING.lg, marginBottom: SPACING.xl },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 14, borderRadius: 12 },
  approveBtn: { backgroundColor: COLORS.success },
  rejectBtn:  { backgroundColor: COLORS.danger },
  actionText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  btnDisabled:{ opacity: 0.6 },
});
