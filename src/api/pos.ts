import client from './client';
import { ApiResponse, Category, Product } from '../types';

export interface PaymentMethod {
  key:     string;
  label:   string;
  enabled: boolean;
}

interface ProductsResponse {
  products: Product[];
  total:    number;
  has_more: boolean;
}

export const fetchCategories = async (): Promise<Category[]> => {
  const { data } = await client.get<ApiResponse<{ categories: Category[] }>>('/categories');
  return data.data.categories ?? [];
};

interface SaleResponse {
  id:         number;
  invoice_no: string;
  total:      number;
}

export const searchProducts = async (params: {
  location_id:  number;
  search?:      string;
  category_id?: number;
  page?:        number;
}) => {
  const { data } = await client.get<ApiResponse<ProductsResponse>>('/products', { params });
  return data.data;
};

export interface Contact {
  id:     number;
  name:   string;
  mobile: string | null;
  ref:    string | null;
}

export const fetchContacts = async (search: string = ''): Promise<Contact[]> => {
  const { data } = await client.get<ApiResponse<{ contacts: Contact[] }>>('/contacts', {
    params: { type: 'customer', search, per_page: 50 },
  });
  return data.data.contacts ?? [];
};

export const fetchSettings = async (): Promise<{ wave_payment_link?: string }> => {
  const { data } = await client.get<ApiResponse<{ pos: { wave_payment_link?: string } }>>('/settings');
  return data.data.pos ?? {};
};

export const fetchPaymentMethods = async (location_id: number): Promise<PaymentMethod[]> => {
  const { data } = await client.get<ApiResponse<{ payment_methods: PaymentMethod[] }>>('/payment-methods', { params: { location_id } });
  return data.data.payment_methods ?? [];
};

export const createSale = async (payload: {
  location_id: number;
  contact_id?: number;
  items: { variation_id: number; quantity: number; unit_price: number; discount?: number }[];
  payments: { method: string; amount: number }[];
  note?: string;
}) => {
  const { data } = await client.post<ApiResponse<SaleResponse>>('/sales', payload);
  return data;
};
