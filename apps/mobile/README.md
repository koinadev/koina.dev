# apps/mobile — Koina uygulaması

Expo SDK 58, Expo Router (sistem sekme çubuğu), React Query. İçerik siteyle aynı kaynaktan
(`@koina/web/content`), renk ve logo `@koina/shared/brand`, API tipleri `@koina/shared/api`.

Sekmeler: **Ana sayfa** (canlı yayın geri sayımı, küçük adımlar), **Takvim** (yayınlar ve
etkinlikler, "ben de geliyorum"), **Topluluk** (akış, projeler, üyeler), **Keşfet** (bilgi
sayfaları ve bağlantılar), **Profil** (e-posta koduyla giriş, profil, hesap silme).

```bash
cp .env.example .env.local   # yerel API'ye bağlanmak için; yoksa canlı API kullanılır
bun run start                # i: iOS simülatörü, a: Android emülatörü
bun run check && bun run lint
bun run icons                # simge, açılış görseli ve sekme ikonlarını yeniden üretir
```

Sekme ikonları Hugeicons'tan PNG olarak üretilir (`scripts/build-icons.ts`); sistem sekme
çubuğu SVG kabul etmiyor. Uygulama içindeki diğer ikonlar `@hugeicons/react-native` ile çizilir.

Mağaza derlemesi EAS ile: `bunx eas-cli build --platform ios` (Expo hesabı ve Apple geliştirici
hesabı gerekir). Paket kimliği `dev.koina.app`.
