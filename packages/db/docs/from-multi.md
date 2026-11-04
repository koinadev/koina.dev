# `db-multi`’den: burada neden tenant yok

`@koina/db`, `@repo/db-multi`’nin kopyalanıp tenant’la ilgili her şeyin silinmesiyle yapıldı. Bu dosya, paketin çok-tenant sözlüğünü (tenant, placement, platform DB’si) bilerek kullandığı tek yerdir: `src/__tests__/unit/no-multi-tenant.test.ts` bu sözlüğü kaynak, manifest ve compose dosyalarından uzak tutar, bu not onun belgelenmiş gerekçesidir.

| | `db-multi` | `db-single` |
|---|---|---|
| Yapı | çok DB, tenant başına bir schema, tenant’ın nerede yaşadığını tutan platform DB’si | **tek DB, tek schema** (varsayılan `public`) |
| Ortam | `DATABASE_URLS` birden çok URL (sıra kimliktir) | `DATABASE_URLS` tam bir URL |
| Kimin için | tek kod tabanından çok tenant’a hizmet veren uygulama | tek tablo takımlı klasik yönetilen PostgreSQL (Neon, Supabase, RDS) |
| Sorgu hedefi | her çağrıda seçilir (`withTenant`, `withNode`, `withPlatform`) | `createDb`’de bağlanan tek schema |

İki paket bilerek ayrıdır: `db-single` `db-multi`’ye bağımlı değildir, ikisi de tek başına kopyalanır. Bedeli tam kopyadır: derleyici, sürücü ve araç düzeltmeleri iki yerde yapılır ve ikisi sapabilir; ortak bir `@repo/db-sql` paketi kapsam dışı bırakıldı.

## İkisi arasında otomatik geçiş yoktur

`db-multi` kodu veriye tenant bağlamıyla erişir, `db-single`’da bağlam yoktur: sorgu, middleware ve auth bağlantısı çevrilmez, yeniden yazılır. Adlar: `createDatabase` → `createDb`; `db.withTenant(id, (t) => t.query(q))` ve `c.get("db").tenant.query(q)` → `db.query(q)` ve `c.get("db").query(q)`; `withTenantRead`/`tenantRead` → `db.read.query`; `createTenantAuth` → `createAuth`; `src/queries/tenant/*.sql` ve `src/migrations/tenant/*.sql` → `src/queries/*.sql` ve `src/migrations/*.sql`. Veriyi taşıyan araç yoktur; `pull` herhangi bir schema’yı okuyabildiği için bir tenant schema’sından başlangıç migration’ını çıkarabilir ([migrations-and-seeds.md](migrations-and-seeds.md#var-olan-veritabanından-başlangıç-migrationı-pull)), satırları taşımak size (`pg_dump`, `COPY`) kalır.

## Neler yok, neden

- **Tenant kavramı:** tenant/placement/node/platform kapsamları, `withTenant`/`withNode`/`withPlatform`, `provision`, `move`, `copy`, `adopt`, platform-merge/-move, ayrılmış ID, kapasite ve yer seçimi, `databases`. Tek hedef var; “hedef her çağrıda açık” ilkesi kendiliğinden sağlanır. `createDbScope(db)` yalnızca yazdığını-okuma için kaldı.
- **Yönetim iskeleti:** `bootstrap`, `platform` schema’sı, DB kimliği koruması (`DATABASE_ORDER_CHANGED`), `migration-recover` ve kalıcı runner işareti. Tek URL’de sıra ve karışacak DB yok; ledger’lar (`_migrations`, `_seeds`) uygulama schema’sında, her adım yeniden denenebilir.
- **Toplu işler:** `migrate-all`, `seed-all`, `demo-reset`, install/demo seed profilleri; tek schema’da `migrate` ve `seed` yeter.
- **jamaster’a özgü araçlar:** `users import`, `dump *`, `app-migrate`, `import-users`.
- **Auth:** `student`/`teacher` türleri, tenant başına secret/çerez öneki/önbellek, `createPlatformAuth`, `user_imports`; izole edilecek bir şey yok.
- **Ölçüm:** `bench*` script’leri (ölçek ve kapasite ayrı alt projedir).

Kalanlar: üç sürücü ve Neon sürücüsü, SQL derleyici ve codegen, pooler zorunluluğu ve probu, deadline/timeout, telemetri, replica okuması, Neon/Supabase doğrulama ve araçları, yedek/restore/export, `doctor`, `pull`, `replicas` ve Better Auth bağdaştırıcısı.
