import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ScrollView, FlatList, ActivityIndicator, Alert,
  Modal, Platform, Image, KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import QRCode from 'react-native-qrcode-svg';
import { Linking } from 'react-native';
import { useAuthStore } from '../../store/authStore';
import { useCartStore, CartItem } from '../../store/cartStore';
import { searchProducts, fetchCategories, createSale, fetchPaymentMethods, fetchContacts, fetchSettings, PaymentMethod, Contact } from '../../api/pos';
import { Product, Category } from '../../types';
import { C, fcfa } from '../../constants';

const PROD_COLORS = ['#FDE68A','#FECACA','#FBCFE8','#C7F0D9','#BFDBFE','#FED7AA','#DDD6FE','#A7F3D0','#FDE68A'];
const PROD_EMOJIS = ['📦','🥤','🍬','☕','🥛','🍞','🧼','🥚','🛢️'];

function fmt(n: number) {
  return Math.round(n).toLocaleString('fr-FR').replace(/\s/g, ' ') + ' F';
}

const FALLBACK_PAYMENT_METHODS: PaymentMethod[] = [
  { key: 'cash', label: 'Espèces', enabled: true },
  { key: 'card', label: 'Carte',   enabled: true },
];

// ── Modal paiement ─────────────────────────────────────────
function PaymentModal({ visible, onClose, onConfirm, submitting, paymentMethods, wavePaymentLink }: {
  visible: boolean; onClose: () => void;
  onConfirm: (method: string) => void; submitting: boolean;
  paymentMethods: PaymentMethod[];
  wavePaymentLink?: string | null;
}) {
  const methods = paymentMethods.length > 0 ? paymentMethods : FALLBACK_PAYMENT_METHODS;
  const [method, setMethod]     = useState(methods[0]?.key ?? 'cash');
  const [showWave, setShowWave] = useState(false);
  const { total } = useCartStore();

  useEffect(() => {
    if (methods.length > 0 && !methods.find(m => m.key === method)) {
      setMethod(methods[0].key);
    }
  }, [methods]);

  // Détecter si la méthode sélectionnée est Wave (label contient "wave", insensible à la casse)
  const selectedMethodObj = methods.find(m => m.key === method);
  const isWave = !!wavePaymentLink && !!selectedMethodObj?.label.toLowerCase().includes('wave');

  const handleConfirm = () => {
    console.log('[WAVE] method:', method, 'label:', selectedMethodObj?.label, 'isWave:', isWave, 'link:', wavePaymentLink);
    if (isWave) {
      setShowWave(true);
    } else {
      onConfirm(method);
    }
  };

  return (
    <>
      <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
        <View style={pm.overlay}>
          <View style={pm.sheet}>
            <View style={pm.grabber} />
            <View style={pm.header}>
              <Text style={pm.title}>Paiement</Text>
              <TouchableOpacity onPress={onClose} disabled={submitting} style={pm.closeBtn}>
                <Ionicons name="close" size={22} color={C.text2} />
              </TouchableOpacity>
            </View>

            <Text style={pm.totalAmt}>{fmt(total())}</Text>
            <Text style={pm.totalLabel}>Montant à encaisser</Text>

            <Text style={pm.methodLabel}>Mode de paiement</Text>
            <View style={pm.methodGrid}>
              {methods.map(m => {
                const on = method === m.key;
                const icon = m.key === 'cash' ? 'cash-outline' : m.key === 'card' ? 'card-outline' : 'phone-portrait-outline';
                return (
                  <TouchableOpacity
                    key={m.key}
                    style={[pm.methodBtn, on && pm.methodBtnOn]}
                    onPress={() => setMethod(m.key)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name={icon as any} size={22} color={on ? '#fff' : C.secondary} />
                    <Text style={[pm.methodText, on && { color: '#fff' }]}>{m.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity
              style={[pm.confirmBtn, submitting && { opacity: 0.6 }]}
              onPress={handleConfirm}
              disabled={submitting}
              activeOpacity={0.85}
            >
              {submitting ? <ActivityIndicator color="#fff" /> : (
                <>
                  <Ionicons name={isWave ? 'qr-code-outline' : 'checkmark'} size={20} color="#fff" />
                  <Text style={pm.confirmText}>{isWave ? 'Générer QR Wave' : 'Valider la vente'}</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {showWave && wavePaymentLink && (
        <WaveQrModal
          visible={showWave}
          amount={total()}
          waveLink={wavePaymentLink}
          submitting={submitting}
          onClose={() => setShowWave(false)}
          onConfirm={() => { setShowWave(false); onConfirm(method); }}
        />
      )}
    </>
  );
}

// ── Modal Wave QR paiement ────────────────────────────────
function WaveQrModal({ visible, amount, waveLink, onConfirm, onClose, submitting }: {
  visible: boolean;
  amount: number;
  waveLink: string;
  onConfirm: () => void;
  onClose: () => void;
  submitting: boolean;
}) {
  // Remplacer le montant dans l'URL Wave : ?amount=XXX
  const waveUrl = waveLink.replace(/[?&]amount=[^&]*/i, '').replace(/\?$/, '')
    + (waveLink.includes('?') ? '&' : '?') + `amount=${Math.round(amount)}`;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={wv.overlay}>
        <View style={wv.sheet}>
          <View style={wv.grabber} />

          {/* En-tête Wave */}
          <View style={wv.header}>
            <TouchableOpacity onPress={onClose} disabled={submitting} style={wv.closeBtn}>
              <Ionicons name="close" size={22} color="rgba(255,255,255,0.8)" />
            </TouchableOpacity>
            <Text style={wv.subtitle}>Payez avec</Text>
            <Text style={wv.waveLogo}>wave</Text>
            <Text style={wv.amtLabel}>Montant à payer</Text>
            <Text style={wv.amtValue}>{fmt(amount)}</Text>
          </View>

          {/* QR Code */}
          <View style={wv.qrWrap}>
            <View style={wv.qrBox}>
              <QRCode value={waveUrl} size={180} />
            </View>
            <Text style={wv.qrHint}>Scannez avec votre app Wave</Text>
          </View>

          {/* Boutons */}
          <View style={wv.actions}>
            <TouchableOpacity
              style={wv.linkBtn}
              onPress={() => Linking.openURL(waveUrl)}
            >
              <Ionicons name="open-outline" size={16} color="#1AC8F5" />
              <Text style={wv.linkText}>Ouvrir Wave</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[wv.confirmBtn, submitting && { opacity: 0.6 }]}
              onPress={onConfirm}
              disabled={submitting}
            >
              {submitting
                ? <ActivityIndicator color="#1AC8F5" />
                : <Text style={wv.confirmText}>✓ Paiement reçu — Valider</Text>
              }
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ── Scanner code-barres ───────────────────────────────────
function BarcodeScannerModal({ visible, onScanned, onClose }: {
  visible: boolean;
  onScanned: (code: string) => void;
  onClose: () => void;
}) {
  const [permission, requestPermission] = useCameraPermissions();
  const scanned = React.useRef(false);

  useEffect(() => {
    if (visible) {
      scanned.current = false;
      if (!permission?.granted) requestPermission();
    }
  }, [visible]);

  if (!visible) return null;

  if (!permission?.granted) {
    return (
      <Modal visible animationType="slide" onRequestClose={onClose}>
        <SafeAreaView style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
          <Ionicons name="camera-outline" size={64} color={C.muted} />
          <Text style={{ fontSize: 16, color: C.text, textAlign: 'center', marginTop: 16, marginBottom: 24 }}>
            Autorisez l'accès à la caméra pour scanner les codes-barres.
          </Text>
          <TouchableOpacity
            style={{ backgroundColor: C.primary, paddingHorizontal: 28, paddingVertical: 14, borderRadius: 14 }}
            onPress={requestPermission}
          >
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>Autoriser</Text>
          </TouchableOpacity>
          <TouchableOpacity style={{ marginTop: 16 }} onPress={onClose}>
            <Text style={{ color: C.muted, fontSize: 14 }}>Annuler</Text>
          </TouchableOpacity>
        </SafeAreaView>
      </Modal>
    );
  }

  return (
    <Modal visible animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: '#000' }}>
        <CameraView
          style={{ flex: 1 }}
          facing="back"
          barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'code128', 'code39', 'qr', 'upc_a', 'upc_e'] }}
          onBarcodeScanned={({ data }) => {
            if (scanned.current) return;
            scanned.current = true;
            onScanned(data);
            onClose();
          }}
        />
        {/* Viseur */}
        <View style={sc.overlay}>
          <View style={sc.frame} />
          <Text style={sc.hint}>Pointez vers un code-barres</Text>
        </View>
        {/* Bouton fermer */}
        <SafeAreaView style={sc.closeWrap} edges={['top']}>
          <TouchableOpacity style={sc.closeBtn} onPress={onClose}>
            <Ionicons name="close" size={26} color="#fff" />
          </TouchableOpacity>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

// ── Modal sélection client ────────────────────────────────
function ContactPickerModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { setContact, contact_id } = useCartStore();
  const [search, setSearch]       = useState('');
  const [contacts, setContacts]   = useState<Contact[]>([]);
  const [loading, setLoading]     = useState(false);

  useEffect(() => {
    if (!visible) return;
    setLoading(true);
    fetchContacts(search).then(setContacts).catch(() => {}).finally(() => setLoading(false));
  }, [visible, search]);

  const select = (c: Contact | null) => {
    setContact(c?.id ?? null, c?.name ?? null);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }} edges={['top', 'bottom']}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          {/* Header */}
          <View style={cp.header}>
            <TouchableOpacity onPress={onClose} style={cp.backBtn}>
              <Ionicons name="arrow-back" size={22} color={C.text} />
            </TouchableOpacity>
            <Text style={cp.title}>Choisir un client</Text>
            <View style={{ width: 36 }} />
          </View>

          {/* Barre de recherche */}
          <View style={cp.searchWrap}>
            <Ionicons name="search-outline" size={18} color={C.muted} />
            <TextInput
              style={cp.searchInput}
              placeholder="Nom, téléphone…"
              placeholderTextColor={C.muted}
              value={search}
              onChangeText={setSearch}
              autoFocus
              returnKeyType="search"
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch('')}>
                <Ionicons name="close-circle" size={18} color={C.muted} />
              </TouchableOpacity>
            )}
          </View>

          {/* Liste */}
          {loading ? (
            <ActivityIndicator style={{ marginTop: 40 }} color={C.primary} />
          ) : (
            <FlatList
              data={[null, ...contacts]}
              keyExtractor={c => c ? String(c.id) : 'walkin'}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ paddingHorizontal: 16 }}
              renderItem={({ item }) => {
                const isWalkin = item === null;
                const selected = isWalkin ? !contact_id : contact_id === item!.id;
                return (
                  <TouchableOpacity
                    style={[cp.row, selected && cp.rowOn]}
                    onPress={() => select(isWalkin ? null : item)}
                  >
                    <View style={[cp.avatar, isWalkin && cp.avatarGrey]}>
                      {isWalkin
                        ? <Ionicons name="person-outline" size={18} color={C.text2} />
                        : <Text style={cp.avatarText}>{item!.name.charAt(0).toUpperCase()}</Text>
                      }
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={cp.rowName} numberOfLines={1}>
                        {isWalkin ? 'Client de passage' : item!.name}
                      </Text>
                      <Text style={cp.rowSub}>
                        {isWalkin ? 'Vente sans client enregistré' : (item!.mobile ?? '')}
                      </Text>
                    </View>
                    {selected && <Ionicons name="checkmark-circle" size={22} color={C.primary} />}
                  </TouchableOpacity>
                );
              }}
              ListEmptyComponent={<Text style={cp.empty}>Aucun client trouvé</Text>}
            />
          )}
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

// ── Modal édition ligne panier ────────────────────────────
function CartEditModal({ item, onClose }: {
  item: CartItem | null;
  onClose: () => void;
}) {
  const { updateQty, updatePrice, updateDiscount, removeItem } = useCartStore();

  const [price, setPrice]       = useState('');
  const [discount, setDiscount] = useState('');
  const [qty, setQty]           = useState('');

  useEffect(() => {
    if (item) {
      setPrice(String(item.unit_price));
      setDiscount(String(item.discount));
      setQty(String(item.quantity));
    }
  }, [item]);

  if (!item) return null;

  const lineTotal = (parseFloat(price) || 0) * (parseFloat(qty) || 0) - (parseFloat(discount) || 0);

  const handleSave = () => {
    const p = parseFloat(price);
    const d = parseFloat(discount);
    const q = parseInt(qty, 10);
    if (!isNaN(p) && p >= 0) updatePrice(item.variation_id, p);
    if (!isNaN(d) && d >= 0) updateDiscount(item.variation_id, d);
    if (!isNaN(q) && q > 0)  updateQty(item.variation_id, q);
    onClose();
  };

  return (
    <Modal visible={!!item} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={ce.overlay}>
        <View style={ce.sheet}>
          <View style={ce.grabber} />
          <View style={ce.header}>
            <View style={{ flex: 1 }}>
              <Text style={ce.title} numberOfLines={1}>{item.product_name}</Text>
              {item.variation_name && item.variation_name !== 'Default' && (
                <Text style={ce.sub}>{item.variation_name}</Text>
              )}
            </View>
            <TouchableOpacity onPress={onClose} style={ce.closeBtn}>
              <Ionicons name="close" size={22} color={C.text2} />
            </TouchableOpacity>
          </View>

          <View style={ce.fields}>
            {/* Prix unitaire */}
            <View style={ce.fieldRow}>
              <Text style={ce.fieldLabel}>Prix unitaire</Text>
              <TextInput
                style={ce.fieldInput}
                value={price}
                onChangeText={setPrice}
                keyboardType="numeric"
                selectTextOnFocus
              />
            </View>

            {/* Remise (montant fixe) */}
            <View style={ce.fieldRow}>
              <Text style={ce.fieldLabel}>Remise (F)</Text>
              <TextInput
                style={ce.fieldInput}
                value={discount}
                onChangeText={setDiscount}
                keyboardType="numeric"
                selectTextOnFocus
              />
            </View>

            {/* Quantité */}
            <View style={ce.fieldRow}>
              <Text style={ce.fieldLabel}>Quantité</Text>
              <View style={ce.qtyRow}>
                <TouchableOpacity style={ce.qtyBtn} onPress={() => setQty(q => String(Math.max(1, (parseInt(q) || 1) - 1)))}>
                  <Ionicons name="remove" size={18} color={C.text} />
                </TouchableOpacity>
                <TextInput
                  style={[ce.fieldInput, { flex: 1, textAlign: 'center' }]}
                  value={qty}
                  onChangeText={setQty}
                  keyboardType="numeric"
                  selectTextOnFocus
                />
                <TouchableOpacity style={ce.qtyBtn} onPress={() => setQty(q => String((parseInt(q) || 0) + 1))}>
                  <Ionicons name="add" size={18} color={C.text} />
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Sous-total */}
          <View style={ce.totalRow}>
            <Text style={ce.totalLabel}>Sous-total</Text>
            <Text style={ce.totalAmt}>{fmt(Math.max(0, lineTotal))}</Text>
          </View>

          {/* Actions */}
          <View style={ce.actions}>
            <TouchableOpacity style={ce.deleteBtn} onPress={() => { removeItem(item.variation_id); onClose(); }}>
              <Ionicons name="trash-outline" size={18} color="#EF4444" />
              <Text style={ce.deleteText}>Supprimer</Text>
            </TouchableOpacity>
            <TouchableOpacity style={ce.saveBtn} onPress={handleSave}>
              <Text style={ce.saveText}>Appliquer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ── Carte produit ──────────────────────────────────────────
function ProductCard({ item, index, inCart, onPress }: {
  item: Product; index: number;
  inCart: { quantity: number } | undefined;
  onPress: () => void;
}) {
  const [imgError, setImgError] = React.useState(false);
  const v          = item.variations[0];
  const low        = item.enable_stock && v.stock < 10;
  const color      = PROD_COLORS[index % PROD_COLORS.length];
  const emoji      = PROD_EMOJIS[index % PROD_EMOJIS.length];
  const showImage  = !!item.image && !imgError;

  return (
    <TouchableOpacity
      style={[s.prodCard, inCart && s.prodCardIn]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <View style={[s.prodImgWrap, { backgroundColor: showImage ? '#F3F4F6' : color }]}>
        {showImage ? (
          <Image
            source={{ uri: item.image! }}
            style={s.prodImgFill}
            resizeMode="cover"
            onError={(e) => {
              console.warn('[IMG_ERROR]', item.image, e.nativeEvent.error);
              setImgError(true);
            }}
          />
        ) : (
          <View style={s.prodImg}>
            <Text style={s.prodEmoji}>{emoji}</Text>
          </View>
        )}
        {low && (
          <View style={s.lowBadge}>
            <Text style={s.lowText}>STOCK {v.stock}</Text>
          </View>
        )}
        {inCart && (
          <View style={[s.cartBadge, { top: 6, right: 6 }]}>
            <Text style={s.cartBadgeText}>{inCart.quantity}</Text>
          </View>
        )}
      </View>
      <View style={s.prodInfo}>
        <Text style={s.prodName} numberOfLines={2}>{item.name}</Text>
        <Text style={s.prodPrice}>{fmt(v.price)}</Text>
      </View>
    </TouchableOpacity>
  );
}

// ── Écran POS ──────────────────────────────────────────────
export default function PosScreen() {
  const { currentLocationId, user } = useAuthStore();
  const { addItem, items, updateQty, count, total, clear, contact_name } = useCartStore();

  const [products, setProducts]             = useState<Product[]>([]);
  const [categories, setCategories]         = useState<Category[]>([]);
  const [paymentMethods, setPaymentMethods]   = useState<PaymentMethod[]>([]);
  const [wavePaymentLink, setWavePaymentLink] = useState<string | null>(null);
  const [search, setSearch]                 = useState('');
  const [categoryId, setCategoryId]         = useState<number | null>(null);
  const [loading, setLoading]               = useState(false);
  const [showPayment, setShowPayment]       = useState(false);
  const [submitting, setSubmitting]         = useState(false);
  const [editItem, setEditItem]             = useState<CartItem | null>(null);
  const [showContacts, setShowContacts]     = useState(false);
  const [showScanner, setShowScanner]       = useState(false);

  useEffect(() => {
    fetchCategories().then(setCategories).catch(() => {});
  }, []);

  useEffect(() => {
    if (!currentLocationId) return;
    fetchPaymentMethods(currentLocationId).then(setPaymentMethods).catch(() => {});
  }, [currentLocationId]);

  useEffect(() => {
    fetchSettings()
      .then(s => {
        console.log('[WAVE] wave_payment_link:', s.wave_payment_link ?? 'null');
        setWavePaymentLink(s.wave_payment_link ?? null);
      })
      .catch(e => console.warn('[WAVE] fetchSettings error:', e?.message));
  }, []);

  const load = useCallback(async () => {
    if (!currentLocationId) return;
    setLoading(true);
    try {
      const res = await searchProducts({
        location_id: currentLocationId,
        search:      search || undefined,
        category_id: categoryId ?? undefined,
        page:        1,
      });
      setProducts(res.products);
    } catch {}
    finally { setLoading(false); }
  }, [currentLocationId, search, categoryId]);

  useEffect(() => { load(); }, [currentLocationId, categoryId]);

  const handleAdd = (product: Product) => {
    const v = product.variations[0];
    const existing = items.find(i => i.variation_id === v.id);
    if (existing) {
      updateQty(v.id, existing.quantity + 1);
    } else {
      addItem({
        variation_id:   v.id,
        product_name:   product.name,
        variation_name: v.name,
        unit_price:     v.price,
        quantity:       1,
        discount:       0,
      });
    }
  };

  const handleDec = (variationId: number) => {
    const item = items.find(i => i.variation_id === variationId);
    if (item) updateQty(variationId, item.quantity - 1);
  };

  const handleConfirmPayment = async (method: string) => {
    if (!currentLocationId) return;
    setSubmitting(true);
    try {
      const cartStore = useCartStore.getState();
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
        clear();
        Alert.alert('✅ Vente enregistrée', `Facture ${res.data.invoice_no}\n${fmt(res.data.total)}`);
      } else {
        Alert.alert('Erreur', res.message);
      }
    } catch (e: any) {
      Alert.alert('Erreur', e?.response?.data?.message ?? 'Vente échouée');
    } finally {
      setSubmitting(false);
    }
  };

  const cartCount  = count();
  const cartTotal  = total();
  const now = new Date();
  const timeStr = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

  return (
    <View style={s.root}>
      {/* Header */}
      <SafeAreaView edges={['top']} style={{ backgroundColor: '#fff' }}>
        <View style={s.header}>
          <View>
            <Text style={s.headerTitle}>Nouvelle vente</Text>
            <Text style={s.headerSub}>
              Caisse · {user?.name?.split(' ')[0] ?? 'Caissier'} · {timeStr}
            </Text>
          </View>
          <TouchableOpacity style={s.clientBtn} onPress={() => setShowContacts(true)} activeOpacity={0.75}>
            <Ionicons name="person-outline" size={14} color={contact_name ? C.primary : C.text2} />
            <Text style={[s.clientBtnText, contact_name && { color: C.primary }]} numberOfLines={1}>
              {contact_name ?? 'Client'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Search bar */}
        <View style={s.searchWrap}>
          <Ionicons name="search-outline" size={18} color={C.muted} />
          <TextInput
            style={s.searchInput}
            placeholder="Rechercher un produit ou code-barres…"
            placeholderTextColor={C.muted}
            value={search}
            onChangeText={setSearch}
            onSubmitEditing={load}
            returnKeyType="search"
          />
          <TouchableOpacity
            style={s.scanChip}
            onPress={() => setShowScanner(true)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="barcode-outline" size={20} color={C.secondary} />
          </TouchableOpacity>
        </View>

        {/* Category chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.catScroll}
        >
          {[{ id: null, name: 'Tout' }, ...categories].map(c => {
            const on = categoryId === c.id;
            return (
              <TouchableOpacity
                key={String(c.id)}
                onPress={() => { setCategoryId(c.id); setLoading(true); }}
                style={[s.catChip, on && s.catChipOn]}
                activeOpacity={0.8}
              >
                <Text style={[s.catChipText, on && s.catChipTextOn]}>{c.name}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </SafeAreaView>

      {/* Product grid */}
      {loading && products.length === 0 ? (
        <View style={s.center}>
          <ActivityIndicator size="large" color={C.primary} />
        </View>
      ) : (
        <FlatList
          data={products}
          keyExtractor={item => String(item.id)}
          numColumns={3}
          contentContainerStyle={[s.grid, cartCount > 0 && { paddingBottom: 200 }]}
          columnWrapperStyle={s.gridRow}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <Text style={s.empty}>Aucun produit trouvé</Text>
          }
          renderItem={({ item, index }) => (
            <ProductCard
              item={item}
              index={index}
              inCart={items.find(i => i.variation_id === item.variations[0].id)}
              onPress={() => handleAdd(item)}
            />
          )}
        />
      )}

      {/* Cart drawer — sticky bottom */}
      {cartCount > 0 && (
        <View style={s.cartDrawer}>
          <View style={s.grabber} />

          {/* Cart items mini-list */}
          <ScrollView style={s.cartList} showsVerticalScrollIndicator={false}>
            {items.map(item => (
              <TouchableOpacity
                key={item.variation_id}
                style={s.cartRow}
                onPress={() => setEditItem(item)}
                activeOpacity={0.7}
              >
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={s.cartItemName} numberOfLines={1}>{item.product_name}</Text>
                  <Text style={s.cartItemSub}>
                    {fmt(item.unit_price)}{item.discount > 0 ? ` - ${fmt(item.discount)}` : ''} × {item.quantity}
                  </Text>
                </View>
                <View style={s.qtyWrap}>
                  <TouchableOpacity style={s.qtyBtn} onPress={() => handleDec(item.variation_id)}>
                    <Ionicons name="remove" size={14} color={C.text2} />
                  </TouchableOpacity>
                  <Text style={s.qtyNum}>{item.quantity}</Text>
                  <TouchableOpacity style={s.qtyBtn} onPress={() => {
                    const ex = items.find(i => i.variation_id === item.variation_id);
                    if (ex) updateQty(item.variation_id, ex.quantity + 1);
                  }}>
                    <Ionicons name="add" size={14} color={C.text2} />
                  </TouchableOpacity>
                </View>
                <Text style={s.cartLineTotal}>{fmt((item.unit_price - item.discount) * item.quantity)}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Total + CTA */}
          <View style={s.cartFooter}>
            <View>
              <Text style={s.cartItemCount}>{cartCount} article{cartCount > 1 ? 's' : ''}</Text>
              <Text style={s.cartTotal}>{fmt(cartTotal)}</Text>
            </View>
            <TouchableOpacity
              style={s.encaisserBtn}
              onPress={() => setShowPayment(true)}
              activeOpacity={0.85}
            >
              <Text style={s.encaisserText}>Encaisser</Text>
              <Ionicons name="chevron-forward" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      )}

      <PaymentModal
        visible={showPayment}
        onClose={() => setShowPayment(false)}
        onConfirm={handleConfirmPayment}
        submitting={submitting}
        paymentMethods={paymentMethods}
        wavePaymentLink={wavePaymentLink}
      />

      <CartEditModal
        item={editItem}
        onClose={() => setEditItem(null)}
      />

      <ContactPickerModal
        visible={showContacts}
        onClose={() => setShowContacts(false)}
      />

      <BarcodeScannerModal
        visible={showScanner}
        onClose={() => setShowScanner(false)}
        onScanned={async (code) => {
          try {
            const res = await searchProducts({ location_id: currentLocationId!, search: code, page: 1 });
            if (res.products.length === 1) {
              // Produit unique trouvé → ajout direct au panier
              handleAdd(res.products[0]);
            } else if (res.products.length > 1) {
              // Plusieurs résultats → afficher dans la recherche
              setSearch(code);
              setProducts(res.products);
            } else {
              Alert.alert('Produit introuvable', `Aucun produit trouvé pour le code : ${code}`);
            }
          } catch {
            Alert.alert('Erreur', 'Impossible de rechercher ce produit.');
          }
        }}
      />
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },

  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12,
    backgroundColor: '#fff',
  },
  headerTitle: { fontSize: 19, fontWeight: '800', color: C.text, letterSpacing: -0.4 },
  headerSub:   { fontSize: 12, color: C.muted, marginTop: 1 },
  clientBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20,
    backgroundColor: C.bg, borderWidth: 1.5, borderColor: C.border,
    maxWidth: 140,
  },
  clientBtnText: { fontSize: 13, fontWeight: '600', color: C.text2, flexShrink: 1 },

  searchWrap: {
    flexDirection: 'row', alignItems: 'center',
    height: 44, borderRadius: 12, backgroundColor: C.bg,
    borderWidth: 1, borderColor: C.border,
    marginHorizontal: 16, paddingHorizontal: 12, gap: 8,
    marginBottom: 12,
  },
  searchInput: { flex: 1, fontSize: 14, color: C.text },
  scanChip: {
    width: 38, height: 38, borderRadius: 10, backgroundColor: C.primarySoft,
    alignItems: 'center', justifyContent: 'center',
  },

  catScroll: { paddingHorizontal: 16, paddingBottom: 12, gap: 8 },
  catChip: {
    height: 34, paddingHorizontal: 14, borderRadius: 10,
    backgroundColor: '#fff', borderWidth: 1, borderColor: C.border,
    alignItems: 'center', justifyContent: 'center',
  },
  catChipOn:     { backgroundColor: C.text, borderWidth: 0 },
  catChipText:   { fontSize: 13, fontWeight: '600', color: C.text2 },
  catChipTextOn: { color: '#fff' },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  grid:    { padding: 14, paddingBottom: 20 },
  gridRow: { gap: 10, marginBottom: 10 },
  empty:   { textAlign: 'center', color: C.muted, marginTop: 60 },

  prodCard: {
    flex: 1, backgroundColor: '#fff', borderRadius: 14,
    borderWidth: 1, borderColor: C.border, overflow: 'hidden',
  },
  prodCardIn: { borderWidth: 1.5, borderColor: C.primary },
  prodImgWrap: {
    width: '100%', aspectRatio: 1,
  },
  prodImgFill: {
    flex: 1, width: '100%',
  },
  prodImg: {
    flex: 1, width: '100%',
    alignItems: 'center', justifyContent: 'center',
  },
  prodEmoji: { fontSize: 34 },
  lowBadge: {
    position: 'absolute', top: 6, left: 6,
    backgroundColor: C.danger, borderRadius: 5,
    paddingHorizontal: 5, paddingVertical: 2,
  },
  lowText: { fontSize: 9, fontWeight: '700', color: '#fff' },
  cartBadge: {
    position: 'absolute', top: 6, right: 6,
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: C.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  cartBadgeText: { fontSize: 12, fontWeight: '700', color: '#fff' },
  prodInfo: { padding: 8, paddingTop: 6 },
  prodName: { fontSize: 11.5, fontWeight: '600', color: C.text, lineHeight: 15, minHeight: 30 },
  prodPrice: { fontSize: 12.5, fontWeight: '700', color: C.secondary, marginTop: 3 },

  // Cart drawer
  cartDrawer: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    backgroundColor: '#fff',
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    borderTopWidth: 1, borderColor: C.border,
    shadowColor: '#000', shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.08, shadowRadius: 24, elevation: 20,
    paddingBottom: Platform.OS === 'ios' ? 26 : 12,
  },
  grabber: {
    width: 36, height: 4, borderRadius: 2, backgroundColor: C.border,
    alignSelf: 'center', marginTop: 8, marginBottom: 4,
  },
  cartList: { paddingHorizontal: 16, maxHeight: 86 },
  cartRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 6,
  },
  cartItemName: { fontSize: 13, fontWeight: '600', color: C.text },
  cartItemSub:  { fontSize: 11.5, color: C.muted, fontWeight: '500' },
  qtyWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: C.bg, borderRadius: 9, padding: 3,
  },
  qtyBtn: {
    width: 26, height: 26, borderRadius: 7,
    backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 2, elevation: 1,
  },
  qtyNum: { fontSize: 13, fontWeight: '700', minWidth: 16, textAlign: 'center', color: C.text },
  cartLineTotal: { fontSize: 13, fontWeight: '700', color: C.text, minWidth: 64, textAlign: 'right' },

  cartFooter: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingTop: 10, paddingBottom: 12,
    borderTopWidth: 1, borderTopColor: C.borderL, marginTop: 8,
  },
  cartItemCount: { fontSize: 11.5, color: C.muted, fontWeight: '500' },
  cartTotal:     { fontSize: 22, fontWeight: '800', color: C.text, letterSpacing: -0.6, lineHeight: 25 },
  encaisserBtn: {
    flex: 1, height: 54, borderRadius: 14, backgroundColor: C.primary,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    shadowColor: C.primary, shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35, shadowRadius: 14, elevation: 8,
  },
  encaisserText: { fontSize: 16, fontWeight: '700', color: '#fff' },

});

// Payment modal styles
const pm = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 20, paddingBottom: Platform.OS === 'ios' ? 36 : 24,
  },
  grabber: {
    width: 36, height: 4, borderRadius: 2, backgroundColor: C.border,
    alignSelf: 'center', marginTop: 10, marginBottom: 4,
  },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 4,
  },
  title:    { fontSize: 18, fontWeight: '700', color: C.text },
  closeBtn: { padding: 6 },
  totalAmt: { fontSize: 34, fontWeight: '800', color: C.text, letterSpacing: -1, textAlign: 'center', marginTop: 8 },
  totalLabel: { fontSize: 13, color: C.muted, textAlign: 'center', marginBottom: 20 },
  methodLabel: { fontSize: 12.5, fontWeight: '600', color: C.text2, marginBottom: 10, letterSpacing: 0.2 },
  methodGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
  methodBtn: {
    flex: 1, minWidth: '45%', height: 70, borderRadius: 14,
    backgroundColor: C.bg, borderWidth: 1.5, borderColor: C.border,
    alignItems: 'center', justifyContent: 'center', gap: 6,
  },
  methodBtnOn: { backgroundColor: C.primary, borderColor: C.primary },
  methodText: { fontSize: 13, fontWeight: '600', color: C.text },
  confirmBtn: {
    height: 56, borderRadius: 16, backgroundColor: C.primary,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    shadowColor: C.primary, shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35, shadowRadius: 18, elevation: 8,
  },
  confirmText: { fontSize: 17, fontWeight: '700', color: '#fff' },
});

// CartEditModal styles
const ce = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 20, paddingBottom: Platform.OS === 'ios' ? 36 : 24,
  },
  grabber: {
    width: 36, height: 4, borderRadius: 2, backgroundColor: C.border,
    alignSelf: 'center', marginTop: 10, marginBottom: 4,
  },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.border, marginBottom: 16,
  },
  title:    { fontSize: 16, fontWeight: '700', color: C.text },
  sub:      { fontSize: 12, color: C.muted, marginTop: 2 },
  closeBtn: { padding: 4 },
  fields:   { gap: 12, marginBottom: 16 },
  fieldRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  fieldLabel: { width: 110, fontSize: 13, color: C.text2, fontWeight: '500' },
  fieldInput: {
    flex: 1, height: 44, borderRadius: 10, borderWidth: 1.5, borderColor: C.border,
    paddingHorizontal: 12, fontSize: 16, fontWeight: '600', color: C.text,
    backgroundColor: C.bg,
  },
  qtyRow:  { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 },
  qtyBtn:  {
    width: 36, height: 36, borderRadius: 10, borderWidth: 1.5, borderColor: C.border,
    alignItems: 'center', justifyContent: 'center', backgroundColor: C.bg,
  },
  totalRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 12, borderTopWidth: 1, borderTopColor: C.border, marginBottom: 16,
  },
  totalLabel: { fontSize: 14, color: C.text2, fontWeight: '500' },
  totalAmt:   { fontSize: 20, fontWeight: '800', color: C.text, letterSpacing: -0.5 },
  actions: { flexDirection: 'row', gap: 12 },
  deleteBtn: {
    height: 50, paddingHorizontal: 18, borderRadius: 14,
    borderWidth: 1.5, borderColor: '#FEE2E2',
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: '#FFF5F5',
  },
  deleteText: { fontSize: 14, fontWeight: '600', color: '#EF4444' },
  saveBtn: {
    flex: 1, height: 50, borderRadius: 14, backgroundColor: C.primary,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: C.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 10, elevation: 6,
  },
  saveText: { fontSize: 16, fontWeight: '700', color: '#fff' },
});

// ContactPickerModal styles
const cp = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: C.border,
  },
  backBtn: { width: 36, alignItems: 'flex-start' },
  title:   { flex: 1, fontSize: 17, fontWeight: '700', color: C.text, textAlign: 'center' },
  searchWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    margin: 16, backgroundColor: C.bg, borderRadius: 14,
    paddingHorizontal: 14, height: 46,
    borderWidth: 1.5, borderColor: C.border,
  },
  searchInput: { flex: 1, fontSize: 15, color: C.text },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.border,
  },
  rowOn:      { backgroundColor: '#F0F7FF', marginHorizontal: -16, paddingHorizontal: 16, borderRadius: 0 },
  avatar: {
    width: 42, height: 42, borderRadius: 21, backgroundColor: C.primary + '18',
    alignItems: 'center', justifyContent: 'center',
  },
  avatarGrey: { backgroundColor: C.bg, borderWidth: 1, borderColor: C.border },
  avatarText: { fontSize: 17, fontWeight: '700', color: C.primary },
  rowName:    { fontSize: 14, fontWeight: '600', color: C.text },
  rowSub:     { fontSize: 12, color: C.muted, marginTop: 2 },
  empty:      { textAlign: 'center', color: C.muted, marginTop: 40, fontSize: 14 },
});

// Wave QR modal styles
const wv = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#1AC8F5', borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24, overflow: 'hidden',
  },
  grabber: {
    width: 36, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.4)',
    alignSelf: 'center', marginTop: 10, marginBottom: 4,
  },
  header: { padding: 16, paddingTop: 8, alignItems: 'center' },
  closeBtn: { position: 'absolute', top: 8, right: 16, padding: 4 },
  subtitle:  { color: 'rgba(255,255,255,0.9)', fontSize: 13, fontWeight: '500' },
  waveLogo:  { color: '#fff', fontSize: 34, fontWeight: '900', letterSpacing: -1, lineHeight: 38 },
  amtLabel:  { color: 'rgba(255,255,255,0.8)', fontSize: 12, fontWeight: '600', marginTop: 6 },
  amtValue:  { color: '#fff', fontSize: 28, fontWeight: '800', letterSpacing: 0.3 },
  qrWrap:    { alignItems: 'center', paddingVertical: 12 },
  qrBox:     {
    backgroundColor: '#fff', borderRadius: 16, padding: 12,
    shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 12, elevation: 6,
  },
  qrHint:    { color: 'rgba(255,255,255,0.85)', fontSize: 12, marginTop: 10 },
  actions:   { paddingHorizontal: 20, gap: 10 },
  linkBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    height: 44, borderRadius: 12, backgroundColor: '#fff',
  },
  linkText:    { color: '#1AC8F5', fontWeight: '700', fontSize: 14 },
  confirmBtn: {
    height: 52, borderRadius: 14, backgroundColor: 'rgba(0,0,0,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  confirmText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});

// Scanner styles
const sc = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center', justifyContent: 'center',
  },
  frame: {
    width: 240, height: 160, borderRadius: 16,
    borderWidth: 3, borderColor: '#fff',
    shadowColor: '#000', shadowOpacity: 0.5, shadowRadius: 8,
  },
  hint: {
    marginTop: 20, color: '#fff', fontSize: 14, fontWeight: '500',
    textShadowColor: 'rgba(0,0,0,0.8)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4,
  },
  closeWrap: { position: 'absolute', top: 0, left: 0, right: 0 },
  closeBtn:  {
    margin: 16, width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center',
  },
});
