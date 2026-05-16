import { create } from 'zustand';

interface User {
  id: string;
  name: string;
  email: string;
  role: 'user' | 'admin';
  isSeller: boolean;
  phone?: string;
  gender?: string;
  birthday?: string;
  avatar?: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  register: (name: string, email: string, password: string, confirmPassword: string) => Promise<{ ok: boolean; error?: string }>;
  logout: () => Promise<void>;
  fetchMe: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,

  fetchMe: async () => {
    try {
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        const data = await res.json();
        set({ user: data.user, isAuthenticated: true, isLoading: false });
      } else {
        set({ user: null, isAuthenticated: false, isLoading: false });
      }
    } catch {
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },

  login: async (email, password) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        return { ok: false, error: data.error || 'Đăng nhập thất bại' };
      }

      set({ user: data.user, isAuthenticated: true });
      return { ok: true };
    } catch {
      return { ok: false, error: 'Lỗi kết nối server' };
    }
  },

  register: async (name, email, password, confirmPassword) => {
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, confirmPassword }),
      });

      const data = await res.json();

      if (!res.ok) {
        return { ok: false, error: data.error || 'Đăng ký thất bại' };
      }

      set({ user: data.user, isAuthenticated: true });
      return { ok: true };
    } catch {
      return { ok: false, error: 'Lỗi kết nối server' };
    }
  },

  logout: async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch { /* ignore */ }
    set({ user: null, isAuthenticated: false });
    window.location.href = '/';
  },
}));