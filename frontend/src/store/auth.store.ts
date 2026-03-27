import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Admin } from '@/types';

interface AuthState {
  token: string | null;
  admin: Admin | null;
  isAuthenticated: boolean;
  setAuth: (token: string, admin: Admin) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      admin: null,
      isAuthenticated: false,

      setAuth: (token, admin) => {
        localStorage.setItem('pos_token', token);
        set({ token, admin, isAuthenticated: true });
      },

      clearAuth: () => {
        localStorage.removeItem('pos_token');
        set({ token: null, admin: null, isAuthenticated: false });
      },
    }),
    {
      name: 'pos_auth',
      partialize: (state) => ({
        token: state.token,
        admin: state.admin,
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
);
