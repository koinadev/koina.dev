# Yapılandırma

Paket bir zorunlu ortam değişkeni (`DATABASE_URLS`) ve bir isteğe bağlı değişken (`DATABASE_REPLICA_URLS`) okur; diğer her ayar fabrikalara (`createDb`, `createManagement`, `dbMiddleware`) verilen tipli seçenek ya da CLI bayrağıdır. Başka ortam değişkeni yoktur (`DB_DRIVER`, `RUN_INTEGRATION`, `TEST_POOLED_URLS` yalnızca testlere aittir).

## `DATABASE_URLS`

Tek bir PostgreSQL URL’si (`postgres:` veya `postgresql:`):

```sh
DATABASE_URLS=postgres://user:password@host:5432/db
```

Boş değer, birden çok URL veya schema’yı bağlantı parametresiyle yönlendiren URL `INVALID_CONFIG` verir (mesaj URL içermez). `DATABASE_REPLICA_URLS` virgüllü düz URL listesidir (en çok 8, tekil, birincilden farklı; bozuksa `loadConfig` `INVALID_CONFIG` verir, CLI’de de): [replicas.md](replicas.md). Config düz veridir: `loadConfig()` (env), `createConfig(url, replicaUrls?)` (elle; Workers, testler) → `{ url, replicas }`.

## Doğrudan ve pooler URL

Uygulama ve yönetim **aynı DB’ye, aynı kimlik bilgileriyle** bağlanır; fark bağlantı türüdür.

| Süreç | `DATABASE_URLS` neye işaret eder | Neden |
|---|---|---|
| Uygulama (`createDb`, `dbMiddleware`) | Transaction-mode pooler (PgBouncer, Supavisor, Neon pooler, Hyperdrive) | Sorgu yolu isimli prepared statement ve oturum durumu kullanmaz; sunucu timeout’ları DB varsayılanıdır. `db.ready()` sınar: doğrudan bağlantıda `POOLER_REQUIRED` |
| CLI, araçlar, `createManagement` | Doğrudan veya session pooling | migrate, seed, baseline ve restore session advisory lock tutar; transaction pooler kilidi düşürür |

Yönetim oturumu açılırken URL başına bir kez ucuz bir denetim yapılır (bağımsız bağlantı aynı backend’e düşerse ya da ayrılmış oturumun pid’i değişirse `DIRECT_CONNECTION_REQUIRED`); en iyi çabadır, `doctor` aynısını `direct_connection` olarak bildirir.

**Runtime’da pooler zorunludur.** `db.ready()` (`pooler: "verified"`, varsayılan) kısa ömürlü kendi havuzunu açar, iki ayrı bağlantıda `pg_backend_pid()` sorar (en çok on tur): pooler’da iki istemci aynı sunucu oturumunu görür, doğrudan bağlantıda görmez. Görülmezse `POOLER_REQUIRED`. Pooler gerçekse ama sınama göremiyorsa (doğrulanmamış Hyperdrive, çok yoğun pooler) `pooler: "assumed"` sınamayı bilerek atlar. Sonuç bir kez saklanır; `ready()`’yi başlangıçta ve `/ready`’de çağırın, istek yolunda değil. `ready()` çağrılmayan uygulamada zorunluluk uygulanmaz.

## Runtime seçenekleri (`createDb`)

```ts
const db = createDb({ driver: bunDriver, poolMax: 10 });                                  // DATABASE_URLS okunur
const other = createDb(createConfig("postgres://user:password@host:5432/db"), { driver: bunDriver, schema: "app" });
```

Sayısal seçenekler 1 ile üst sınır arasında tam sayıdır; dışı `INVALID_CONFIG`.

| Seçenek | Varsayılan | Üst sınır | Anlamı |
|---|---:|---:|---|
| `driver` | zorunlu | | `bunDriver`, `postgresDriver`, `pgDriver`, `neonDriver` |
| `schema` | `"public"` | | Tabloların schema’sı; her sorgu `"<schema>".tablo` olarak bağlanır. Küçük harf, rakam, `_`; en çok 63 bayt; `pg_*` ve `information_schema` yasak (`INVALID_SCHEMA`) |
| `poolMax` | 5 | 100 | Havuz boyutu; her replica aynı boyutta kendi havuzunu açar |
| `statementTimeoutMs` | 5000 | 300000 | Bağlantı edinme deadline’ı; deyim `statementTimeoutMs + 1 sn` içinde yanıtlanmazsa iptal edilir, bağlantı atılır, `DATABASE_TIMEOUT` |
| `idleTimeoutSeconds` | 20 | 300 | Boştaki bağlantının ömrü |
| `maxLifetimeSeconds` | 300 | 3600 | Bağlantının en uzun ömrü |
| `replicaMaxLagMs` | 5000 | 3600000 | Bunu aşan lag’li replica kullanılmaz |
| `replicaStatusMs` | 5000 | 60000 | Replica durumunun önbellek süresi |
| `replicaOnUnavailable` | `"primary"` | `"primary"` \| `"error"` | Sağlıklı replica yokken okuma primary’de (replica yapılandırılmamışsa tek deyim; yapılandırılmış ama kullanılamıyorsa `READ ONLY` transaction) ya da `REPLICA_UNAVAILABLE` |
| `pooler` | `"verified"` | `"verified"` \| `"assumed"` | Yukarıya bakın |
| `onSpan` | yok | | Ölçüm ([telemetry.md](telemetry.md)) |

Bağlantı bekleyen iş sayısı 64’ü aşarsa `DATABASE_BUSY`. Dönen nesne: `query`, `transaction`, `read.query`, `replicas()`, `ready()`, `close()`, `schema`, `config` ([queries.md](queries.md)).

## Yönetim seçenekleri (`createManagement`)

```ts
const management = createManagement({ driver: postgresDriver, schema: "public" }); // DATABASE_URLS: doğrudan URL
await management.close();
```

`replicaOnUnavailable` ve `pooler` dışındaki runtime sınırlarını alır; ek olarak `migrationStatementTimeoutMs` (30000, en çok 3600000), `migrationLockTimeoutMs` (1000, en çok 60000), `schema` ve `onSpan`. Yönetimde `statementTimeoutMs` bağlantı deadline’ı değil, `migrate`’in DB varsayılanı olarak yazdığı runtime `statement_timeout` değeridir; `poolMax` yönetim havuzunu belirlemez (sabit 4). CLI bu seçenekleri değiştiremez, varsayılanlarla çalışır ve yalnızca `--schema` alır. **Uygulamanın `statementTimeoutMs`’i `migrate`’in yazdığıyla aynı olmalıdır:** sunucu tarafı timeout DB varsayılanından gelir, uygulamanınki yalnızca istemci deadline’ıdır.

## Sürücüler

| | `bunDriver` | `postgresDriver` | `pgDriver` | `neonDriver` |
|---|---|---|---|---|
| Import | `@koina/db/drivers/bun` | `.../drivers/postgres` | `.../drivers/pg` | `.../drivers/neon` |
| Paket | yok (yalnızca Bun) | `postgres` | `pg` | `@neondatabase/serverless` |
| Ortam | Bun | Bun, Node, Workers | Bun, Node, Workers (`nodejs_compat`) | Workers/edge, Bun, Node (WebSocket) |
| CLI | varsayılan | `--driver=postgres` | `--driver=pg` | yok (yalnızca runtime) |

Runtime girişi sürücü yüklemez; bundle yalnızca import ettiğinizi içerir. Sürücüler isimli prepared statement kullanmaz (PgBouncer/Hyperdrive güvenli); transaction, timeout, iptal ve kilitler sürücülerin üstündeki motor kodudur, davranış dört sürücüde aynıdır. Değer tipleri sürücüden bağımsızdır: int8/numeric `string`; int2/int4/float4/float8 `number`; timestamptz `Date`; date UTC gece yarısı `Date`; json/jsonb ayrıştırılmış değer; uuid/interval/time/inet/cidr/macaddr/tsvector/tsquery/aralık tipleri `string` (yalnızca scalar); bytea `Buffer`; diziler JS dizisi. `Date` parametresi ISO UTC metnine çevrilir; JSON’u `JSON.stringify` + `$1::text::jsonb` ile gönderin.

## Timeout’lar ve iptal

- `migrate` runtime ayarlarını DB varsayılanı olarak yazar (`statement_timeout`, `lock_timeout = min(statementTimeoutMs, 1000)`, `client_connection_check_interval = 1000`; PostgreSQL 14+): her yeni backend’e uygulandığı için sunucu tarafı iptal PgBouncer transaction pooling ve Hyperdrive’da da çalışır. Bu **DB sahipliği ister** ve değer değişince yeniden `migrate` + pooler yenilemesi gerekir: [operations.md](operations.md#migratein-veritabanına-yazdıkları).
- Bağlantı edinmenin ve her deyimin istemci deadline’ı vardır: edinme `statementTimeoutMs` içinde, yanıt `statementTimeoutMs + 1 sn` içinde gelmezse `DATABASE_TIMEOUT` verilir (sunucunun `57014`’ü de öyle).
- Süresi dolan deyim iptal edilir (sürücü destekliyorsa) ve cevabı için 0,5 sn daha beklenir: bu sürede gelen cevap olduğu gibi döner, gelmezse `DATABASE_TIMEOUT` (en kötü gecikme `statementTimeoutMs + 1,5 sn`). Bağlantı atılır; transaction’da süresi dolan deyimden sonra `COMMIT` dahil hiçbir deyim gönderilmez, sunucu işi geri alır. postgres.js ve pg deyimi sunucuda iptal eder, Bun SQL ve Neon sürücüsü edemez (sunucu deyimi `client_connection_check_interval` ile keser). Tek yapısal belirsizlik: `COMMIT` sunucuya ulaşıp yanıtı gelmeden deadline dolarsa commit olmuş olabilir.

## Deploy

**Bun sunucusu.** `createDb({ driver: bunDriver })` süreç başına bir kez; SIGTERM’de `await db.close()`. `DATABASE_URLS` transaction pooler’a gitmeli; yönetim komutları (`bun run db:migrate`) doğrudan URL’yle deploy adımında çalışır.

**Cloudflare Workers + Hyperdrive.** `postgresDriver` veya `pgDriver` (Bun SQL Workers’ta çalışmaz), `compatibility_flags: ["nodejs_compat"]`. `ready()` sınaması Hyperdrive’da doğrulanmadı: `pooler: "assumed"`. Hyperdrive’ı caching kapalı oluşturun (`wrangler hyperdrive create <ad> --connection-string="postgres://..." --caching-disabled`). Havuzu istek başına kurup yanıttan sonra kapatın; yönetim işlerini Worker’dan çalıştırmayın. `bun run build:workers` runtime girişinin Workers için paketlendiğini doğrular.

```ts
export default {
  async fetch(_request: Request, env: { DB: { connectionString: string } }, ctx: ExecutionContext) {
    const db = createDb(createConfig(env.DB.connectionString), { driver: postgresDriver, poolMax: 1, pooler: "assumed" });
    try {
      return Response.json(await findUsers(db.read, 20));
    } finally {
      ctx.waitUntil(db.close().catch(() => {}));
    }
  },
};
```

**Neon serverless sürücüsü.** WebSocket `Pool` kullanır; Workers/edge içindir, isteğe bağlı bağımlılıktır (`bun add @neondatabase/serverless`). Neon `-pooler` URL’siyle, havuz istek başına (`poolMax: 1`). Yalnızca runtime: yönetim pg/postgres/bun ve doğrudan URL ister. **`cancel` yoktur** (Workers’ta TCP yok): deadline sonrası bağlantı atılır, sunucu deyimi `client_connection_check_interval` ile keser. HTTP `neon()` fonksiyonu desteklenmez. Bun ve Node ≥ 22 global `WebSocket` kullanır; eski Node’da `neonConfig.webSocketConstructor` ayarlayın. Yerel testte `compose.yaml`’daki `wsproxy` (`:5489`) kullanılır: `DB_DRIVER=neon bun run test:integration`.

**PgBouncer.** `pool_mode = transaction` ve `max_prepared_statements = 0` (pakettekiyle gelir). `doctor --pgbouncer-url` genel `pool_mode`’u okur (URL gizli girişle sorulur); DB/kullanıcı override’larını `SHOW POOLS` ile ayrıca doğrulayın.
