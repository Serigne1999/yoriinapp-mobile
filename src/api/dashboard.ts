import client from './client';
import { ApiResponse, DashboardData, RevenueReport } from '../types';

export const getDashboard = async (locationId?: number) => {
  const params = locationId ? { location_id: locationId } : {};
  const { data } = await client.get<ApiResponse<DashboardData>>('/dashboard', { params });
  return data.data;
};

export const getRevenue = async (period: 'week' | 'month' | 'year', locationId?: number) => {
  const params: any = { period };
  if (locationId) params.location_id = locationId;
  const { data } = await client.get<ApiResponse<RevenueReport>>('/reports/revenue', { params });
  return data.data;
};
