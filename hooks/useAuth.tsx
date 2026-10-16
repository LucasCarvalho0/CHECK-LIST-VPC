'use client';
import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from 'react';
import { api, tokenStore } from '@/services/api';
import type { User } from '@/types';

interface Ctx { user: User | null; loading: boolean; login: (u: string, p: string) => Promise<void>; logout: () => Promise<void> }
const AuthCtx = createContext<Ctx>({} as Ctx);
export const useAuth = () => useContext(AuthCtx);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tokenStore.get()) { setLoading(false); return; }
    api.get<User>('/auth/me').then(setUser).catch(() => tokenStore.clear()).finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    const r = await api.post<{ accessToken: string; user: User }>('/auth/login', { username, password });
    tokenStore.set(r.accessToken);
    setUser(r.user);
  }, []);

  const logout = useCallback(async () => {
    try { await api.post('/auth/logout'); } catch { /* ignora */ }
    tokenStore.clear();
    setUser(null);
    window.location.href = '/login';
  }, []);

  return <AuthCtx.Provider value={{ user, loading, login, logout }}>{children}</AuthCtx.Provider>;
}
