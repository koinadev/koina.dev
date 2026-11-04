# Telemetri

`@koina/db/telemetry` paketin ölçüm olaylarını (`onSpan`) OpenTelemetry veya Sentry span’lerine çevirir: bağlantı bekleme, sorgu ve transaction süreleri ile migration, geri alma ve seed adımları izlerinizde görünür. Girişin bağımlılığı yoktur; tracer’ı veya Sentry nesnesini uygulama verir.

```ts
import { trace } from "@opentelemetry/api";
import { openTelemetry } from "@koina/db/telemetry";

const db = createDb({ driver: bunDriver, onSpan: openTelemetry(trace.getTracer("app")) });
```

```ts
import * as Sentry from "@sentry/bun";
import { sentry } from "@koina/db/telemetry";

const db = createDb({ driver: bunDriver, onSpan: sentry(Sentry) });
```

Aynı işleyici yönetim bağlamına da verilir: `createManagement({ driver, onSpan })`; CLI span üretmez. `dbMiddleware` kendi `onSpan`’ini yalnızca havuzu kendisi açtığında kullanır; `database` seçeneğiyle `Db`’nin `onSpan`’i geçerlidir.

## Nasıl çalışır

- İşleyici her olayda bir span başlatır (`startTime` = işin başlangıcı), öznitelikleri yazar ve `startTime + ms` anında bitirir.
- Span, **iş bittiği anda aktif olan context’e** bağlanır: sorgu bir HTTP isteğinin span’i içinde beklenirse DB span’leri o isteğin altında görünür (tracer’ın async context yayılımı açık olmalı: OpenTelemetry SDK’sı `--preload` ile yüklenmeli, DB işi istek span’i bitmeden bitmeli).
- İş hata verirse span durumu hata olur (kod 2), mesajı paketin kararlı hata kodudur. İşleyici veya exporter hata fırlatırsa yok sayılır: DB işi telemetri yüzünden başarısız olmaz. `onSpan` yoksa ek maliyet yoktur.
- `onSpan`’a verilen olay (`Span`, `@koina/db`’dan): `{ name: string; startTime: number /* epoch ms */; ms: number; error?: string; detail?: string }`.

## Span adları ve öznitelikler

| Span | Nerede | Anlamı | Sentry `op` |
|---|---|---|---|
| `db.acquire` | runtime, yönetim | Havuzdan bağlantı bekleme | `db.acquire` |
| `db.query` | runtime | Transaction dışı tek sorgu (`detail` = SQL metni) | `db` |
| `db.transaction` | runtime, yönetim | `BEGIN … COMMIT` | `db.transaction` |
| `migration` | yönetim | Bir migration (`detail` = ID) | `db.migration` |
| `rollback` | yönetim | Bir migration’ın geri alınması (`detail` = ID) | `db.rollback` |
| `seed` | yönetim | Bir seed (`detail` = ID) | `db.seed` |

Yedek, export ve restore’un kendi span’i yoktur; yönetim bağlamı her işi transaction’da çalıştırdığı için `db.acquire` ve `db.transaction` olarak görünür. Öznitelikler: `db.system.name` (`postgresql`), `repo_db.detail` (`detail`), `repo_db.duration_ms`, `error.type` (hata kodu). Sentry’de `db.query` span’inin **adı** SQL metnidir ve `op` düz `db`’dir (Sentry’nin sorgu görünümü bunu bekler); `db.` ile başlayan adlar olduğu gibi, diğerleri `db.<ilk bölüm>` olur.

## Kurulum notları

SDK kurulumu (OpenTelemetry `NodeSDK`, `Sentry.init`) uygulamanındır; paketle ilgili tek şart, SDK’nın `bun --preload ./src/instrumentation.ts src/server.ts` ile yüklenmesi ve istek span’inin DB işi bitmeden açık kalmasıdır (DB span’leri onun altına düşer). Workers’ta havuz istek başına kurulduğu için işleyiciyi de istek içinde verin: `createDb(createConfig(env.DB.connectionString), { driver: postgresDriver, poolMax: 1, pooler: "assumed", onSpan: sentry(Sentry) })` ve yanıttan sonra `ctx.waitUntil(db.close())`; `dbMiddleware`’de `{ driver, perRequest: true, onSpan }`.

## Dikkat

- **Hacim.** Her sorgu ve bağlantı bekleme bir span’dir; yoğun serviste örnekleyin (`tracesSampleRate`) ya da süzün: `onSpan: (span) => span.name !== "db.acquire" && toOtel(span)`.
- **SQL metni var, değer yok.** `db.query` span’i `$1`, `$2` yer tutuculu SQL metnini taşır; parametre değerleri hiçbir span’de yoktur. Diğer span’ler yalnızca ad, süre, migration/seed ID’si ve hata kodu taşır.
