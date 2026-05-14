import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SalesStackParamList } from '../../navigation/SalesNavigator';
import client from '../../api/client';
import { ApiResponse, SaleDetail, SaleDetailPayment } from '../../types';
import { C, fcfa } from '../../constants';

type Props = NativeStackScreenProps<SalesStackParamList, 'SaleDetail'>;

const STATUS_INFO: Record<string, { label: string; fg: string; bg: string; icon: any }> = {
  paid:    { label: 'Payé',         fg: '#15803D', bg: '#DCFCE7', icon: 'checkmark-circle' },
  partial: { label: 'Partiel',      fg: '#B45309', bg: '#FEF3C7', icon: 'alert-circle' },
  due:     { label: 'À recouvrer',  fg: '#B45309', bg: '#FEF3C7', icon: 'alert-circle' },
  refund:  { label: 'Remboursé',    fg: '#B91C1C', bg: '#FEE2E2', icon: 'close-circle' },
};

const METHOD_LABELS: Record<string, string> = {
  cash:         'Espèces',
  wave:         'Wave',
  orange_money: 'Orange Money',
  card:         'Carte bancaire',
  credit:       'Crédit',
};

function formatDate(str: string) {
  try {
    return new Date(str).toLocaleString('fr-FR', {
      day: '2-digit', month: 'long', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch { return str; }
}

export default function SaleDetailScreen({ route, navigation }: Props) {
  const { saleId } = route.params;
  const [sale, setSale]       = useState<SaleDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  useEffect(() => {
    client.get<ApiResponse<SaleDetail>>(`/sales/${saleId}`)
      .then(({ data }) => setSale(data.data))
      .catch(e => setError(e?.response?.data?.message ?? e?.message ?? 'Erreur de chargement'))
      .finally(() => setLoading(false));
  }, [saleId]);

  const si = STATUS_INFO[sale?.payment_status ?? ''] ?? STATUS_INFO.due;

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={C.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.headerTitle}>{sale?.invoice_no ?? 'Détail vente'}</Text>
          {sale && <Text style={s.headerSub}>{formatDate(sale.date)}</Text>}
        </View>
        {sale && (
          <View style={[s.statusBadge, { backgroundColor: si.bg }]}>
            <Ionicons name={si.icon} size={13} color={si.fg} />
            <Text style={[s.statusText, { color: si.fg }]}>{si.label}</Text>
          </View>
        )}
      </View>

      {loading && (
        <View style={s.center}>
          <ActivityIndicator size="large" color={C.primary} />
        </View>
      )}

      {error && (
        <View style={s.errorWrap}>
          <Ionicons name="alert-circle-outline" size={16} color={C.danger} />
          <Text style={s.errorText}>{error}</Text>
        </View>
      )}

      {sale && (
        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

          {/* Client + Location */}
          <View style={s.card}>
            <Text style={s.cardTitle}>Informations</Text>
            <Row icon="person-outline" label="Client" value={sale.customer?.name ?? 'Client de passage'} />
            {sale.customer?.mobile ? (
              <Row icon="call-outline" label="Téléphone" value={sale.customer.mobile} />
            ) : null}
            {sale.location ? (
              <Row icon="storefront-outline" label="Magasin" value={sale.location} />
            ) : null}
          </View>

          {/* Articles */}
          <View style={s.card}>
            <Text style={s.cardTitle}>Articles ({sale.items.length})</Text>
            {sale.items.map((item, i) => (
              <View key={i} style={[s.itemRow, i > 0 && s.itemBorder]}>
                <View style={{ flex: 1 }}>
                  <Text style={s.itemName} numberOfLines={2}>
                    {item.product ?? '—'}
                    {item.variation && item.variation !== 'Default' ? ` · ${item.variation}` : ''}
                  </Text>
                  <Text style={s.itemMeta}>
                    {item.quantity} × {fcfa(item.unit_price)}
                    {item.discount > 0 ? `  –  remise ${fcfa(item.discount)}` : ''}
                  </Text>
                </View>
                <Text style={s.itemTotal}>{fcfa(item.line_total)}</Text>
              </View>
            ))}
          </View>

          {/* Récapitulatif financier */}
          <View style={s.card}>
            <Text style={s.cardTitle}>Récapitulatif</Text>
            <FinRow label="Sous-total HT" value={sale.total_before_tax} />
            {sale.tax_amount > 0 && <FinRow label="TVA" value={sale.tax_amount} />}
            {sale.discount_amount > 0 && (
              <FinRow label="Remise globale" value={-sale.discount_amount} danger />
            )}
            <View style={s.totalRow}>
              <Text style={s.totalLabel}>Total</Text>
              <Text style={s.totalValue}>{fcfa(sale.final_total)}</Text>
            </View>
          </View>

          {/* Paiements */}
          <View style={[s.card, { marginBottom: 32 }]}>
            <Text style={s.cardTitle}>Paiements</Text>
            {sale.payments.length === 0 ? (
              <Text style={s.emptyText}>Aucun paiement enregistré</Text>
            ) : (
              sale.payments.map((p, i) => (
                <PaymentRow key={i} payment={p} isLast={i === sale.payments.length - 1} />
              ))
            )}
          </View>

        </ScrollView>
      )}
    </SafeAreaView>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Row({ icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <View style={s.infoRow}>
      <Ionicons name={icon} size={15} color={C.muted} style={{ marginTop: 1 }} />
      <Text style={s.infoLabel}>{label}</Text>
      <Text style={s.infoValue} numberOfLines={1}>{value}</Text>
    </View>
  );
}

function FinRow({ label, value, danger }: { label: string; value: number; danger?: boolean }) {
  return (
    <View style={s.finRow}>
      <Text style={s.finLabel}>{label}</Text>
      <Text style={[s.finValue, danger && { color: C.danger }]}>
        {value < 0 ? `–${fcfa(-value)}` : fcfa(value)}
      </Text>
    </View>
  );
}

const PAY_COLORS: Record<string, { fg: string; bg: string }> = {
  cash:         { fg: '#374151', bg: '#F3F4F6' },
  wave:         { fg: '#1E40AF', bg: '#DBEAFE' },
  orange_money: { fg: '#B45309', bg: '#FEF3C7' },
  card:         { fg: '#9333EA', bg: '#F3E8FF' },
  credit:       { fg: '#B91C1C', bg: '#FEE2E2' },
};

function PaymentRow({ payment, isLast }: { payment: SaleDetailPayment; isLast: boolean }) {
  const pc = PAY_COLORS[payment.method] ?? PAY_COLORS.cash;
  return (
    <View style={[s.payRow, !isLast && s.payBorder]}>
      <View style={[s.payBadge, { backgroundColor: pc.bg }]}>
        <Text style={[s.payMethod, { color: pc.fg }]}>
          {METHOD_LABELS[payment.method] ?? payment.method}
        </Text>
      </View>
      <Text style={s.payAmount}>{fcfa(payment.amount)}</Text>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: C.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { padding: 16, gap: 12 },

  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingTop: 8, paddingBottom: 14,
    backgroundColor: C.bg,
    borderBottomWidth: 1, borderBottomColor: C.border,
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 10,
    backgroundColor: '#fff', borderWidth: 1, borderColor: C.border,
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontSize: 17, fontWeight: '800', color: C.text, letterSpacing: -0.3 },
  headerSub:   { fontSize: 11.5, color: C.muted, marginTop: 1 },
  statusBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20,
  },
  statusText: { fontSize: 12, fontWeight: '700' },

  errorWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    margin: 16, backgroundColor: C.dangerSoft, borderRadius: 10, padding: 12,
  },
  errorText: { fontSize: 13, color: C.danger, flex: 1 },

  card: {
    backgroundColor: '#fff', borderRadius: 14,
    borderWidth: 1, borderColor: C.border,
    padding: 16, gap: 4,
  },
  cardTitle: { fontSize: 13, fontWeight: '700', color: C.text2, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },

  infoRow:   { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 },
  infoLabel: { fontSize: 13, color: C.muted, width: 80 },
  infoValue: { fontSize: 13, fontWeight: '600', color: C.text, flex: 1, textAlign: 'right' },

  itemRow:   { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  itemBorder:{ borderTopWidth: 1, borderTopColor: C.borderL },
  itemName:  { fontSize: 13.5, fontWeight: '600', color: C.text, lineHeight: 18 },
  itemMeta:  { fontSize: 12, color: C.muted, marginTop: 2 },
  itemTotal: { fontSize: 14, fontWeight: '700', color: C.text, minWidth: 80, textAlign: 'right' },

  finRow:    { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  finLabel:  { fontSize: 13, color: C.muted },
  finValue:  { fontSize: 13, fontWeight: '600', color: C.text },
  totalRow:  {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginTop: 8, paddingTop: 12, borderTopWidth: 1.5, borderTopColor: C.border,
  },
  totalLabel:{ fontSize: 15, fontWeight: '800', color: C.text },
  totalValue:{ fontSize: 18, fontWeight: '800', color: C.primary },

  payRow:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10 },
  payBorder:{ borderBottomWidth: 1, borderBottomColor: C.borderL },
  payBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  payMethod:{ fontSize: 13, fontWeight: '700' },
  payAmount:{ fontSize: 14, fontWeight: '700', color: C.text },

  emptyText:{ fontSize: 13, color: C.muted, textAlign: 'center', paddingVertical: 12 },
});
