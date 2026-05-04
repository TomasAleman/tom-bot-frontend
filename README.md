# Panel web de reservas (PWA)

Panel responsive (mobile-first) por restaurante para ver/editar/cancelar
reservas, gestionar mesas, ajustar parámetros del bot y monitorear sesiones
activas. Construido con Vite + React + Tailwind v4 + react-query +
vite-plugin-pwa.

- API: el mismo proceso `microservice/` (Fastify) sirve `/api/*` y, además,
  los archivos estáticos del panel en `/admin/*`.
- Cada usuario está atado a un único `restaurante_id` por JWT — cero acceso
  cruzado entre tenants.
- Instalable como app en el celular (Android: banner automático; iOS:
  tip propio "Compartir → Agregar a pantalla de inicio").

## Ramas (flujo de trabajo)

| Rama | Uso |
|------|-----|
| **`main`** | Línea base; podés alinearla con `release` cuando quieras. |
| **`develop`** | Trabajo diario: features, fixes, `git push`. |
| **`release`** | **Única rama desde la que se despliega el panel a producción.** Merge `develop` → `release`, push, luego deploy en VM. |

**Regla:** en la VM el deploy es siempre con **`git checkout release`** + **`git pull`** (o `scripts/vm_deploy_release.sh`).

### Crear `develop` y `release` (primera vez, en tu PC)

```bash
cd ~/ruta/al/clon/tom-bot-frontend
git checkout main && git pull origin main
git checkout -b develop && git push -u origin develop
git checkout -b release && git push -u origin release
```

### Publicar a producción (PC)

```bash
git checkout release
git merge develop
git push origin release
```

Luego deploy en la VM (script o comandos de la sección Deploy).

## Estructura

```
tom-bot-frontend/
├── package.json          deps de Vite/React
├── vite.config.js        base /admin/, plugin PWA, proxy /api -> :3000
├── index.html            viewport-fit=cover, apple-touch-icon, theme-color
├── public/               favicon.svg, icons/icon.svg (ver public/icons/README.md)
└── src/
    ├── main.jsx          monta App, BrowserRouter basename="/admin", QueryClient
    ├── App.jsx           rutas + ProtectedRoute
    ├── index.css         @import "tailwindcss"; safe-area helpers
    ├── lib/
    │   ├── api.js        axios + interceptor JWT + auto-logout 401
    │   ├── auth.jsx      AuthProvider/useAuth (token en localStorage)
    │   ├── format.js     fechas/horas/badges
    │   └── queryClient.js
    ├── components/
    │   ├── Layout.jsx        sidebar fijo en lg+, drawer en <lg
    │   ├── Sidebar.jsx
    │   ├── Topbar.jsx        hamburger en <lg, avatar en sm+
    │   ├── KpiCard.jsx
    │   ├── Modal.jsx         bottom-sheet en mobile, centered en sm+
    │   ├── EstadoBadge.jsx
    │   ├── Field.jsx         Input/Select/Button (min-h-11)
    │   ├── Icon.jsx          set inline SVG (sin libs)
    │   └── InstallPwaTip.jsx tip iOS "Agregar a pantalla de inicio"
    └── pages/
        ├── Login.jsx
        ├── Dashboard.jsx     KPIs hoy/semana/mes + barras 14 días + próximas
        ├── Reservas.jsx      tabla en >=md, cards en <md, filtros colapsables
        ├── ReservaDetalle.jsx editar (vía fn_modificar_reserva), cancelar, no-show
        ├── Mesas.jsx         CRUD (delete = soft delete activa=false)
        ├── Configuracion.jsx upsert masivo de tombot.config
        └── Sesiones.jsx      read-only de tombot.sesiones con expand JSON
```

## Desarrollo local

Necesitás Node 20+ y un microservicio corriendo en `localhost:3000` con
`JWT_SECRET` seteado.

```bash
# Terminal 1: backend (repo tom-bot-backend, carpeta microservice/)
cd ../tom-bot-backend/microservice
PGURL=postgres://postgres:****@localhost:5432/evolution \
REDIS_URL=redis://localhost:6379 \
JWT_SECRET="cualquier-string-largo-y-secreto" \
PANEL_PUBLIC_DIR=../../tom-bot-frontend/dist \
npm run dev

# Terminal 2: frontend (este repo)
npm install
npm run dev
# abrir http://localhost:5173/admin/
```

Vite hace proxy de `/api` a `http://localhost:3000`, así que el comportamiento
es igual al de producción (mismo dominio, sin CORS).

Para crear un usuario inicial (script en repo **tom-bot-backend**):

```bash
cd ../tom-bot-backend
PGURL=postgres://postgres:****@localhost:5432/evolution \
  node scripts/crear_usuario_panel.js \
  --slug tom-bot --email vos@tu-resto.com --password una-segura
```

## Build

```bash
npm install
npm run build   # genera dist/
```

El bundle es 100% estático: HTML, JS, CSS, manifest, service worker e
íconos. Pesa unos cientos de KB gzipped.

## Deploy en la VM (solo rama `release`)

En la VM tenés **Node 20** (NodeSource). **No** instales el paquete apt `npm` si choca con ese Node: `npm` ya viene con `nodejs`.

### Opción A — Script recomendado (en la VM)

```bash
chmod +x ~/tom-bot-frontend/scripts/vm_deploy_release.sh   # una vez
~/tom-bot-frontend/scripts/vm_deploy_release.sh
```

Hace `git fetch`, `checkout release`, `pull`, `npm ci`, `npm run build`, `rsync` a `/opt/tombot/panel-public/`.

### Opción B — Comandos manuales (misma regla: rama `release`)

```bash
cd ~/tom-bot-frontend
git fetch origin
git checkout release
git pull origin release
npm ci
npm run build
sudo mkdir -p /opt/tombot/panel-public
sudo rsync -a --delete dist/ /opt/tombot/panel-public/
```

### Primera vez (clone)

```bash
sudo apt update && sudo apt install -y git rsync
# nodejs 20 ya instalado (NodeSource); no apt install npm
cd ~
git clone https://github.com/TomasAleman/tom-bot-frontend.git
cd tom-bot-frontend
git checkout release   # después de crear la rama en GitHub
git pull origin release
npm ci && npm run build
sudo mkdir -p /opt/tombot/panel-public
sudo rsync -a --delete dist/ /opt/tombot/panel-public/
```

### Opción C — Desde tu PC con SSH (Git Bash / WSL)

Con **`git checkout release`** y código al día:

```bash
VM_USER=alemanmdq VM_HOST=IP_VM ./scripts/deploy_panel.sh
```

Emergencia: `ALLOW_NON_RELEASE_DEPLOY=1 VM_USER=... VM_HOST=... ./scripts/deploy_panel.sh`

### Producción y API

`VITE_API_BASE_URL` en producción: dejarlo vacío para usar **`/api`** en el mismo host que sirve el microservicio.

El repo **tom-bot-backend** sirve `dist/` en `https://<dominio>/admin/`.

## Cómo lo sirve el microservicio

Cuando arranca, `microservice/src/server.js`:

1. Si existe `JWT_SECRET`, registra `/api/*` con auth JWT.
2. Si existe `PANEL_PUBLIC_DIR` (o el default `/opt/tombot/panel-public`),
   sirve el bundle en `/admin/*` con `@fastify/static`.
3. Configura un `setNotFoundHandler` para que cualquier ruta dentro de
   `/admin/*` que no sea un archivo concreto devuelva `index.html` (SPA
   fallback necesario para react-router).

## PWA en móvil

- **Android (Chrome/Edge):** la primera vez que abrís el panel y lo navegás
  un poco, aparece un banner "Instalar app". Al instalar queda como ícono
  en el home y abre standalone.
- **iOS (Safari):** tras 1.5 s mostramos un toast indicando "Tocá Compartir
  → Agregar a pantalla de inicio". Apple no permite banner automático.
  Una vez instalado, abre standalone y respeta safe-area.
- **Desktop (Chrome/Edge):** botón de instalar en la barra del navegador.

Service worker: configurado con `vite-plugin-pwa` en modo `autoUpdate`.
Las requests a `/api/*` están en `NetworkOnly` (no cachean datos privados),
solo cachea los assets estáticos.

## Responsive — checklist

- [x] Viewport `width=device-width, initial-scale=1, viewport-fit=cover`.
- [x] Sidebar drawer en `<lg` (hamburger en topbar), fijo en `lg+`.
- [x] Tabla de reservas: cards verticales en `<md`, tabla en `md+` con
      `overflow-x-auto` interno.
- [x] KPIs: 1 col mobile / 2 col `sm` / 4 col `lg`.
- [x] Modales: bottom-sheet en mobile, centered en `sm+`.
- [x] Inputs y botones con `min-h-11` (≈44 px) para tap-target.
- [x] `safe-area-inset-*` en topbar/sidebar/main.
- [x] Texto base 16 px (no fuerza zoom en iOS).

Probar manualmente en breakpoints típicos:

- `360 × 640`  (mobile S)
- `390 × 844`  (iPhone 14)
- `768 × 1024` (iPad)
- `1280 × 800` (laptop)
- `1920 × 1080` (desktop)
