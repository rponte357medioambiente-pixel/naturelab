import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { readFileSync } from 'node:fs';

const { version } = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));

// Ruta base del despliegue.
// - Local y Vercel: "/".
// - GitHub Pages (sitio de proyecto): "/<nombre-del-repositorio>/". El flujo de
//   .github/workflows/desplegar.yml la calcula a partir del nombre del repositorio.
const base = process.env.VITE_BASE ?? '/';

export default defineConfig({
  base,
  define: {
    __VERSION_APP__: JSON.stringify(version),
  },
  plugins: [
    react(),
    VitePWA({
      // La app avisa cuando hay una versión nueva; no recarga sola en mitad de un registro.
      registerType: 'prompt',
      injectRegister: false,
      // El manifiesto vive en public/manifest.webmanifest (apartado 3.2).
      manifest: false,
      workbox: {
        // Incluye las imágenes del catálogo (WebP, JPG o PNG) para usarlas sin conexión.
        globPatterns: ['**/*.{js,css,html,svg,png,jpg,jpeg,webp,json,woff2,webmanifest}'],
        // El detector de personas (unos 20 MB) solo se descarga al usar la herramienta de fotos.
        // También se excluyen módulos opcionales de jsPDF que la app no usa.
        globIgnores: [
          'mediapipe/**',
          'modelos/**',
          'assets/vision_bundle-*.js',
          'assets/html2canvas-*.js',
          'assets/purify.es-*.js',
          'assets/index.es-*.js',
        ],
        cleanupOutdatedCaches: true,
        navigateFallback: 'index.html',
      },
    }),
  ],
  test: {
    include: ['tests/**/*.test.js'],
    environment: 'node',
  },
});
