// ── Auth ─────────────────────────────────────────────────────────────────────
export interface User {
  id:       number;
  name:     string;
  username: string;
  email:    string;
}

export interface Business {
  id:                  number;
  name:                string;
  currency:            string;
  currency_precision:  number;
  quantity_precision:  number;
}

export interface Location {
  id:          number;
  name:        string;
  location_id: string;
}

export interface AuthState {
  token:     string | null;
  user:      User | null;
  business:  Business | null;
  locations: Location[];
  currentLocationId: number | null;
}

// ── Dashboard ────────────────────────────────────────────────────────────────
export interface DashboardData {
  sales_today:    { count: number; revenue: number };
  expenses_today: { count: number; total: number };
  low_stock_count: number;
  top_products:   { id: number; name: string; qty_sold: number; revenue: number }[];
}

// ── Revenue Report ───────────────────────────────────────────────────────────
export interface RevenueReport {
  period:  string;
  labels:  string[];
  data:    number[];
  summary: { total: number; average: number; max: number; variation: number | null };
}

// ── Produits ─────────────────────────────────────────────────────────────────
export interface Variation {
  id:             number;
  name:           string;
  sku:            string;
  price:          number;
  price_with_tax: number;
  stock:          number;
}

export interface Product {
  id:           number;
  name:         string;
  sku:          string;
  type:         string;
  image:        string | null;
  enable_stock: boolean;
  unit:         string;
  tax_rate:     number;
  tax_name:     string | null;
  variations:   Variation[];
}

// ── Ventes ───────────────────────────────────────────────────────────────────
export interface Sale {
  id:             number;
  invoice_no:     string;
  customer:       { id: number; name: string } | null;
  total:          number;
  payment_status: string;
  date:           string;
  created_at:     string;
}

export interface SaleDetailItem {
  product:    string | null;
  variation:  string | null;
  quantity:   number;
  unit_price: number;
  discount:   number;
  line_total: number;
}

export interface SaleDetailPayment {
  method: string;
  amount: number;
}

export interface SaleDetail {
  id:               number;
  invoice_no:       string;
  date:             string;
  location:         string | null;
  customer:         { id: number; name: string; mobile: string | null } | null;
  items:            SaleDetailItem[];
  total_before_tax: number;
  tax_amount:       number;
  discount_amount:  number;
  final_total:      number;
  payment_status:   string;
  payments:         SaleDetailPayment[];
}

// ── Commandes WhatsApp ───────────────────────────────────────────────────────
export interface WhatsAppOrderItem {
  name:     string;
  qty:      number;
  price:    number;
}

export interface WhatsAppOrder {
  id:             number;
  customer_name:  string;
  customer_phone: string;
  product_name:   string;
  qty:            number;
  unit_price:     number;
  total:          number;
  address:        string;
  payment_method: string;
  status:         'pending_verification' | 'approved' | 'rejected' | 'ready';
  created_at:     string;
  items?:         WhatsAppOrderItem[];
}

// ── API Response ─────────────────────────────────────────────────────────────
export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data:    T;
}
