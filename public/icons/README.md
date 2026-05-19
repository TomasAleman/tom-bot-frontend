# Iconos PWA

Logo: calendario con check sobre fondo `#0b0f17` (ver `icon.svg`).

`icon.svg` cubre favicon y PWA en navegadores modernos. Los PNG se generan con:

```bash
npm run icons
```

(Requiere Node 18+ y `@resvg/resvg-js` en devDependencies.)

## PNGs (recomendado para mejor compatibilidad con iOS Safari)

iOS Safari prefiere PNGs declarados como `apple-touch-icon` y, en algunos
casos, también para el ícono de la pantalla de inicio. Para generar los PNGs
desde el SVG sin instalar nada nuevo en producción, podés:

### Opción A: usar `@vite-pwa/assets-generator` (una sola vez, en local)

```bash
cd panel
npx --yes @vite-pwa/assets-generator@latest \
  --preset minimal-2023 public/icons/icon.svg
```

Genera automáticamente:

- `public/icons/icon-192.png`
- `public/icons/icon-512.png`
- `public/icons/icon-mask-512.png`
- `public/apple-touch-icon.png`
- `public/favicon.ico`

### Opción B: con cualquier conversor SVG → PNG online

Subí `icon.svg` y exportá:

- `icon-192.png`      (192×192)  → `public/icons/`
- `icon-512.png`      (512×512)  → `public/icons/`
- `icon-mask-512.png` (512×512, con padding del 10%)  → `public/icons/`
- `apple-touch-icon.png` (180×180) → `public/`

Mientras los PNGs no existan, el SVG cubre la mayoría de casos y el build
no falla (los PNGs son opcionales en el manifest, pero quedan declarados
para que cuando los agregues funcionen sin tocar config).
