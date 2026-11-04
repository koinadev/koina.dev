# Başlangıç

Paketi boş bir monorepo’ya alıp yerelde çalışan bir uygulamaya götürür: kopyalama, yerel PostgreSQL + PgBouncer, migration, ilk sorgu ve küçük bir Hono uygulaması.

## Gereksinimler

- **Bun 1.3.14+.** Daha eski sürümlerde Bun SQL, PgBouncer arkasında “unnamed prepared statement does not exist” hatası verir.
- **Docker Compose** (yerel PostgreSQL ve PgBouncer için).

## 1. Kopyalayın

```sh
cp -R <kaynak>/packages/db-single packages/db-single   # kök package.json: "workspaces": ["packages/*"]
bun install
```

Uygulama paketine `"@koina/db": "workspace:*"` ekleyin (sürücüye göre `postgres`, `pg` veya `@neondatabase/serverless`; [auth](auth.md) için tam `better-auth@1.7.5`). Bundan sonra klasör sizindir: `src/queries`, `src/repositories`, `src/migrations`, `src/seeds` altında çalışın, `src/core`’a gerekmedikçe dokunmayın.

## 2. Yerel veritabanı

```sh
cd packages/db-single
cp .env.example .env                      # DATABASE_URLS = tek doğrudan URL (yerel demo parolası)
docker compose -p dbsingle up -d --wait   # postgres :5560 (doğrudan), pgbouncer :5563 (transaction pooling)
```

Komutlar `packages/db-single` içinde çalışır (kökten `bun run single <script>`); Bun `.env`’i kendiliğinden okur. CLI doğrudan portu, uygulama PgBouncer’ı kullanır ([configuration.md](configuration.md#doğrudan-ve-pooler-url)).

## 3. Migration

```sh
bun run db:migrate   # ilerleme olayları, sonra {"dryRun": false, "migrations": ["<zaman>_auth"]}
bun run db:status    # {"schema": "public", "applied": 1, "pending": []}
```

`migrate` schema yoksa kurar, `_migrations` ledger’ını açar, bekleyenleri uygular ve runtime timeout’larını DB varsayılanı olarak yazar; bu **DB sahipliği ister** ([operations.md](operations.md#migratein-veritabanına-yazdıkları)). Her deploy’da çalıştırılabilir.

## 4. İlk migration ve sorgu

```sh
bun run db:generate add_user_phone   # src/migrations/<UTC zaman>_add_user_phone.sql
```

Dosyayı doldurun (boş şablon doldurulana kadar `codegen` ve DB komutları hata verir; dosyayı silip `bun run db:codegen` da çalışır):

```sql
--up
ALTER TABLE users ADD COLUMN phone text;
--down
ALTER TABLE users DROP COLUMN phone;
```

`src/queries/users.sql` dosyasına sorgu ekleyin ve derleyin:

```sql
-- name: setUserPhone
UPDATE users SET phone = $2::text, updated_at = now() WHERE id = $1::uuid RETURNING *
```

```sh
bun run db:codegen      # users.gen.ts, migration listesi, zod tablo tipleri (DB gerekmez)
bun run db:migrate
```

`SELECT *` / `RETURNING *` codegen’de açık sütun listesine genişler; yeni `phone` sütunu `users` sorgularının satırlarında kendiliğinden görünür. Better Auth’a tanıtmak için [auth.md](auth.md#tablolar-ve-eşlemeler). Ayrıntı: [queries.md](queries.md), [migrations-and-seeds.md](migrations-and-seeds.md).

## 5. Uygulama

Uygulama paketinde `src/server.ts` (`hono` bağımlılığıyla):

```ts
import { Hono } from "hono";
import { createDb } from "@koina/db";
import { bunDriver } from "@koina/db/drivers/bun";
import { dbMiddleware, type RequestDb } from "@koina/db/middleware";
import { findUserByEmail, findUsers } from "@koina/db/repositories/users";

const db = createDb({ driver: bunDriver }); // DATABASE_URLS okunur
await db.ready();                           // pooler’sız (doğrudan) URL varsa başlamaz

const app = new Hono<{ Variables: { db: RequestDb } }>();
app.use(dbMiddleware({ database: db }));
app.get("/users", async (c) => c.json(await findUsers(c.get("db").read, 20)));
app.get("/users/:email", async (c) => c.json(await findUserByEmail(c.get("db").read, c.req.param("email"))));

export default { port: 3000, fetch: app.fetch };
```

PgBouncer’a bağlanarak çalıştırın (`:5563`, `.env` ile aynı kullanıcı/parola/DB):

```sh
export DATABASE_URLS=postgres://user:password@127.0.0.1:5563/app
bun src/server.ts
curl http://127.0.0.1:3000/users
```

Sonraki adımlar: HTTP durum eşlemesi, `/ready`, kapanış ([middleware-and-jobs.md](middleware-and-jobs.md)); izleme ([telemetry.md](telemetry.md)). Temizlik: `docker compose -p dbsingle down -v` (tüm veri silinir).

## Sık hatalar

- **`POOLER_REQUIRED`** — uygulamanın `DATABASE_URLS`’i doğrudan porta (5560) gidiyor; PgBouncer adresini (`:5563`) kullanın. Sınanamayan ortamlarda bilerek `pooler: "assumed"`.
- **`DIRECT_CONNECTION_REQUIRED`** — CLI PgBouncer adresiyle çalıştırıldı; yönetim session advisory lock tutar, `.env`’deki doğrudan URL’yi kullanın.
- **Import bulunamıyor / `codegen --check` başarısız** — SQL veya migration değişti, `bun run db:codegen` çalışmadı.
- **CLI yanlış klasörde** — `.env` ve `src/migrations` çalışma klasörüne göredir; `packages/db-single` içinde çalıştırın.
