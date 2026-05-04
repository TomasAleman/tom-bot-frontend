import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth.jsx';
import { apiError } from '../lib/api.js';
import { Button, Input, Label, ErrorText } from '../components/Field.jsx';
import { Icon } from '../components/Icon.jsx';

export default function Login() {
  const { login, isAuthenticated } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  if (isAuthenticated) {
    const to = location.state?.from || '/dashboard';
    return <Navigate to={to} replace />;
  }

  const onSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email.trim().toLowerCase(), password);
      navigate(location.state?.from || '/dashboard', { replace: true });
    } catch (err) {
      const status = err?.response?.status;
      if (status === 401) setError('Email o contraseña incorrectos');
      else if (status === 429) setError('Demasiados intentos, esperá un minuto');
      else setError(apiError(err, 'No se pudo iniciar sesión'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-full items-center justify-center px-4 py-10 safe-top safe-bottom">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-900 text-white">
            <Icon name="calendar" className="h-7 w-7" />
          </div>
          <h1 className="text-xl font-semibold text-slate-900">Panel Reservas</h1>
          <p className="mt-1 text-sm text-slate-500">Ingresá con tus credenciales del restaurante</p>
        </div>
        <form onSubmit={onSubmit} className="space-y-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              autoFocus
              required
              inputMode="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="dueno@mirestaurante.com"
            />
          </div>
          <div>
            <Label htmlFor="password">Contraseña</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPass ? 'text' : 'password'}
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pr-12"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPass((s) => !s)}
                className="absolute inset-y-0 right-0 flex items-center px-3 text-xs text-slate-500"
                aria-label={showPass ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              >
                {showPass ? 'Ocultar' : 'Ver'}
              </button>
            </div>
          </div>
          <ErrorText>{error}</ErrorText>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Ingresando…' : 'Ingresar'}
          </Button>
        </form>
        <p className="mt-4 text-center text-xs text-slate-400">
          ¿Olvidaste la contraseña? Pedile al admin que la regenere.
        </p>
      </div>
    </div>
  );
}
