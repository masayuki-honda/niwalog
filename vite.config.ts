import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['icons/icon-192.svg', 'icons/icon-512.svg'],
      manifest: {
        name: '家庭菜園日記',
        short_name: '菜園日記',
        description: '家庭菜園の栽培記録・環境データ・分析をまとめて管理するWebアプリ',
        start_url: '/niwalog/',
        scope: '/niwalog/',
        display: 'standalone',
        background_color: '#f0fdf4',
        theme_color: '#15803d',
        orientation: 'portrait-primary',
        icons: [
          {
            src: 'icons/icon-192.svg',
            sizes: '192x192',
            type: 'image/svg+xml',
            purpose: 'any',
          },
          {
            src: 'icons/icon-512.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
            purpose: 'any',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,json}'],
        navigateFallback: '/niwalog/index.html',
        navigateFallbackDenylist: [/^\/niwalog\/api/],
        runtimeCaching: [
          {
            // Google API リクエスト: NetworkOnly（常にフレッシュ）
            urlPattern: /^https:\/\/(sheets|www)\.googleapis\.com\/.*/i,
            handler: 'NetworkOnly',
          },
          {
            // Google Drive サムネイル画像: StaleWhileRevalidate + キャッシュ制限
            urlPattern: /^https:\/\/lh[0-9]*\.googleusercontent\.com\/.*/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'drive-thumbnails',
              expiration: {
                maxEntries: 200,
                maxAgeSeconds: 60 * 60 * 24 * 7, // 7日間
              },
            },
          },
          {
            // Open-Meteo API: NetworkFirst（キャッシュフォールバックあり）
            urlPattern: /^https:\/\/api\.open-meteo\.com\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'weather-api',
              expiration: {
                maxEntries: 30,
                maxAgeSeconds: 60 * 60 * 6, // 6時間
              },
              networkTimeoutSeconds: 10,
            },
          },
        ],
      },
    }),
  ],
  base: '/niwalog/',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
