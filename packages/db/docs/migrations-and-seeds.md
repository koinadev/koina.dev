# Migration ve seed’ler

Tablo yapısı migration dosyalarıyla, başlangıç verisi seed dosyalarıyla yönetilir; ikisinin ledger’ı (`_migrations`, `_seeds`) uygulama schema’sındadır. Pakette tek migration gelir: `src/migrations/<zaman>_auth.sql` (Better Auth tabloları, [auth.md](auth.md#tablolar-ve-eşlemeler)); seed gelmez.

## Dosya biçimi

`src/migrations/<yyyyMMddHHmmss>_<snake_ad>.sql` (UTC); ID = `.sql` hariç ad, sıra = ID sırası. **Dosyaları elle adlandırmayın** (yuvarlak uydurma zaman yok): `bun run db:generate <ad>` gerçek UTC zamanını yazar, `index.gen.ts` listesini günceller ve öneki son dosyanınkinden büyük olmayan oluşturmayı reddeder (`MIGRATION_INVALID`; iki dosya arası en az 1 sn). Ad snake_case olmalı (`USAGE`). İçerik bir `--up` satırı + SQL, sonra bir `--down` satırı + SQL:

```sql
--up
ALTER TABLE users ADD COLUMN status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive'));
--down
ALTER TABLE users DROP COLUMN status;
```

- İki işaret de zorunlu, bu sırayla ve birer kez; `--up`’tan önce içerik (yorum dahil) ve başka `--kelime` satırı `MIGRATION_INVALID`. Yorumlar `-- ` (boşluklu).
- Boş ya da yalnızca yorum olan `--down` = geri alınamaz: `migrate-down` DDL çalıştırmadan `MIGRATION_IRREVERSIBLE` verir.
- Checksum tüm dosyayı kapsar; uygulanmış dosyayı ya da adını değiştirmeyin (`MIGRATION_DRIFT`), yeni migration yazın.
- `CREATE INDEX CONCURRENTLY` / `DROP INDEX CONCURRENTLY` bölümün **tek** deyimi olmalı; transaction dışında çalışır, tekrar denemede mevcut index incelenir (farklı tablo/tekillik `MIGRATION_DRIFT`, geçersizse yeniden kurulur, yine geçersizse `MIGRATION_INDEX_INVALID`).
- Enum tipleri ve veri deyimleri desteklenir; desteklenmeyen SQL codegen’de `SQL_UNSUPPORTED`. Tablo adları schema’sız yazılır.
- `migration create` boş şablon (`--up\n\n--down\n`) yazar; SQL yazılana kadar `codegen` ve DB komutları hata verir (doldurun ya da dosyayı silip `bun run db:codegen` çalıştırın). `migration create`, `seed create` ve `auth generate` yalnızca CLI’dedir (fonksiyon olarak dışa aktarılmaz); `pull` `pullSchema` olarak `@koina/db/tools`’ta da vardır.

## Uygulamak, geri almak, baseline

```sh
bun run db:status                        # {"schema","applied","pending":[{"id","transactional"}]}
bun run db:migrate --dry-run             # yalnızca ledger okur: kilit ve yazma yok
bun run db:migrate                       # ilerleme olayları, sonra {"dryRun": false, "migrations": [...]}
bun run db:rollback [--steps 2 | --to <id>] [--dry-run]   # varsayılan: son 1; --to bu ID’yi son uygulanmış bırakır
bun run cli migration baseline <id>      # çalıştırmadan uygulanmış işaretler
```

- `migrate` tek advisory lock’u alır, schema yoksa kurar (var olan schema, `public` dahil, için yetki gerekmez), runtime timeout’larını DB varsayılanı olarak yazar (DB sahipliği ister; [operations.md](operations.md#migratein-veritabanına-yazdıkları)), ledger’ı açar ve bekleyenleri sırayla uygular; her migration’ın DDL’i ve ledger satırı birlikte commit olur.
- Yönetim deyimleri varsayılan 30 sn ile sınırlıdır; büyük tabloda `CREATE INDEX CONCURRENTLY` gibi uzun deyim `LOCK_LOST` ve geçersiz index bırakmasın diye `--statement-timeout-ms N` (1000–3600000) verin (`migrate`, `migrate-down`, `seed`, `restore`).
- Aynı anda tek runner çalışır ve beklemez: ikinci `migrate`, `migrate-down`, `seed`, `migration baseline` veya `restore` hemen `MIGRATION_RUNNER_BUSY` alır. İptal (SIGINT/SIGTERM) bir sonraki adımdan önce durur. **Kurtarma komutu ve kalıcı işaret yoktur:** her adım yeniden denenebilir; `LOCK_LOST` ya da `MIGRATION_CANCELLED` sonrası aynı komutu tekrar çalıştırın.
- Ledger paketin listesinin öneki olmalı; bilinmeyen, değişmiş, tekrarlı veya boşluklu geçmiş `MIGRATION_DRIFT`.
- Geri alma uygulanmış önekin sonundan yeniden eskiye gider; `--to` uygulanmamışsa `MIGRATION_NOT_APPLIED`, `--steps` ile `--to` birlikte ya da `--steps` uygulanmış sayıdan büyükse `USAGE`; sınır dışı sayı (`0`, `10001`) `INVALID_CONFIG`. `--down` ve ledger satırının silinmesi birlikte commit olur.
- **Baseline**, bekleyen migration’ları verilen ID’ye kadar (dahil) kilit altında ledger’a yazar; ID bekleyen değilse `MIGRATION_NOT_PENDING`. Önce katlanmış her tablo, sütun ve enum’un canlı schema’da olduğunu denetler (eksikse `SCHEMA_MISMATCH`, hiçbir şey yazılmaz); index ve kısıtları karşılaştırmaz.

## Seed’ler

`src/seeds/<yyyyMMddHHmmss>_<ad>.sql` veya `.ts`; ID’ler migration’larla aynı kurala uyar.

```sh
bun run db:generate:seed support_user     # boş SQL şablonu;  --ts: TypeScript seed
bun run db:codegen
bun run db:seed [--dry-run]
```

- **SQL seed** yalnızca `INSERT`/`UPDATE`/`DELETE` içerir (aksi `MIGRATION_INVALID`); **TS seed** `SeedContext = { schema, query, transaction }` alan varsayılan async fonksiyondur (`query` schema’ya bağlıdır ve üretilmiş sorguları alır; seed zaten tek transaction’dadır).

  ```ts
  import type { SeedContext } from "../management";
  import { createUser } from "../queries/users.gen";

  export default async function supportUser({ query }: SeedContext): Promise<void> {
    await query(createUser, ["Support", "support@example.com"]);
  }
  ```

- Her seed ve ledger satırı kendi transaction’ında commit olur; uygulanmış seed tekrar çalışmaz. Değişen, bilinmeyen veya sıra dışı uygulanmış seed `SEED_DRIFT`. SQL seed’in checksum’ı çalışma anında, TS seed’inki codegen’de hesaplanır: **TS seed’i değiştirince `bun run db:codegen` çalıştırın**.
- Seed güncel migration ister (`MIGRATIONS_PENDING`) ve `migrate` ile aynı kilidi alır.

## Var olan veritabanından başlangıç migration’ı: `pull`

Başka araçla (ör. Drizzle) kurulmuş DB’ye geçerken migration geçmişi dönüştürülmez: canlı schema’nın yapısı okunur ve **tek** başlangıç migration’ı yazılır; sonraki her değişiklik normal migration’dır.

```sh
bun run db:pull                                   # public → src/migrations/<zaman>_init.sql  (kaynak schema konumsal argüman; --schema yok)
bun run db:pull legacy --name legacy_init --exclude audit_log
bun run db:codegen
bun run cli migration baseline <init id> --schema legacy   # mevcut DB’de çalıştırmak yerine uygulanmış işaretler
```

- DB’yi yalnızca okur (`pg_catalog`). Çıktı: `{ id, path, schema, enums, tables, constraints, indexes, structure, exclude, next }`; `next` baseline komutunu söyler.
- Tanımlar PostgreSQL’in `pg_get_constraintdef`/`pg_get_indexdef`/`pg_get_expr` çıktısıdır; schema nitelikleri silinir, uzun tip adları kanonikleşir (`character varying` → `varchar`). Dosyayı değiştirmeyin, değişiklikleri yeni migration’a yazın (çıktıdaki `structure` yapı özetidir: aynı yapı aynı özeti verir). `--down` boştur (geri alma bütün tabloları silerdi).
- Her zaman dışarıda kalanlar: `_migrations`, `_seeds`, `drizzle_migrations`; `--exclude tablo` ekler (tekrarlanabilir/virgüllü; büyük harfli ya da tireli ad da olur).
- **`init` ilk migration olmalıdır.** Pakette gelen `auth` migration’ı `users`, `session` vb. tabloları kurar: çekilen schema’da zaten varsa baseline’dan önce `src/migrations/*_auth.sql`’i silip `bun run db:codegen` çalıştırın (çekilen `init` onun yerini alır); `users` tablosu farklıysa `src/queries/users.sql` ve `src/repositories/users/`’ı da uyarlayın (`codegen` olmayan sütunda hata verir). Aksi halde baseline `auth`’u da kapsar ve tabloları yoksa `SCHEMA_MISMATCH` verir. Boş DB’de `init` normal migration olarak çalışır.
- **Desteklenmeyen nesneler** tek hatada listelenir, dosya yazılmaz (`PULL_UNSUPPORTED`): view/materialized view, fonksiyon, trigger, policy ve RLS, sahipsiz sequence, üretilen sütun, composite/domain/range tipi, partitioned/inherited/foreign/unlogged tablo ve depolama parametresi, geçersiz index, exclusion kısıtı, sütun collation’ı. Nesneyi kaldırın ya da pull’dan sonra ayrı migration’a elle yazın; eski uygulamanın tablosuysa `--exclude`. Eklentiye ait nesneler (fonksiyon, tip, tablo) yazılmaz ve pull’u engellemez: eklentiyi hedefte kurun. Enum etiketleri `E'…'` olarak yazılır; etiketsiz enum yazılmaz. Yorumlar, yetkiler ve sahiplik okunmaz. Schema yoksa `SOURCE_SCHEMA_MISSING`.
