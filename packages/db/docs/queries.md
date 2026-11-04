# Sorgular

Uygulama SQL’i dosyalarda yazılır, `bun run db:codegen` ile derlenir ve üretilmiş modüllerden import edilir. Çalışma anında SQL ayrıştırılmaz; tablo adlarına `createDb`’nin schema’sı eklenir, değerler her zaman ayrı parametre olarak gider. Desteklenen SQL’in tam dilbilgisi, reddedilen yapılar ve çıktı adı kuralları [`src/core/sql/README.md`](../src/core/sql/README.md)’dedir; bu belge günlük kullanımı anlatır.

## Sorgu yazmak

Sorgular `src/queries/<alan>.sql` dosyalarındadır (düz klasör; hepsi tek schema’ya çalışır). Bir dosya bir veya daha çok isimli blok içerir; `bun run db:codegen` her dosya için bir modül üretir (`users.sql` → `users.gen.ts`, import: `@koina/db/queries/users`):

```sql
-- name: findUserByEmail
SELECT * FROM users WHERE email = $1::text
```

- Ad paket genelinde tekil camelCase olmalı (`^[a-z][A-Za-z0-9]*$`) ve dışa aktarılan ad olur.
- Tablo adını schema’sız yazın. Parametreler `$1`, `$2`…; tip belirsizse dönüşümle (`$1::uuid`). JSON için `$1::text::jsonb`; dizi yerine JSON gönderin.
- Schema, tablo adı veya SQL parçasını istemciden almayın; girdi doğrulaması (zod vb.) uygulamanın işidir.
- Desteklenmeyen SQL codegen’de `SQL_UNSUPPORTED` ile reddedilir; çalışma anına kalmaz.
- **Sonuç anahtarları camelCase**, sütunlar snake_case kalır (`created_at` → `createdAt`); eşleme derlemede SQL’e yazılır, çalışma anı maliyeti yoktur. Takma ad vermek istediğiniz adı tırnaklayın (`AS "full_name"`).
- **`SELECT *` ve `RETURNING *`** derlemede, sütunlardan en az biri yeniden adlandırılıyorsa migration’lardan türetilen açık sütun listesine genişler; migration sütun ekleyince `codegen` açılımı günceller. Sütunları bilinmeyen kaynak (migration’larda olmayan tablo, bilinmeyen CTE) `SQL_UNSUPPORTED` verir.
- `ORDER BY` için tabloyla nitelenmiş sütun yazın (`ORDER BY users.id`); `id::text AS id` takma adına göre sıralamak birincil anahtar indeksini kullanamaz.

## `bun run db:codegen`

```sh
bun run db:codegen          # SQL başına bir modül; SQL’i silinen .gen.ts kaldırılır
bun run db:codegen --check  # eksik, eski, sahipsiz veya elle değiştirilmiş çıktıyı reddeder (CI)
```

`db:codegen` aynı komuttur; DB gerekmez. Migration/seed listelerini ve zod tablo tiplerini de üretir. Üretilmiş dosyaları elle değiştirmeyin, SQL’iyle commit edin. Her sorguya SQL’den bir `readOnly` bayrağı yazılır: kilitsiz `SELECT`/`VALUES`/`UNION` ve yalnızca okuyan CTE’ler `readOnly`, yazılar ve `FOR UPDATE/SHARE` değildir; replica okuma bağlamı yalnızca `readOnly` sorguları çalıştırır ([replicas.md](replicas.md)).

## Sorgu çalıştırmak

```ts
import { findUsers } from "@koina/db/queries/users";

const users = await db.query<User[]>(findUsers, [20, 0]);       // primary, tek gidiş-dönüş
const rows = await db.read.query<User[]>(findUsers, [20, 0]);   // replica (yalnızca readOnly sorgu)
```

- `db.query(sorgu, değerler?)` primary’de çalışır; yalnızca paketin derlediği sorgular kabul edilir (başkası `INVALID_QUERY`).
- `db.read.query` replica’da çalışır, sağlıklı replica yoksa `replicaOnUnavailable` politikası uygulanır; yazan sorgu DB’ye gidilmeden `QUERY_NOT_READ_ONLY` olur. Replica’da transaction yoktur ([replicas.md](replicas.md)).
- İstek kapsamında (`dbMiddleware`, `createDbScope`) aynı çağrılar `c.get("db")` üzerindedir ve yazıdan sonra `read.query` primary’de kalır ([middleware-and-jobs.md](middleware-and-jobs.md)).

### Transaction

```ts
import { createUser } from "@koina/db/queries/users";

await db.transaction(async (tx) => {
  await tx.query(createUser, ["Ada", "ada@example.com"]);
  await tx.query(createUser, ["Bob", "bob@example.com"]); // ikisi birlikte commit olur, hata olursa ikisi de geri alınır
});
```

`FOR UPDATE` gibi satır kilidi alan sorgu yalnızca transaction içinde çalışır (`TRANSACTION_REQUIRED`); transaction iç içe olmaz (`NESTED_TRANSACTION`); içeride yakalanmış hata da transaction’ı başarısız sayar; `tx` `work` dışında kullanılamaz (`TRANSACTION_CLOSED`). Tek sorgu için transaction açmayın.

## Queries ve repositories katmanı

- **`src/queries/`** SQL’in yaşadığı yerdir: `.sql` dosyası + üretilmiş `.gen.ts`. Sorgular DB’ye parametre dizisiyle gider; çağıran sırayı ve tipleri bilmek zorundadır.
- **`src/repositories/<alan>/`** üretilmiş sorgunun ince, tipli sarmalayıcısıdır: **sorgu başına bir fonksiyon, bir dosya**, `index.ts` barrel’ı. Kendi SQL’i, doğrulaması, sayfa sınırı ya da iş kuralı yoktur. İlk argüman `Pick<Queryable, "query">`’dir: `db`, `db.transaction` içindeki `tx` veya replica okuması için `db.read`. Bulunamayan satır `null`, `deleteUser` `boolean` döner; satırlar tipli döner, çalışma anında doğrulanmaz. Girdiyi uygulamanın kenarında zod ile doğrulayın (`@koina/db/tables/users`’daki `userInsert` gibi).

Paketle gelen `users` çifti: `findUserById(db, id)`, `findUserByEmail(db, email)`, `findUsers(db, limit = 50, offset = 0)`, `createUser(db, { name, email })`, `deleteUser(db, id)`. `limit`/`offset` doğrudan PostgreSQL’e gider (negatif değer `DriverError` olur).

```ts
import { createUser, findUserByEmail } from "@koina/db/repositories/users"; // sorgularla aynı ad: sorguyu import ederken takma ad verin

const ada = await createUser(db, { name: "Ada", email: "ada@example.com" });   // UserRow
await findUserByEmail(db.read, "ada@example.com");                             // UserRow | null (replica)
await db.transaction((tx) => createUser(tx, { name: "Bob", email: "bob@example.com" }));
```

**Yeni tablo için çift eklemek:**

1. `bun run db:generate create_notes` → tabloyu `--up`/`--down` olarak yazın.
2. `src/queries/notes.sql`: `-- name: findNotes` / `SELECT * FROM notes WHERE user_id = $1::uuid ...`, `-- name: createNote` / `INSERT ... RETURNING *`.
3. `bun run db:codegen` → `queries/notes.gen.ts` ve `tables/notes.gen.ts` (`noteRow`, `noteInsert`).
4. `src/repositories/notes/` altında `src/repositories/users/find-user-by-id.ts`’i kopyalayıp sorguyu ve `NoteRow` tipini değiştirin (`db.query<NoteRow[]>`), `index.ts`’e `export * from "./find-notes";` ekleyin. `./repositories/*` export’u `src/repositories/*/index.ts`’e baktığı için `@koina/db/repositories/notes` kendiliğinden çalışır.

## Kodda derlemek: `prepareQuery`

Üretilmiş dosyada olmayan tek seferlik sorgu (test, CLI aracı) için `@koina/db/management`’daki `prepareQuery(kaynak)` codegen ile aynı derler (çıktı adları camelCase, `*` paketin migration tablolarından açılır). SQL ayrıştırıcıyı yüklediği için runtime bundle’ında üretilmiş sorguları tercih edin. `PreparedQuery = { bind(schema), readOnly, requiresTransaction }`; `bind` doğrulanmış schema’yı uygular, değerler `$n` kalır.

## Tablo tipleri (zod)

`bun run db:codegen` migration’ların `--up` bölümlerini DB’siz katlar ve `src/tables/<tablo>.gen.ts` yazar: `userRow`, `userInsert`, `userColumns` (camelCase anahtar → SQL sütun adı) ve `UserRow`/`UserInsert` tipleri (adlar tablonun tekil camelCase hâli, anahtarlar sorgu sonucuyla aynı). Katlanamayan DDL codegen’i durdurur; tahmin yapılmaz. Desteklenen SQL tipleri ve reddedilenler (`citext`, `inet`/aralık dizileri …) için [`src/core/sql/README.md`](../src/core/sql/README.md).

## Sık hatalar

- **`QUERY_NOT_READ_ONLY`** — yazan sorgu `db.read.query` ile (ya da `db.read` verilen bir repository fonksiyonuyla) çalıştırıldı; `db.query`/`db` kullanın.
- **`TRANSACTION_CLOSED`** — `tx` `work` dışına sızdı.
- **Import bulunamıyor** — `.sql` değişti, `bun run db:codegen` çalışmadı.
