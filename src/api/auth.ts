import client from './client';
import * as SecureStore from 'expo-secure-store';
import { ApiResponse, AuthState } from '../types';

export const login = async (username: string, password: string) => {
  const { data } = await client.post<ApiResponse<{
    token: string; user: any; business: any; locations: any[];
  }>>('/auth/login', { username, password });

  if (data.success) {
    await SecureStore.setItemAsync('auth_token', data.data.token);
  }
  return data;
};

export const logout = async () => {
  await client.post('/auth/logout');
  await SecureStore.deleteItemAsync('auth_token');
};

export const getMe = async () => {
  const { data } = await client.get('/auth/me');
  return data;
};

export const getToken = () => SecureStore.getItemAsync('auth_token');
