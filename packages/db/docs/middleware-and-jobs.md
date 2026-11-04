# Middleware ve arka plan işleri

`@koina/db/middleware` HTTP isteğine `db` nesnesi ekler; aynı nesne HTTP dışında (cron, kuyruk, Worker `scheduled`) `createDbScope` ile kurulur.

## `dbMiddleware`

Bağımlılığı yoktur; `c.set("db", value)` olan her `(c, next)` middleware’i ile çalışır (Hono). `c.get("db")` bir `RequestDb`’dir: `query`, `transaction`, `read.query` ([queries.md](queries.md)); repository fonksiyonlarına doğrudan verilir.

```ts
import { createDb } from "@koina/db";
import { bunDriver } from "@koina/db/drivers/bun";
import { dbMiddleware, type RequestDb } from "@koina/db/middleware";
import { findUserByEmail, findUsers } from "@koina/db/repositories/users";

const db = createDb({ driver: bunDriver, poolMax: 10 });
await db.ready();

const app = new Hono<{ Variables: { db: RequestDb } }>();
app.use(dbMiddleware({ database: db }));
app.get("/users", async (c) => c.json(await findUsers(c.get("db").read, 20)));        // replica ya da primary
app.get("/users/:email", async (c) => c.json(await findUserByEmail(c.get("db"), c.req.param("email"))));
```

| Seçenek | Anlamı |
|---|---|
| `database` | Uygulamanın `createDb` örneği (önerilen): `ready()`, Better Auth ve kapanış aynı havuzu kullanır. `driver` ve `perRequest` ile birlikte verilemez (`INVALID_CONFIG`); `config` ve havuz açan seçenekler yok sayılır |
| `driver` | `database` yoksa havuzu middleware ilk istekte kendisi açar. `database` ile `driver`’dan tam biri verilmelidir |
| `config` | `driver` ile: `Config` veya `(c) => Config`; varsayılan `loadConfig()`, Workers’ta binding’lerden |
| `perRequest` | `driver` ile: istek başına `poolMax: 1` havuz, `next()` bitince kapanır (Workers/Hyperdrive) |
| `schema`, `pooler`, `onSpan`, `poolMax`, ... | Açtığı havuzun seçenekleri ([configuration.md](configuration.md#runtime-seçenekleri-createdb)) |

Geçersiz birleşim (ikisi de ya da hiçbiri; `database` ile `perRequest`) kurulumda `INVALID_CONFIG` verir.

Yazdığını okuma ve replica sabitleme davranışı için [replicas.md](replicas.md).

### HTTP durum eşlemesi (örnek)

```ts
const STATUS: Record<string, number> = { "23505": 409, DATABASE_UNAVAILABLE: 503, DATABASE_BUSY: 503, REPLICA_UNAVAILABLE: 503, DATABASE_TIMEOUT: 504 };
app.onError((error, c) => {
  const raw = errorCode(error);
  // PgBouncer 08P01, kopan bağlantı gibi hatalar tek koda iner: DATABASE_UNAVAILABLE (503). 504 yalnızca DATABASE_TIMEOUT.
  const code = STATUS[raw] === undefined && databaseUnavailable(error) ? "DATABASE_UNAVAILABLE" : raw;
  return c.json({ error: code }, (STATUS[code] ?? 500) as 500);
});
```

### Hazırlık ve kapanış

```ts
app.get("/ready", async (c) => {
  try { await db.ready(); return c.json({ ready: true }); }
  catch (error) { return c.json({ ready: false, error: errorCode(error) }, 503); }
});

const server = Bun.serve({ port: 8080, idleTimeout: 30, fetch: app.fetch });
process.once("SIGTERM", async () => { await server.stop(); await db.close(); });
```

`db.ready()` kapalı DB’de de sınırlıdır (her adım `statementTimeoutMs + 1 sn`) ama Bun’ın varsayılan `idleTimeout`’unu (10 sn) aşabilir: sonucu sağlık uç noktasında önbelleğe alın ya da `idleTimeout`’u büyütün.

## Workers: istek başına havuz

```ts
app.use(dbMiddleware({
  driver: postgresDriver,
  perRequest: true,
  pooler: "assumed", // Hyperdrive’da ready() sınaması doğrulanmadı
  config: (c) => createConfig(c.env.DB.connectionString),
}));
```

Hyperdrive caching kapalı olmalı, sürücü `postgresDriver` veya `pgDriver` ([configuration.md](configuration.md#deploy)).

## HTTP dışında

Cron, kuyruk tüketicisi ve Worker `scheduled`’da çoğunlukla kapsam gerekmez: `Db`’yi (ya da repository fonksiyonlarını `db` ile) doğrudan kullanın; `createDb` süreç başına bir kez (Workers’ta çağrı başına `poolMax: 1`, `ctx.waitUntil(db.close())`). İstek için yazılmış kod (`RequestDb` bekleyen servis) bir işte aynı yazdığını-okuma davranışıyla çalışacaksa `createDbScope(db)` aynı nesneyi kurar; kapsam havuz tutmaz, `db`’yi açan kapatır. Tekrar denenen kuyruk işlerinde `23505`’i yazı idempotent ise başarı sayın.

## Sık hatalar

- **`INVALID_CONFIG: dbMiddleware needs either database or driver`** — ikisini birden (veya hiçbirini) verdiniz, ya da `database` ile `perRequest`.
- **İki havuz** — `createDb` açıp middleware’e `driver` de verirseniz bağlantı sayısı ikiye katlanır ve `db.close()` middleware’inkini kapatmaz; `database` kullanın.
- **Workers’ta “Cannot perform I/O on behalf of a different request”** — havuz istekler arasında paylaşıldı; `perRequest: true`.
