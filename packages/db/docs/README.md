# @koina/db belgeleri

Paket kökündeki [README](../README.md) kısa özet ve hızlı başlangıç verir; ayrıntılar burada. Örneklerdeki içe aktarımlar yalnızca paketin açık girişlerini (`package.json` `exports`) kullanır; bağlantıları, CLI tablosunu, hata tablosunu ve import yollarını `src/__tests__/unit/docs.test.ts` denetler.

1. [getting-started.md](getting-started.md) — kopyalama, yerel DB, ilk migration, ilk sorgu, çalışan Hono uygulaması.
2. [configuration.md](configuration.md) — `DATABASE_URLS`, `createDb`/`createManagement` seçenekleri, doğrudan ve pooler URL’si, timeout’lar, sürücüler, deploy.
3. [queries.md](queries.md) — SQL dosyaları, codegen, sorgu çalıştırma, transaction, queries/repositories katmanı, zod tabloları.
4. [migrations-and-seeds.md](migrations-and-seeds.md) — dosya biçimi, geri alma, baseline, seed, var olan DB’den `pull`.
5. [middleware-and-jobs.md](middleware-and-jobs.md) — `dbMiddleware`, Workers, `createDbScope`, cron/kuyruk.
6. [replicas.md](replicas.md) — replica okuması, düşme politikası, `replicas` ve `--from-replica`.
7. [auth.md](auth.md) — Better Auth, `auth generate`, aktarılmış parolalar.
8. [cli.md](cli.md) — her komut, seçenekler, çıkış kodları, gizli girişler.
9. [operations.md](operations.md) — deploy sırası, `migrate`’in yazdıkları, `doctor`, yedek/geri yükleme.
10. [providers.md](providers.md) — Neon, Supabase, RDS ve sağlayıcı araçları.
11. [errors.md](errors.md) — hata kodu → ne zaman → ne yapmalı.
12. [telemetry.md](telemetry.md) — `onSpan`, OpenTelemetry, Sentry.
13. [from-multi.md](from-multi.md) — `db-multi` ile ilişki, neyin olmadığı ve nedeni.
