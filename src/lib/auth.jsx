import { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import { api, getToken, setToken, setOnUnauthorized } from './api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setLocalToken] = useState(getToken());
  const [usuario, setUsuario] = useState(null);
  const [loading, setLoading] = useState(Boolean(getToken()));

  const logout = useCallback(() => {
    setToken(null);
    setLocalToken(null);
    setUsuario(null);
  }, []);

  useEffect(() => {
    setOnUnauthorized(() => {
      setLocalToken(null);
      setUsuario(null);
    });
  }, []);

  useEffect(() => {
    if (!token) { setUsuario(null); setLoading(false); return; }
    let cancelled = false;
    setLoading(true);
    api.get('/me')
      .then((res) => { if (!cancelled) setUsuario(res.data?.usuario || null); })
      .catch(() => { if (!cancelled) { logout(); } })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [token, logout]);

  const login = useCallback(async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    const { token: newToken, usuario: u } = res.data || {};
    if (!newToken) throw new Error('respuesta inválida del servidor');
    setToken(newToken);
    setLocalToken(newToken);
    setUsuario(u);
    return u;
  }, []);

  const value = useMemo(() => ({
    token, usuario, loading, login, logout,
    isAuthenticated: Boolean(token && usuario),
  }), [token, usuario, loading, login, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth fuera de AuthProvider');
  return ctx;
}
