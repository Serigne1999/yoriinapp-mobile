import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, ActivityIndicator, Alert, Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../store/authStore';
import { getWhatsAppOrders, approveOrder, rejectOrder } from '../../api/whatsapp';
import { WhatsAppOrder } from '../../types';
import { C, fcfa } from '../../constants';

const AVATAR_PALETTE = ['#FDE68A','#FBCFE8','#BFDBFE','#C7F0D9','#FECACA','#DDD6FE','#FED7AA','#A7F3D0'];
function avatarBg(name: string) {
  return AVATAR_PALETTE[((name.charCodeAt(0) || 0) + (name.charCodeAt(1) || 0)) % AVATAR_PALETTE.length];
}
function initials(name: string) {
  return name.split(/\s+/).map(s => s[0]).slice(0, 2).join('').toUpperCase();
}

const TABS = [
  { id: 'pending_verification', label: 'À valider' },
  { id: 'approved',             label: 'En préparation' },
  { id: 'ready',                label: 'Prêtes' },
] as const;
type TabId = typeof TABS[number]['id'];

// ── Order card ─────────────────────────────────────────────
function OrderCard({ order, onApprove, onReject, acting }: {
  order: WhatsAppOrder;
  onApprove: () => void;
  onReject: () => void;
  acting: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const isPending = order.status === 'pending_verification';

  const items = order.items ?? [{
    name: order.product_name,
    qty: order.qty,
    price: order.unit_price,
  }];

  const timeAgo = (() => {
    const diff = Date.now() - new Date(order.created_at).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1)  return 'à l\'instant';
    if (mins < 60) return `il y a ${mins} min`;
    return `il y a ${Math.floor(mins / 60)}h`;
  })();

  return (
    <View style={[oc.card, isPending && oc.cardUrgent]}>
      {/* Client header */}
      <View style={oc.topRow}>
        <View style={[oc.avatar, { backgroundColor: avatarBg(order.customer_name) }]}>
          <Text style={oc.avatarText}>{initials(order.customer_name)}</Text>
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={oc.clientName} numberOfLines={1}>{order.customer_name}</Text>
            {isPending && (
              <View style={oc.urgentBadge}>
                <Text style={oc.urgentText}>URGENT</Text>
              </View>
            )}
          </View>
          <Text style={oc.clientMeta}>{order.customer_phone} · {timeAgo}</Text>
        </View>
        <TouchableOpacity
          style={oc.callBtn}
          onPress={() => Linking.openURL(`tel:${order.customer_phone}`)}
        >
          <Ionicons name="call-outline" size={18} color={C.secondary} />
        </TouchableOpacity>
      </View>

      {/* Items list */}
      <View style={oc.itemsBox}>
        {(expanded ? items : items.slice(0, 2)).map((it: any, i: number) => (
          <View key={i} style={oc.itemRow}>
            <Text style={oc.itemQty}>×{it.qty ?? it.quantity}</Text>
            <Text style={oc.itemName} numberOfLines={1}>{it.name ?? it.product_name}</Text>
            <Text style={oc.itemPrice}>{fcfa((it.qty ?? it.quantity) * (it.price ?? it.unit_price))}</Text>
          </View>
        ))}
        {items.length > 2 && !expanded && (
          <TouchableOpacity onPress={() => setExpanded(true)}>
            <Text style={oc.moreText}>+ {items.length - 2} autres articles</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Note */}
      {order.address ? (
        <View style={oc.note}>
          <Ionicons name="chatbubble-outline" size={14} color="#B45309" style={{ marginTop: 2, flexShrink: 0 }} />
          <Text style={oc.noteText}>{order.address}</Text>
        </View>
      ) : null}

      {/* Footer */}
      <View style={oc.footer}>
        <View>
          <Text style={oc.footerTotalLabel}>Total</Text>
          <Text style={oc.footerTotal}>{fcfa(order.total)}</Text>
        </View>
        {isPending && (
          <View style={oc.actions}>
            <TouchableOpacity
              style={oc.rejectBtn}
              onPress={onReject}
              disabled={acting}
              activeOpacity={0.8}
            >
              <Text style={oc.rejectText}>Rejeter</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[oc.validateBtn, acting && { opacity: 0.6 }]}
              onPress={onApprove}
              disabled={acting}
              activeOpacity={0.85}
            >
              {acting ? <ActivityIndicator color="#fff" size="small" /> : (
                <>
                  <Ionicons name="checkmark" size={16} color="#fff" />
                  <Text style={oc.validateText}>Valider</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
}

// ── Main screen ────────────────────────────────────────────
export default function WhatsAppScreen() {
  const { currentLocationId } = useAuthStore();
  const [orders, setOrders]       = useState<WhatsAppOrder[]>([]);
  const [counts, setCounts]       = useState<Record<string, number>>({});
  const [tab, setTab]             = useState<TabId>('pending_verification');
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actingId, setActingId]   = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await getWhatsAppOrders({
        location_id: currentLocationId ?? undefined,
        status: tab === 'ready' ? undefined : tab,
        page: 1,
      });
      if (!res) return;
      setOrders(res.orders);
      setCounts(res.counts ?? {});
    } catch {}
    finally { setLoading(false); setRefreshing(false); }
  }, [currentLocationId, tab]);

  useEffect(() => { setLoading(true); load(); }, [tab, currentLocationId]);

  const handleApprove = async (order: WhatsAppOrder) => {
    setActingId(order.id);
    try {
      await approveOrder(order.id);
      load();
    } catch {
      Alert.alert('Erreur', 'Impossible d\'approuver cette commande.');
    } finally { setActingId(null); }
  };

  const handleReject = (order: WhatsAppOrder) => {
    Alert.alert('Rejeter', 'Confirmer le rejet de cette commande ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Rejeter', style: 'destructive',
        onPress: async () => {
          setActingId(order.id);
          try {
            await rejectOrder(order.id);
            load();
          } catch {
            Alert.alert('Erreur', 'Impossible de rejeter.');
          } finally { setActingId(null); }
        },
      },
    ]);
  };

  const totalOrders = Object.values(counts).reduce((a, b) => a + b, 0);

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      {/* Header */}
      <View style={s.headerWrap}>
        <View style={s.headerTop}>
          <View style={s.waIcon}>
            <Ionicons name="logo-whatsapp" size={22} color={C.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.headerTitle}>Commandes WhatsApp</Text>
            <Text style={s.headerSub}>
              <Text style={s.botDot}>● </Text>
              <Text style={s.botStatus}>Bot connecté</Text>
              {'  ·  '}{orders.length} nouvelles · {totalOrders} aujourd'hui
            </Text>
          </View>
          <TouchableOpacity style={s.moreBtn}>
            <Ionicons name="ellipsis-vertical" size={20} color={C.text2} />
          </TouchableOpacity>
        </View>

        {/* Underline tabs */}
        <View style={s.tabRow}>
          {TABS.map(t => {
            const on = tab === t.id;
            const cnt = counts[t.id] ?? 0;
            return (
              <TouchableOpacity
                key={t.id}
                style={[s.tab, on && s.tabOn]}
                onPress={() => setTab(t.id)}
                activeOpacity={0.7}
              >
                <Text style={[s.tabText, on && s.tabTextOn]}>{t.label}</Text>
                <View style={[s.tabCount, on && s.tabCountOn]}>
                  <Text style={[s.tabCountText, on && { color: '#fff' }]}>
                    {cnt || orders.length}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Orders */}
      {loading ? (
        <View style={s.center}>
          <ActivityIndicator size="large" color={C.primary} />
        </View>
      ) : (
        <ScrollView
          style={{ flex: 1, backgroundColor: C.bg }}
          contentContainerStyle={s.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); load(); }}
              tintColor={C.primary} colors={[C.primary]}
            />
          }
        >
          {orders.length === 0 ? (
            <Text style={s.empty}>Aucune commande dans cette catégorie</Text>
          ) : (
            orders.map(order => (
              <OrderCard
                key={order.id}
                order={order}
                onApprove={() => handleApprove(order)}
                onReject={() => handleReject(order)}
                acting={actingId === order.id}
              />
            ))
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  headerWrap: { backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: C.border },
  headerTop: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 16, paddingTop: 8, paddingBottom: 10,
  },
  waIcon: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: C.primarySoft,
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontSize: 18, fontWeight: '800', color: C.text, letterSpacing: -0.3 },
  headerSub:   { fontSize: 12, color: C.muted, marginTop: 1 },
  botDot:      { color: C.success, fontWeight: '700' },
  botStatus:   { color: C.success, fontWeight: '600' },
  moreBtn: {
    width: 38, height: 38, borderRadius: 10, backgroundColor: C.bg,
    borderWidth: 1, borderColor: C.border,
    alignItems: 'center', justifyContent: 'center',
  },

  tabRow: { flexDirection: 'row', paddingHorizontal: 0 },
  tab: {
    flex: 1, paddingVertical: 10, paddingBottom: 14,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    borderBottomWidth: 2.5, borderBottomColor: 'transparent',
  },
  tabOn:      { borderBottomColor: C.primary },
  tabText:    { fontSize: 13, fontWeight: '600', color: C.muted },
  tabTextOn:  { color: C.text, fontWeight: '700' },
  tabCount: {
    minWidth: 19, height: 19, paddingHorizontal: 5, borderRadius: 10,
    backgroundColor: C.borderL,
    alignItems: 'center', justifyContent: 'center',
  },
  tabCountOn:   { backgroundColor: C.primary },
  tabCountText: { fontSize: 10.5, fontWeight: '700', color: C.muted },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list:   { padding: 12, gap: 12, paddingBottom: 100 },
  empty:  { textAlign: 'center', color: C.muted, marginTop: 60 },
});

const oc = StyleSheet.create({
  card: {
    backgroundColor: '#fff', borderRadius: 16,
    borderWidth: 1, borderColor: C.border, overflow: 'hidden',
  },
  cardUrgent: {
    borderWidth: 1.5, borderColor: C.primary,
    shadowColor: C.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12, shadowRadius: 14, elevation: 4,
  },
  topRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    padding: 12, paddingBottom: 10,
  },
  avatar: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  avatarText: { fontSize: 15, fontWeight: '700', color: '#3B3320' },
  clientName: { fontSize: 14.5, fontWeight: '700', color: C.text },
  clientMeta: { fontSize: 12, color: C.muted, marginTop: 1, fontVariant: ['tabular-nums'] },
  urgentBadge: {
    backgroundColor: '#FEE2E2', paddingHorizontal: 5, paddingVertical: 2, borderRadius: 4,
  },
  urgentText: { fontSize: 9.5, fontWeight: '700', color: '#B91C1C', letterSpacing: 0.3 },
  callBtn: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: C.primarySoft,
    alignItems: 'center', justifyContent: 'center',
  },

  itemsBox: {
    marginHorizontal: 14, backgroundColor: C.bg,
    borderRadius: 10, padding: 10, marginBottom: 0,
  },
  itemRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4 },
  itemQty: { fontSize: 13, fontWeight: '600', color: C.muted, width: 28 },
  itemName: { flex: 1, fontSize: 13, color: C.text2 },
  itemPrice: { fontSize: 13, fontWeight: '600', color: C.text },
  moreText: { fontSize: 12, color: C.secondary, fontWeight: '600', marginTop: 4 },

  note: {
    flexDirection: 'row', gap: 8, alignItems: 'flex-start',
    marginHorizontal: 14, marginTop: 8,
    backgroundColor: '#FFFBEB', borderRadius: 9, padding: 8,
    borderWidth: 1, borderColor: '#FDE68A',
  },
  noteText: { fontSize: 12.5, color: '#78350F', lineHeight: 18, flex: 1 },

  footer: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    padding: 12, paddingTop: 12,
    borderTopWidth: 1, borderTopColor: C.borderL, marginTop: 12,
  },
  footerTotalLabel: { fontSize: 11, color: C.muted, fontWeight: '500' },
  footerTotal:      { fontSize: 17, fontWeight: '800', color: C.text, letterSpacing: -0.4, lineHeight: 20 },
  actions:  { flex: 1, flexDirection: 'row', gap: 8, justifyContent: 'flex-end' },
  rejectBtn: {
    height: 40, paddingHorizontal: 14, borderRadius: 10,
    borderWidth: 1.5, borderColor: C.border,
    alignItems: 'center', justifyContent: 'center',
  },
  rejectText: { fontSize: 13, fontWeight: '700', color: C.danger },
  validateBtn: {
    height: 40, paddingHorizontal: 16, borderRadius: 10,
    backgroundColor: C.primary,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    shadowColor: C.primary, shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  validateText: { fontSize: 13, fontWeight: '700', color: '#fff' },
});
