import { useEffect, useState } from 'react';
import { Icon } from './Icon.jsx';

const STORAGE_KEY = 'tombot_panel_pwa_tip_dismissed_v1';

function isIos() {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  const isApple = /iPhone|iPad|iPod/.test(ua);
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches
    || window.navigator.standalone === true;
  return isApple && !isStandalone;
}

export default function InstallPwaTip() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(STORAGE_KEY) === '1') return;
      if (isIos()) {
        const t = setTimeout(() => setShow(true), 1500);
        return () => clearTimeout(t);
      }
    } catch { /* noop */ }
  }, []);

  if (!show) return null;

  const dismiss = () => {
    try { localStorage.setItem(STORAGE_KEY, '1'); } catch { /* noop */ }
    setShow(false);
  };

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-3 z-30 flex justify-center px-3 safe-bottom sm:hidden">
      <div className="pointer-events-auto flex items-start gap-3 rounded-2xl bg-slate-900 px-4 py-3 text-white shadow-lg">
        <Icon name="share" className="mt-0.5 h-5 w-5 flex-shrink-0" />
        <p className="text-sm leading-snug">
          Instalá el panel en tu pantalla de inicio: tocá <b>Compartir</b> y luego <b>Agregar a pantalla de inicio</b>.
        </p>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Cerrar aviso"
          className="-m-2 rounded-md p-2 text-white/70 hover:text-white"
        >
          <Icon name="close" className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
