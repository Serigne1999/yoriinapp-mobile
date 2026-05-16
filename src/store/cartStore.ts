import { create } from 'zustand';

export interface CartItem {
  variation_id: number;
  product_name: string;
  variation_name: string;
  unit_price: number;
  quantity: number;
  discount: number;
}

interface CartStore {
  items: CartItem[];
  contact_id: number | null;
  contact_name: string | null;
  note: string;
  addItem: (item: CartItem) => void;
  removeItem: (variation_id: number) => void;
  updateQty: (variation_id: number, qty: number) => void;
  updatePrice: (variation_id: number, price: number) => void;
  updateDiscount: (variation_id: number, discount: number) => void;
  setContact: (id: number | null, name?: string | null) => void;
  setNote: (note: string) => void;
  clear: () => void;
  total: () => number;
  count: () => number;
}

export const useCartStore = create<CartStore>((set, get) => ({
  items:        [],
  contact_id:   null,
  contact_name: null,
  note:         '',

  addItem: (item) => set(state => {
    const existing = state.items.find(i => i.variation_id === item.variation_id);
    if (existing) {
      return {
        items: state.items.map(i =>
          i.variation_id === item.variation_id
            ? { ...i, quantity: i.quantity + item.quantity }
            : i
        ),
      };
    }
    return { items: [...state.items, item] };
  }),

  removeItem: (variation_id) => set(state => ({
    items: state.items.filter(i => i.variation_id !== variation_id),
  })),

  updateQty: (variation_id, qty) => set(state => ({
    items: qty <= 0
      ? state.items.filter(i => i.variation_id !== variation_id)
      : state.items.map(i => i.variation_id === variation_id ? { ...i, quantity: qty } : i),
  })),

  updatePrice: (variation_id, price) => set(state => ({
    items: state.items.map(i => i.variation_id === variation_id ? { ...i, unit_price: price } : i),
  })),

  updateDiscount: (variation_id, discount) => set(state => ({
    items: state.items.map(i => i.variation_id === variation_id ? { ...i, discount } : i),
  })),

  setContact: (id, name = null) => set({ contact_id: id, contact_name: name }),
  setNote:    (note) => set({ note }),
  clear:      () => set({ items: [], contact_id: null, contact_name: null, note: '' }),

  total: () => get().items.reduce(
    (sum, i) => sum + (i.unit_price - i.discount) * i.quantity, 0
  ),

  count: () => get().items.reduce((sum, i) => sum + i.quantity, 0),
}));
