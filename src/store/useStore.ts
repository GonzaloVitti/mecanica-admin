import { IForm } from '@/app/interfaces/IForm';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface UserData {
  id?: number;
  email?: string;
  role?: string;
  is_verified?: boolean;
  access_token?: string; // Token de acceso para autenticación
  // Campos adicionales que podrían venir de una llamada posterior
  first_name?: string;
  last_name?: string;
  phone_number?: string; // Cambiado de phone a phone_number para coincidir con el backend
  username?: string;
  date_joined?: string;
  bio?: string;
  country?: string;
  city?: string;
  postal_code?: string;
  profile_image?: string;
  is_superuser?: boolean;
}

interface AuthState {
  token: string | null;
  refresh: string | null;
  user: UserData | null;
  isAuthenticated: boolean;
  initialized: boolean;
}

export interface State extends AuthState {
  isMobile: boolean;
  setUser: (user: UserData) => void;
  setAuth: (token: string, refresh: string, user: UserData) => void;
  updateToken: (token: string) => void;
  clearAuth: () => void;
  logout: () => void;
  setInitialized: (initialized: boolean) => void;
  updateUserProfile: (userData: Partial<UserData>) => void;
  restoreSession: () => boolean;
  // Cambio 1: Reemplazar 'any' por un tipo más específico
  changeForm: (property: keyof IForm, value: string | number | boolean) => Promise<void>;
}

export const useStore = create<State>()(
  persist(
    (set, get) => ({
      isMobile: false,
      token: null,
      refresh: null,
      user: null,
      isAuthenticated: false,
      initialized: false,

      setUser: (user) => set({ user }),
      
      setAuth: (token, refresh, user) => set({
        token,
        refresh,
        user,
        isAuthenticated: true,
        initialized: true,
      }),
      
      updateToken: (token) => set({
        token,
      }),
      
      clearAuth: () => set({
        token: null,
        refresh: null,
        user: null,
        isAuthenticated: false,
      }),
      
      logout: () => set({
        token: null,
        refresh: null,
        user: null,
        isAuthenticated: false,
      }),
      
      setInitialized: (initialized) => set({
        initialized,
      }),
      
      updateUserProfile: (userData) => set((state) => ({
        user: state.user ? { ...state.user, ...userData } : userData
      })),
      
      restoreSession: () => {
        // Cambio 2: Eliminar 'refresh' que no se usa
        const { token, user } = get();
        return !!(token && user); // Devuelve true si hay token y usuario
      },
      
      // Cambio 3: Agregar guiones bajos a parámetros no utilizados
      changeForm: async () => {
        // Tu implementación existente
        // Si no hay nada específico aquí, simplemente deja un marcador de posición vacío
      },
    }),
    {
      name: 'radiotaxi-auth-storage',
      partialize: (state) => ({
        token: state.token,
        refresh: state.refresh,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        initialized: state.initialized,
      }),
    }
  )
);