import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['media/baila-logo.png'],
      manifest: {
        name: 'Baila Innsbruck App',
        short_name: 'Baila App',
        description: 'Your classes, your people and your next step in Innsbruck.',
        theme_color: '#0d0d0d',
        background_color: '#f7f4ed',
        display: 'standalone',
        start_url: '/',
        scope: '/',
        icons: [
          { src: '/media/baila-logo.png', sizes: '192x192', type: 'image/png' },
          { src: '/media/baila-logo.png', sizes: '512x512', type: 'image/png' },
        ],
      },
    }),
  ],
})
