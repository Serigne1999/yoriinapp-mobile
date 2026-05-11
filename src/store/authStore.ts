import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { AuthState, User, Business, Location } from '../types';
import { login as apiLogin, logout as apiLogout, getMe } from '../api/auth';

interface AuthStore extends AuthState {
  isLoading: boolean;
  isHydrated: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  hydrate: () => Promise<void>;
  setLocation: (id: number) => void;
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  token: null,
  user: null,
  business: null,
  locations: [],
  currentLocationId: null,
  isLoading: false,
  isHydrated: false,

  login: async (username, password) => {
    set({ isLoading: true });
    try {
      const res = await apiLogin(username, password);
      if (!res.success) throw new Error(res.message || 'Échec de connexion');
      const { token, user, business, locations } = res.data;
      const firstLocation = locations?.[0]?.id ?? null;
      await SecureStore.setItemAsync('auth_token', token);
      set({
        token,
        user,
        business,
        locations: locations ?? [],
        currentLocationId: firstLocation,
      });
    } finally {
      set({ isLoading: false });
    }
  },

  logout: async () => {
    await apiLogout().catch(() => {});
    await SecureStore.deleteItemAsync('auth_token');
    set({ token: null, user: null, business: null, locations: [], currentLocationId: null });
  },

  hydrate: async () => {
    const token = await SecureStore.getItemAsync('auth_token');
    if (!token) {
      set({ isHydrated: true });
      return;
    }
    try {
      const res = await getMe();
      if (res.success) {
        const { user, business, locations } = res.data;
        const firstLocation = locations?.[0]?.id ?? null;
        set({
          token,
          user,
          business,
          locations: locations ?? [],
          currentLocationId: firstLocation,
        });
      }
    } catch {
      await SecureStore.deleteItemAsync('auth_token');
    } finally {
      set({ isHydrated: true });
    }
  },

  setLocation: (id) => set({ currentLocationId: id }),
}));
