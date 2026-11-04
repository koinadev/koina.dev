// Varsayılanlar canlı ortam; yerel API için `.env.local` (bkz. .env.example).
export const API_URL = (process.env.EXPO_PUBLIC_API_URL || 'https://koina-api.0furkancolak.workers.dev').replace(/\/+$/, '');
// Site henüz kendi alan adında yayında değil; o zamana kadar Workers adresi.
export const SITE_URL = (process.env.EXPO_PUBLIC_SITE_URL || 'https://koina-site.0furkancolak.workers.dev').replace(/\/+$/, '');
// Web uygulaması: paylaşılan gönderi ve profil bağlantıları buraya gider.
export const APP_URL = (process.env.EXPO_PUBLIC_APP_URL || 'https://koina-app.0furkancolak.workers.dev').replace(/\/+$/, '');
