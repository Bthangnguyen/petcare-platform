import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { ApiError, get, post, type User } from './api';

interface AuthState {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
}

const Ctx = createContext<AuthState>(null as unknown as AuthState);
export const useAuth = () => useContext(Ctx);

/** Keeps the logged-in user; the session itself is a server-side session in an HttpOnly cookie. */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    get<User>('/auth/me')
      .then(setUser)
      .catch((e) => {
        if (!(e instanceof ApiError) || e.status !== 401) console.error(e);
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const onUnauthenticated = () => setUser(null);
    window.addEventListener('auth:unauthenticated', onUnauthenticated);
    return () => window.removeEventListener('auth:unauthenticated', onUnauthenticated);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const u = await post<User>('/auth/login', { email, password });
    setUser(u);
    return u;
  }, []);

  const logout = useCallback(async () => {
    await post('/auth/logout').catch(() => undefined);
    setUser(null);
  }, []);

  return <Ctx.Provider value={{ user, loading, login, logout }}>{children}</Ctx.Provider>;
}
