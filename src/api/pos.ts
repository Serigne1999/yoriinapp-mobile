import client from './client';
import { ApiResponse, Product } from '../types';

interface ProductsResponse {
  products: Product[];
  total:    number;
  has_more: boolean;
}

interface SaleResponse {
  id:         number;
  invoice_no: string;
  total:      number;
}

export const searchProducts = async (params: {
  location_id: number;
  search?:     string;
  page?:       number;
}) => {
  const { data } = await client.get<ApiResponse<ProductsResponse>>('/products', { params });
  return data.data;
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
