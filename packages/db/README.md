# @koina/db — tek veritabanı, tek schema’lı PostgreSQL paketi

Bun + zod; sürücü olarak Bun SQL, postgres.js, pg veya Neon serverless. Klasik yönetilen PostgreSQL (Neon, Supabase, RDS) için: **tek DB, tek schema** (varsayılan `public`). Uygulama SQL’i önceden derlenir (`bun run db:codegen`), çalışma anında SQL ayrıştırılmaz. Migration ve seed’ler `.sql` dosyalarıdır, ledger’ları aynı schema’dadır. CLI, yedek/geri yükleme, `doctor`, replica okuması, Neon/Supabase araçları ve Better Auth bağdaştırıcısı pakettedir.

**Kopyala ve devam et** şablonudur: `packages/db-single` klasörünü kendi monorepo’nuzun `packages/` altına taşıyıp `src/queries`, `src/repositories`, `src/migrations` ve `src/seeds` altında çalışın. `@repo/db-multi`’ye bağımlı değildir; schema’sı müşteri başına ayrılan çok DB’li kurulum için kardeş paket `packages/db-multi` kullanılır ([neden ayrı](docs/from-multi.md)).

## Hızlı başlangıç

```sh
cd packages/db-single
cp .env.example .env                      # DATABASE_URLS: tek doğrudan URL (yalnızca yerel demo parolası)
docker compose -p dbsingle up -d --wait   # PostgreSQL :5560 (doğrudan), PgBouncer :5563 (transaction pooling)
bun run db:migrate                        # schema, ledger’lar ve Better Auth tabloları
```

CLI doğrudan portu kullanır; uygulama transaction pooler ister, bu yüzden PgBouncer’a (`:5563`, `.env` ile aynı kullanıcı/parola/DB) bağlanın. `"@koina/db": "workspace:*"` bağımlılığı olan bir uygulama paketinde:

```ts
// DATABASE_URLS=postgres://user:password@127.0.0.1:5563/app bun src/first-query.ts
import { createDb } from "@koina/db";
import { bunDriver } from "@koina/db/drivers/bun";
import { createUser, findUserByEmail } from "@koina/db/repositories/users";

const db = createDb({ driver: bunDriver }); // DATABASE_URLS okunur; süreç başına bir kez
await db.ready();                           // pooler’sız URL’de POOLER_REQUIRED
await createUser(db, { name: "Ada", email: "ada@example.com" });
console.log(await findUserByEmail(db, "ada@example.com"));
await db.close();
```

Devamı: [docs/getting-started.md](docs/getting-started.md).

## `src` düzeni

| Yol | İçerik |
|---|---|
| `src/queries/<alan>.sql` → `<alan>.gen.ts` | `-- name:` blokları ve üretilmiş sorgular (örnek: `users.sql`) |
| `src/repositories/<alan>/` | sorgu başına bir fonksiyon (örnek: `users/`) — [docs/queries.md](docs/queries.md#queries-ve-repositories-katmanı) |
| `src/migrations/`, `src/seeds/` | `--up`/`--down` migration’ları ve seed’ler; pakette tek migration var: Better Auth tabloları |
| `src/tables/<tablo>.gen.ts` | migration’lardan üretilen zod tablo şemaları |
| `src/core/` | motor (sürücüler, derleyici, runner, araçlar, CLI); nadiren değişir |

`*.gen.ts` dosyaları `bun run db:codegen` ile üretilir; elle değiştirmeyin, kaynağıyla birlikte commit edin (`codegen --check` CI’da eskiyi yakalar).

## Girişler (`package.json` `exports`)

| Giriş | İçerik |
|---|---|
| `@koina/db` | `createDb`, `createConfig`, `loadConfig`, `AppError`, `errorCode`, `databaseUnavailable`, tipler |
| `@koina/db/middleware` | `dbMiddleware`, `createDbScope`, `RequestDb` |
| `@koina/db/management` | `createManagement`, `migrate`, `rollback`, `baseline`, `migrationStatus`, `seed`, `prepareQuery`, `SeedContext` |
| `@koina/db/tools` | `exportSchema`, `backupSchema`, `restoreSchema`, `pruneBackups`, `doctor`, `replicaReport`, `pullSchema`, Neon araçları, `supabaseSafetyPoint` |
| `@koina/db/auth` | `createAuth`, `importedPasswords`, `authTables`, `twoFactorTables`, `rateLimitTable` (isteğe bağlı peer `better-auth`) |
| `@koina/db/telemetry` | `openTelemetry`, `sentry` |
| `@koina/db/drivers/bun\|postgres\|pg\|neon` | sürücüler; yalnızca import edilen bundle’a girer |
| `@koina/db/queries/<alan>`, `repositories/<alan>`, `tables/<tablo>` | üretilmiş sorgular, repository fonksiyonları, zod tablo şemaları (örn. `@koina/db/queries/users`) |

Paket TypeScript kaynağı olarak dışa aktarılır; tüketen uygulama Bun veya bir bundler ile çalışır.

## Script’ler

`cli` ([docs/cli.md](docs/cli.md)), `db:migrate`, `db:rollback`, `db:status`, `db:seed`, `db:generate`, `db:generate:seed`, `db:generate:auth`, `db:pull`, `db:codegen`, `test`, `test:integration`, `typecheck`, `lint`, `format`, `build`, `build:workers`, `verify:provider`. Kökten: `bun run single <script>` ve `single:*` kısayolları.

## Belgeler

[docs/README.md](docs/README.md) içindekiler ve okuma sırasıdır.
