import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

const backend = 'http://127.0.0.1:8000'
const backendProxy = {
  '/api': backend,
  '/ws': { target: backend, ws: true },
}

export default defineConfig({
  server: { proxy: backendProxy },
  preview: { proxy: backendProxy },
  plugins: [
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/apple-touch-icon.png'],
      manifest: {
        name: 'HabitSquad',
        short_name: 'HabitSquad',
        description: 'Cumple tu hábito. Que no caiga la racha.',
        lang: 'es',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        theme_color: '#4d1df9',
        background_color: '#ffffff',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: '/icons/icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // En producción la API y el admin de Django comparten dominio con el
        // frontend: sus rutas nunca deben responderse con index.html.
        navigateFallbackDenylist: [/^\/api\//, /^\/admin\//],
      },
    }),
  ],
  test: {
    environment: 'jsdom',
  },
})
