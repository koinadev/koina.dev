# Better Auth

`@koina/db/auth` Better Auth’u uygulama schema’sında çalıştırır: tek kullanıcı kümesi, tek tablo takımı (`users`, `session`, `account`, `verification`, `two_factor`, `rate_limit`) — paketle gelen temel migration kurar. DB erişimi paketin kendi Better Auth bağdaştırıcısıdır (motorun havuzu; Kysely, Drizzle ya da ayrı havuz yok).

Bağımlılık isteğe bağlı peer’dir: uygulamaya `better-auth`’u tam **1.7.5** ekleyin (`^` olmadan; `@better-auth/*` aynı sürümde). Runtime girişi bu modülü yüklemez.

## Kurulum

```ts
import { betterAuth } from "better-auth";
import { authTables, createAuth, importedPasswords } from "@koina/db/auth";

const auth = createAuth(
  db,
  ({ options }) =>
    betterAuth({
      ...options,       // adaptör, secret, baseURL, basePath, advanced (çerez öneki, generateId: false)
      ...authTables(),  // users, session, account, verification (snake_case sütunlar)
      emailAndPassword: { enabled: true, password: importedPasswords },
    }),
  { secret: process.env.BETTER_AUTH_SECRET ?? "", baseURL: "https://api.example.com", basePath: "/api/auth" },
);

Bun.serve({ fetch: (request) => auth().handler(request) });
```

`createAuth(db, make, config)` `() => Auth` döndürür; örnek ilk çağrıda kurulur ve saklanır (Workers’ta istek başına kurun). `config`: `secret` (en az 32 karakter, `INVALID_CONFIG`; paket ortamı okumaz, `BETTER_AUTH_SECRET`’ı uygulama verir), `baseURL`, `basePath` (isteğe bağlı, `/` ile başlar), `cookiePrefix` (varsayılan `auth`; `a-z0-9-`, harfle başlar, en çok 32). `make`’e verilen `options` güvenli varsayılanlardır: `make` içinde yayın; `advanced`’i değiştirirken `...options.advanced`’i birleştirin, yoksa çerez öneki ve `generateId: false` düşer ve Better Auth `uuid` sütununa yazılamayan metin id üretir.

## Tablolar ve eşlemeler

`src/migrations/<zaman>_auth.sql` Better Auth 1.7.5 tablolarını kurar: snake_case sütunlar, `uuid` kimlikler (`DEFAULT gen_random_uuid()`), `timestamptz` tarihler, Better Auth’un işaretlediği index’ler. E-posta benzersizdir; oturum, hesap ve 2FA satırları kullanıcıyla silinir (`ON DELETE CASCADE`). Eşleme fonksiyonları argümansızdır: `authTables()` (`user`, `session`, `account`, `verification`; model adı `users`), `twoFactorTables()` (`twoFactor` eklentisinin `schema`’sı), `rateLimitTable()` (`rateLimit: { enabled: true, storage: "database", ...rateLimitTable() }`; Better Auth’un varsayılan bellek deposu süreç başınadır, çok süreçte tabloyu kullanın).

```ts
plugins: [twoFactor({ schema: twoFactorTables() })],
rateLimit: { enabled: true, storage: "database", ...rateLimitTable() },
```

- **Ek alan:** önce sütunu migration’la ekleyin, sonra eşlemeyi yayıp genişletin: `user: { ...authTables().user, additionalFields: { phone: { type: "string", required: false } } }`; yayın yoksa `modelName` ve `fields` düşer.
- Kimlikleri veritabanı üretir. Paketteki `users` sorguları ve repository fonksiyonları yalnızca `users` satırı yazar; parolalı kullanıcıyı Better Auth ile (`auth.api.signUpEmail`) oluşturun. Kullanıcı aktarma komutu yoktur.

## Bağdaştırıcı

Better Auth `createAdapterFactory` (1.7.5) üzerine kurulu küçük bir SQL üreticisidir (`src/core/auth-adapter.ts`). Tablo `"<schema>"."<modelName>"` olarak nitelenir, her değer `$n` parametresidir. Bozuk (UUID olmayan) id sütuna gitmez: `eq` hiçbir satırla, `ne` her dolu satırla eşleşir, `in`/`not_in` listeden çıkarılır; böylece istemciden gelen bozuk id 500 yerine “bulunamadı” olur. `consumeOne` ve `incrementOne` tek deyimdir (atomik); Better Auth transaction’ı `db.transaction`’dır; join yoktur; açılışta introspection yapılmaz (uyumu CI’da `auth generate` ile denetleyin). Bilinmeyen `where` operatörü veya negatif/tam sayı olmayan limit-offset `UNSUPPORTED`’dır.

## Aktarılmış parolalar: `importedPasswords`

`emailAndPassword.password`’a verilir: yeni parolalar Better Auth scrypt’iyle hash’lenir; başka uygulamadan gelen bcrypt (`$2a$`, `$2b$`, `$2y$`) ve argon2 (`$argon2id$`, `$argon2i$`, `$argon2d$`) hash’leri Bun’da `Bun.password` ile doğrulanır. Bun dışında (Workers, Node) bcrypt `bcryptjs` ile doğrulanır, argon2 doğrulanamaz ve `UNSUPPORTED_PASSWORD_HASH` fırlatılır; diğer biçimler (MD5, PBKDF2…) için kullanıcıyı parola sıfırlamaya yönlendirin.

## Schema değişikliği: `auth generate`

Eklenti veya alan ekleyince Better Auth tablolarının farkını migration olarak üretin. Doğrudan bağlantı ve schema kurabilen rol ister.

```ts
// auth-options.ts — database hariç Better Auth seçenekleri, varsayılan dışa aktarım
export default {
  ...authTables(),
  emailAndPassword: { enabled: true },
  plugins: [twoFactor({ schema: twoFactorTables() })],
} satisfies Omit<BetterAuthOptions, "database">;
```

```sh
bun run db:generate:auth ./auth-options.ts [--name better_auth]
# fark varsa: {"created": true, "id": "...", "path": "src/migrations/<zaman>_better_auth.sql"}   yoksa: {"created": false}
```

- Komut yapılandırılmış DB’de **geçici bir schema** (`auth_generate_<12 hex>`) kurar, paketin migration’larını oraya uygular, Better Auth tablolarını (`getSchema`) o schema’nın `information_schema`/`pg_index` bilgisiyle karşılaştırır ve schema’yı siler (rolün DB’de `CREATE` yetkisi olmalı). Ctrl-C yeni iş almaz; komut dosya yazmadan `MIGRATION_CANCELLED` ile çıkar ve schema yine silinir (süreç öldürülür ya da bağlantı koparsa kalabilir: artakalan `auth_generate_*` schema’larını silin).
- Eksik tablo, sütun, index ve var olan sütunlarda eksik tek sütunlu index/unique kısıtı `--up`’a, geri alan deyimler `--down`’a yazılır; yeni tabloların id’si `uuid` + default’tur.
- Dosyayı **çalışma klasöründeki `./src/migrations`**’a yazar: `packages/db-single` içinde çalıştırın. Var olan sütunun tipi alanla uyuşmuyorsa ya da üretilecek index adını geçersiz, kısmi, uyuşmayan ya da başka tablodaki bir index taşıyorsa (index adları schema genelinde tekildir) dosya yazmaz, `INVALID_CONFIG` verir (index’i onarın ya da silin); modülde varsayılan dışa aktarım yoksa `USAGE`.
- SQL’i ve `--down`’ı gözden geçirin (tip değişikliği ve veri taşıma üretilmez), sonra `bun run db:codegen` ve `bun run db:migrate`. CI’da aynı modülle çalıştırıp `"created": false` ve değişmeyen `src/migrations` bekleyin (drift denetimi).

## Workers ve dikkat

- Workers’ta istek başına `createDb(..., { poolMax: 1, pooler: "assumed" })` + `createAuth(...)()` kurun, yanıttan sonra `ctx.waitUntil(db.close())` ([configuration.md](configuration.md#deploy)); Hyperdrive caching kapalı olmalı.
- Bir örneğin hook’u veya transaction’ı içinden başka örneğin `auth.api`’sini çağırmayın: Better Auth transaction bağlamı süreç geneli `AsyncLocalStorage`’dadır, iç çağrı dıştaki transaction’ı kullanabilir.
