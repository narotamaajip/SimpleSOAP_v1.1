import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vitejs.dev/config/
export default defineConfig({
  build: {
    // Firebase SDK is inherently large (~560KB min); suppress false-alarm warning.
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks: {
          // Split heavy vendor dependencies into separate cacheable chunks.
          // These rarely change so they'll be cached by the browser/SW independently.
          'vendor-react': ['react', 'react-dom'],
          'vendor-firebase': [
            'firebase/app',
            'firebase/firestore',
            'firebase/auth'
          ],
          'vendor-motion': ['framer-motion'],
          'vendor-lucide': ['lucide-react'],
          'vendor-utils': ['clsx', 'tailwind-merge']
        }
      }
    }
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'icons/*.png'],
      manifest: {
        name: 'SimpleSOAP',
        short_name: 'SimpleSOAP',
        description: 'Aplikasi pencatatan SOAP untuk dokter',
        theme_color: '#059669',      // emerald-600 — matches app brand color
        background_color: '#f8fcf9', // matches app background
        display: 'standalone',
        start_url: '/',
        icons: [
          {
            src: 'icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: 'icons/icon-512-maskable.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ]
      },
      workbox: {
        // Only pre-cache static app shell assets (JS, CSS, HTML, fonts, images).
        // runtimeCaching is intentionally EMPTY — we do NOT intercept or cache
        // any network requests at runtime.
        //
        // Firebase Firestore and Auth use their own caching mechanisms:
        //   - Firestore: IndexedDB via persistentLocalCache (enabled in src/lib/firebase.js)
        //   - Auth: manages tokens internally
        //
        // Intercepting Firebase API requests from a service worker would conflict
        // with those internal mechanisms and break offline behavior.
        runtimeCaching: [],

        // Pre-cache patterns: all static assets produced by the build
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],

        // SPA fallback: all navigation requests → /index.html
        navigateFallback: '/index.html',

        // CRITICAL: Exclude Firebase API domains from the navigation fallback.
        // These must be handled by the network, not intercepted by the SW.
        navigateFallbackDenylist: [
          /firestore\.googleapis\.com/,
          /identitytoolkit\.googleapis\.com/,
          /securetoken\.googleapis\.com/,
          /firebaseinstallations\.googleapis\.com/,
          /firebaseapp\.com/,
          /googleapis\.com/,
          /gstatic\.com/
        ]
      }
    })
  ]
})
