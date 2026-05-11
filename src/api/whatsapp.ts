import client from './client';
import { ApiResponse, WhatsAppOrder } from '../types';

interface OrdersResponse {
  orders:   WhatsAppOrder[];
  total:    number;
  page:     number;
  per_page: number;
  has_more: boolean;
  counts:   Record<string, number>;
}

export const getWhatsAppOrders = async (params?: {
  location_id?: number;
  status?: string;
  page?: number;
}) => {
  const { data } = await client.get<ApiResponse<OrdersResponse>>('/whatsapp/orders', { params });
  return data.data;
};

export const approveOrder = async (id: number) => {
  const { data } = await client.post(`/whatsapp/orders/${id}/approve`);
  return data;
};

export const rejectOrder = async (id: number) => {
  const { data } = await client.post(`/whatsapp/orders/${id}/reject`);
  return data;
};
