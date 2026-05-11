import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, TextInput, FlatList, TouchableOpacity,
  Modal, ScrollView, ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../store/authStore';
import { useCartStore } from '../../store/cartStore';
import { searchProducts, createSale } from '../../api/pos';
import { Product } from '../../types';
import { COLORS, SPACING } from '../../constants';

function fmt(n: number) { return new Intl.NumberFormat('fr-FR').format(Math.round(n)); }

// ── Carte produit ──────────────────────────────────────────────────────────────
function ProductCard({ product, onAdd }: { product: Product; onAdd: (v: Product['variations'][0]) => void }) {
  const variation = product.variations[0];
  const inStock   = !product.enable_stock || variation.stock > 0;

  return (
    <TouchableOpacity
      style={[styles.productCard, !inStock && styles.productCardOut]}
      onPress={() => inStock && onAdd(variation)}
      disabled={!inStock}
      activeOpacity={0.8}
    >
      <View style={styles.productInfo}>
        <Text style={styles.productName} numberOfLines={2}>{product.name}</Text>
        {variation.name !== 'DUMMY' && (
          <Text style={styles.variationName}>{variation.name}</Text>
        )}
        <Text style={styles.productPrice}>{fmt(variation.price)} FCFA</Text>
        {product.enable_stock && (
          <Text style={[styles.stockText, { color: variation.stock > 5 ? COLORS.success : COLORS.danger }]}>
            Stock : {variation.stock}
          </Text>
        )}
      </View>
      <View style={[styles.addBtn, !inStock && { backgroundColor: COLORS.gray200 }]}>
        <Ionicons name="add" size={22} color={inStock ? '#fff' : COLORS.textLight} />
      </View>
    </TouchableOpacity>
  );
}

// ── Modal panier ───────────────────────────────────────────────────────────────
function CartModal({ visible, onClose, onCheckout }: {
  visible: boolean; onClose: () => void; onCheckout: () => void;
}) {
  const { items, removeItem, updateQty, total, clear } = useCartStore();

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>Panier ({items.length} articles)</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={COLORS.text} />
            </TouchableOpacity>
          </View>

          {items.length === 0 ? (
            <Text style={styles.emptyText}>Panier vide</Text>
          ) : (
            <>
              <ScrollView style={styles.cartList}>
                {items.map(item => (
                  <View key={item.variation_id} style={styles.cartItem}>
                    <View style={styles.cartItemInfo}>
                      <Text style={styles.cartItemName} numberOfLines={1}>{item.product_name}</Text>
                      <Text style={styles.cartItemPrice}>{fmt(item.unit_price)} FCFA</Text>
                    </View>
                    <View style={styles.qtyRow}>
                      <TouchableOpacity
                        style={styles.qtyBtn}
                        onPress={() => updateQty(item.variation_id, item.quantity - 1)}
                      >
                        <Ionicons name="remove" size={16} color={COLORS.text} />
                      </TouchableOpacity>
                      <Text style={styles.qtyText}>{item.quantity}</Text>
                      <TouchableOpacity
                        style={styles.qtyBtn}
                        onPress={() => updateQty(item.variation_id, item.quantity + 1)}
                      >
                        <Ionicons name="add" size={16} color={COLORS.text} />
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => removeItem(item.variation_id)} style={styles.deleteBtn}>
                        <Ionicons name="trash" size={16} color={COLORS.danger} />
                      </TouchableOpacity>
                    </View>
                    <Text style={styles.lineTotal}>{fmt((item.unit_price - item.discount) * item.quantity)} FCFA</Text>
                  </View>
                ))}
              </ScrollView>

              <View style={styles.cartFooter}>
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>Total</Text>
                  <Text style={styles.totalAmount}>{fmt(total())} FCFA</Text>
                </View>
                <TouchableOpacity style={styles.checkoutBtn} onPress={onCheckout}>
                  <Ionicons name="card" size={18} color="#fff" />
                  <Text style={styles.checkoutText}>Encaisser</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.clearBtn} onPress={() => { clear(); onClose(); }}>
                  <Text style={styles.clearText}>Vider le panier</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

// ── Modal paiement ─────────────────────────────────────────────────────────────
const PAYMENT_METHODS = [
  { key: 'cash',   label: 'Espèces',      icon: 'cash' as const },
  { key: 'wave',   label: 'Wave',         icon: 'phone-portrait' as const },
  { key: 'orange_money', label: 'Orange Money', icon: 'phone-portrait' as const },
  { key: 'card',   label: 'Carte',        icon: 'card' as const },
];

function PaymentModal({ visible, onClose, onConfirm, submitting }: {
  visible: boolean; onClose: () => void;
  onConfirm: (method: string) => void; submitting: boolean;
}) {
  const [method, setMethod] = useState('cash');
  const { total } = useCartStore();

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>Paiement</Text>
            <TouchableOpacity onPress={onClose} disabled={submitting}>
              <Ionicons name="close" size={24} color={COLORS.text} />
            </TouchableOpacity>
          </View>

          <Text style={styles.paymentTotal}>{fmt(total())} FCFA</Text>

          <Text style={styles.paymentLabel}>Mode de paiement</Text>
          <View style={styles.methodGrid}>
            {PAYMENT_METHODS.map(m => (
              <TouchableOpacity
                key={m.key}
                style={[styles.methodBtn, method === m.key && styles.methodBtnActive]}
                onPress={() => setMethod(m.key)}
              >
                <Ionicons name={m.icon} size={20} color={method === m.key ? '#fff' : COLORS.text} />
                <Text style={[styles.methodLabel, method === m.key && { color: '#fff' }]}>{m.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            style={[styles.confirmBtn, submitting && styles.btnDisabled]}
            onPress={() => onConfirm(method)}
            disabled={submitting}
          >
            {submitting
              ? <ActivityIndicator color="#fff" />
              : <>
                  <Ionicons name="checkmark-circle" size={20} color="#fff" />
                  <Text style={styles.confirmText}>Valider la vente</Text>
                </>
            }
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ── Écran principal POS ────────────────────────────────────────────────────────
export default function PosScreen() {
  const { currentLocationId, business } = useAuthStore();
  const { addItem, count, total, clear }  = useCartStore();

  const [products, setProducts]     = useState<Product[]>([]);
  const [search, setSearch]         = useState('');
  const [loading, setLoading]       = useState(false);
  const [hasMore, setHasMore]       = useState(false);
  const [page, setPage]             = useState(1);
  const [showCart, setShowCart]     = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async (reset = false) => {
    if (!currentLocationId) return;
    setLoading(true);
    try {
      const res = await searchProducts({
        location_id: currentLocationId,
        search: search || undefined,
        page: reset ? 1 : page,
      });
      setProducts(prev => reset ? res.products : [...prev, ...res.products]);
      setHasMore(res.has_more);
      if (reset) setPage(1);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [currentLocationId, search, page]);

  useEffect(() => { load(true); }, [currentLocationId]);

  const onSearch = () => { setPage(1); load(true); };
  const loadMore = () => { if (hasMore && !loading) { setPage(p => p + 1); load(); } };

  const handleAdd = (product: Product, variation: Product['variations'][0]) => {
    addItem({
      variation_id:   variation.id,
      product_name:   product.name,
      variation_name: variation.name,
      unit_price:     variation.price,
      quantity:       1,
      discount:       0,
    });
  };

  const handleConfirmPayment = async (method: string) => {
    const cartStore = useCartStore.getState();
    if (!currentLocationId) return;
    setSubmitting(true);
    try {
      const res = await createSale({
        location_id: currentLocationId,
        contact_id:  cartStore.contact_id ?? undefined,
        items: cartStore.items.map(i => ({
          variation_id: i.variation_id,
          quantity:     i.quantity,
          unit_price:   i.unit_price,
          discount:     i.discount,
        })),
        payments: [{ method, amount: cartStore.total() }],
        note: cartStore.note,
      });

      if (res.success) {
        setShowPayment(false);
        setShowCart(false);
        clear();
        Alert.alert('✅ Vente enregistrée', `Facture ${res.data.invoice_no}\n${fmt(res.data.total)} FCFA`);
      } else {
        Alert.alert('Erreur', res.message);
      }
    } catch (e: any) {
      Alert.alert('Erreur', e?.response?.data?.message ?? 'Vente échouée');
    } finally {
      setSubmitting(false);
    }
  };

  const cartCount = count();

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.topBar}>
        <Text style={styles.screenTitle}>Point de vente</Text>
        <TouchableOpacity style={styles.cartFab} onPress={() => setShowCart(true)}>
          <Ionicons name="cart" size={22} color="#fff" />
          {cartCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{cartCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.searchBar}>
        <Ionicons name="search" size={18} color={COLORS.textLight} style={{ marginRight: 8 }} />
        <TextInput
          style={styles.searchInput}
          placeholder="Rechercher un produit, SKU..."
          placeholderTextColor={COLORS.textLight}
          value={search}
          onChangeText={setSearch}
          onSubmitEditing={onSearch}
          returnKeyType="search"
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => { setSearch(''); load(true); }}>
            <Ionicons name="close-circle" size={18} color={COLORS.textLight} />
          </TouchableOpacity>
        )}
      </View>

      {loading && products.length === 0 ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <FlatList
          data={products}
          keyExtractor={item => String(item.id)}
          contentContainerStyle={styles.list}
          numColumns={2}
          columnWrapperStyle={styles.row}
          onEndReached={loadMore}
          onEndReachedThreshold={0.3}
          ListFooterComponent={loading ? <ActivityIndicator color={COLORS.primary} style={{ marginVertical: 16 }} /> : null}
          ListEmptyComponent={<Text style={styles.emptyText}>Aucun produit trouvé</Text>}
          renderItem={({ item }) => (
            <ProductCard product={item} onAdd={(v) => handleAdd(item, v)} />
          )}
        />
      )}

      {cartCount > 0 && (
        <TouchableOpacity style={styles.floatingCart} onPress={() => setShowCart(true)} activeOpacity={0.9}>
          <Ionicons name="cart" size={20} color="#fff" />
          <Text style={styles.floatingCartText}>{cartCount} article(s) — {fmt(total())} FCFA</Text>
          <Ionicons name="chevron-up" size={18} color="#fff" />
        </TouchableOpacity>
      )}

      <CartModal
        visible={showCart}
        onClose={() => setShowCart(false)}
        onCheckout={() => { setShowCart(false); setShowPayment(true); }}
      />
      <PaymentModal
        visible={showPayment}
        onClose={() => setShowPayment(false)}
        onConfirm={handleConfirmPayment}
        submitting={submitting}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:        { flex: 1, backgroundColor: COLORS.background },
  topBar:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: COLORS.gray200 },
  screenTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  cartFab:     { backgroundColor: COLORS.primary, borderRadius: 20, padding: 8, position: 'relative' },
  badge:       { position: 'absolute', top: -4, right: -4, backgroundColor: COLORS.danger, borderRadius: 9, minWidth: 18, height: 18, justifyContent: 'center', alignItems: 'center' },
  badgeText:   { color: '#fff', fontSize: 10, fontWeight: '700' },
  center:      { flex: 1, justifyContent: 'center', alignItems: 'center' },
  searchBar:   { flexDirection: 'row', alignItems: 'center', margin: SPACING.md, backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 12, borderWidth: 1, borderColor: COLORS.gray200 },
  searchInput: { flex: 1, height: 44, fontSize: 14, color: COLORS.text },
  list:        { padding: SPACING.md, paddingBottom: 100 },
  row:         { gap: SPACING.sm, marginBottom: SPACING.sm },
  productCard: { flex: 1, backgroundColor: '#fff', borderRadius: 14, padding: SPACING.md, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, elevation: 2, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  productCardOut: { opacity: 0.5 },
  productInfo: { flex: 1, marginRight: 8 },
  productName: { fontSize: 13, fontWeight: '600', color: COLORS.text },
  variationName: { fontSize: 11, color: COLORS.textLight, marginTop: 2 },
  productPrice: { fontSize: 14, fontWeight: '700', color: COLORS.primary, marginTop: 4 },
  stockText:   { fontSize: 11, marginTop: 2 },
  addBtn:      { backgroundColor: COLORS.primary, borderRadius: 10, padding: 6 },
  emptyText:   { textAlign: 'center', color: COLORS.textLight, marginTop: 60 },
  floatingCart:{ position: 'absolute', bottom: 16, left: 16, right: 16, backgroundColor: COLORS.primary, borderRadius: 16, flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.lg, paddingVertical: 14, gap: 10, elevation: 8, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 10 },
  floatingCartText: { flex: 1, color: '#fff', fontWeight: '700', fontSize: 14 },
  // Modals
  overlay:     { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet:       { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '90%', padding: SPACING.lg },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.md },
  sheetTitle:  { fontSize: 18, fontWeight: '700', color: COLORS.text },
  cartList:    { maxHeight: 350 },
  cartItem:    { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: COLORS.gray100, gap: 8 },
  cartItemInfo:{ flex: 1 },
  cartItemName:{ fontSize: 13, fontWeight: '600', color: COLORS.text },
  cartItemPrice:{ fontSize: 12, color: COLORS.textLight },
  qtyRow:      { flexDirection: 'row', alignItems: 'center', gap: 6 },
  qtyBtn:      { backgroundColor: COLORS.gray100, borderRadius: 6, padding: 4 },
  qtyText:     { fontSize: 14, fontWeight: '700', color: COLORS.text, minWidth: 20, textAlign: 'center' },
  deleteBtn:   { padding: 4 },
  lineTotal:   { fontSize: 13, fontWeight: '700', color: COLORS.text, minWidth: 80, textAlign: 'right' },
  cartFooter:  { marginTop: SPACING.md, gap: SPACING.sm },
  totalRow:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: SPACING.sm },
  totalLabel:  { fontSize: 16, fontWeight: '600', color: COLORS.text },
  totalAmount: { fontSize: 20, fontWeight: '800', color: COLORS.text },
  checkoutBtn: { backgroundColor: COLORS.primary, borderRadius: 14, padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  checkoutText:{ color: '#fff', fontWeight: '700', fontSize: 16 },
  clearBtn:    { alignItems: 'center', padding: 10 },
  clearText:   { color: COLORS.danger, fontWeight: '600' },
  // Payment
  paymentTotal:{ fontSize: 32, fontWeight: '800', color: COLORS.text, textAlign: 'center', marginVertical: SPACING.lg },
  paymentLabel:{ fontSize: 13, fontWeight: '600', color: COLORS.textLight, marginBottom: SPACING.sm },
  methodGrid:  { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm, marginBottom: SPACING.lg },
  methodBtn:   { flex: 1, minWidth: '45%', backgroundColor: COLORS.gray100, borderRadius: 12, padding: SPACING.md, alignItems: 'center', gap: 6 },
  methodBtnActive: { backgroundColor: COLORS.primary },
  methodLabel: { fontSize: 13, fontWeight: '600', color: COLORS.text },
  confirmBtn:  { backgroundColor: COLORS.success, borderRadius: 14, padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: SPACING.xl },
  confirmText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  btnDisabled: { opacity: 0.6 },
});
