# Upstream

`packages/db`, `db-single` paketinin kopyasıdır; nafru-email'in `packages/db`'sinin ilk alındığı hâlinden (nafru-email
commit `f72d50f7`, db-single `9773fe1`) alındı.

- Çekirdek (`src/core/**`, `src/{index,middleware,management,tools,auth,telemetry}.ts`, `docs/`) burada elle değiştirilmez;
  gereken değişiklik önce `db-single`'da yapılır, sonra yeniden kopyalanır.
- `src/migrations/20261005094046_auth.sql` upstream ile bayt bayt aynıdır (ledger sağlama toplamı).

## Yerel sapmalar

1. `@nafru-email/db` → `@koina/db` (metin değişikliği).
2. `package.json`: sürümler doğrudan yazıldı (catalog yok); `lint`, `build`, `build:workers`, `verify:provider` betikleri ve
   `eslint.config.js` kaldırıldı (Koina'da kök ESLint yapılandırması yok); `check` = `tsc` + `codegen --check`;
   `infra:up` / `infra:down` eklendi.
3. Bütünleşik ve sağlayıcı testleri (`src/__tests__/integration`, `src/__tests__/provider`) ile `users` tablosu genişlediği için
   geçersizleşen `unit/repositories.test.ts` alınmadı.
4. `compose.yaml` yalnız Postgres + PgBouncer, `466xx` portları; `local/` altında iki veritabanı (`koina`, `koina_test`).

## Bizim eklediklerimiz

`src/migrations/*_koina_*.sql`, `src/queries/*.sql` (users ve health dışındakiler), `src/repositories/*` (users ve health
dışındakiler), üretilen `src/tables/`.
