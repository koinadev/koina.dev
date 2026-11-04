# Operasyon

Üretimde çalıştırma: deploy sırası, `migrate`’in DB’ye yazdıkları, `doctor`, export/backup/restore ve sınırları, kapanış. Bağlantı türleri ve timeout’lar [configuration.md](configuration.md)’de, sağlayıcı araçları [providers.md](providers.md)’dedir.

## Deploy sırası

1. Deploy adımında doğrudan URL’yle `bun run db:migrate` (her deploy’da güvenlidir; `--dry-run` bekleyenleri gösterir).
2. Uygulamayı (pooler URL’si) başlatın; `db.ready()`’yi açılışta ve `/ready`’de çağırın.
3. Kapanışta `await db.close()`; yönetim kodu `management.close()` ile kapanır. CLI kendiliğinden kapanır; iptal edilen çalışma sonraki adımdan önce durur ve çıkış kodu 1 verir.

Aynı anda tek `migrate`/`migrate-down`/`seed`/`migration baseline`/`restore` çalışır; ikincisi beklemeden `MIGRATION_RUNNER_BUSY` alır.

## `migrate`’in veritabanına yazdıkları

`migrate` (`--dry-run` hariç) migration’lara ek olarak runtime ayarlarını **DB varsayılanı** olarak yazar:

```sql
ALTER DATABASE <geçerli veritabanı> SET statement_timeout = 5000;
ALTER DATABASE <geçerli veritabanı> SET lock_timeout = 1000;
ALTER DATABASE <geçerli veritabanı> SET client_connection_check_interval = 1000;
```

- **Veritabanının sahibi (ya da superuser) olmak gerekir.** Yönetilen servislerde `migrate`’i DB’yi sahiplenen rolle çalıştırın; yetkisiz rol hiçbir migration çalışmadan `42501` (insufficient privilege) ile düşer ve runtime timeout’ları yazılmaz. Aynı nedenle **`restore` da sahip rol ister** (aşağıda).
- Ayarlar bu DB’nin **her** yeni oturumuna uygulanır (psql ve diğer uygulamalar dahil; uzun elle işler için `SET statement_timeout = 0`). Pooler’ın önceden açtığı backend’ler yeniden bağlanana kadar eski değeri tutar (`RECONNECT`). `doctor` `runtime_timeouts` ile denetler.

## `doctor`

```sh
bun run cli doctor [--pooled-url] [--pgbouncer-url]
```

Salt okunur; `{ ok, checks: [{ target, check, ok, detail }], externalChecks }` yazar, herhangi bir denetim başarısızsa çıkış kodu 1. Hedef `database` denetimleri: `direct_connection`, `string_literals` (`standard_conforming_strings` açık), `runtime_timeouts`, `schema` (var), `migrations` (ledger listeyle uyumlu ve bekleyen yok; `MIGRATION_DRIFT` başarısızlık olarak raporlanır), `pooled_runtime` (`--pooled-url`: uygulamanın URL’si transaction pooler’a gidiyor). `replica_*` denetimleri [replicas.md](replicas.md)’de; `global_pool_mode` (`--pgbouncer-url`, hedef `pgbouncer`) genel `pool_mode`’un `transaction` olmasını arar. Çalıştırılamayan denetim `inspection` olur (`ok: false`, yalnızca hata kodu; sürücü hataları kimlik bilgisi taşıyabilir). `externalChecks` SQL ile kanıtlanamayanları (`pooled_runtime` — `--pooled-url` verilirse çıkar —, PgBouncer’ın etkin modu, Hyperdrive caching, deploy ortamı) `unverified` listeler; elle doğrulayın.

## Export, backup ve restore

```sh
bun run cli export ./export-2026-10-05        # tam bu klasör (var olmamalı)
bun run cli backup ./backups --keep 7         # ./backups/<UTC yyyyMMddHHmmss>; son 7’den eski setler silinir
bun run cli restore ./backups                 # en yeni tamamlanmış set (--set <id> ile başkası); export klasörü de olur
bun run cli restore ./export-2026-10-05 --schema restored
```

Her çalıştırma **tam** bir set yazar: `backup.json` (schema şekli, sunucu bilgisi, tablo dosyaları ve satır sayıları; en son yazılır, o yüzden varsa set tamdır) ve tablo başına bir `<n>.jsonl.gz`. `pg_dump` gerekmez, dört sürücüde çalışır; veri tek `REPEATABLE READ READ ONLY` snapshot’ından `row_to_json` ile okunur. Artımlı set yoktur. Çıktılar: `export` `{ dir, tables, rows }`, `backup` `{ id, dir, tables, rows, pruned }`, `restore` `{ restoredFrom, migrationsApplied, rows }`.

### Neyi kapsar, neyi reddeder

**Tek schema’yı** (`--schema`, varsayılan `public`) kapsar (olmayan ya da boş schema `UNSUPPORTED_SCHEMA`: “Schema is missing or empty”): sıradan kalıcı tablolar ve verileri, sequence’lar ve durumları, schema’daki enum tipleri (etiket sırasıyla; enum ve enum dizisi sütunları, default/CHECK/index’teki enum cast’leri hedef schema’ya bağlanır), sütun tanımları, PK/unique/check/FK/NOT NULL kısıtları, index’ler. Başka schema’ları, rolleri, yetkileri, sahipliği, yorumları ve eklentilerin kendisini kapsamaz; eklentiye ait nesneler (PostGIS tabloları, `pg_stat_statements` view’ları) uygulama verisi sayılmaz ve atlanır, geri yüklemede hedefte aynı eklentiler kurulu olmalıdır (`EXTENSION_MISMATCH`).

Yedek ya birebir geri yüklenir ya da hiç alınmaz: birebir üretemediği bir şey varsa `export`/`backup` `UNSUPPORTED_SCHEMA` ile durur, **dosya bırakmaz** (geçici klasör silinir) ve nesneyi adlandırabildiği yerde adlandırır (mesaj URL içermez). Reddedilenler:

- sıradan kalıcı tablo ve sequence dışındaki ilişkiler: view, materialized view, partitioned/foreign/unlogged tablo; row level security, depolama parametresi, inheritance, trigger, rule;
- enum dışındaki **kullanıcı tanımlı tipler (domain, range, composite)**, başka schema’daki enum’u kullanan sütun ve schema’daki fonksiyonlar (mesaj tipi/fonksiyonu ve onu kullanan `tablo.sütun`’u adlandırır); özel operatör, operator class ve collation; default/kısıt/index’te özel rutin; index ifadesi/koşulunda yerleşik tip ve kopyalanan enum dışına (başka schema’nın ya da eklentinin enum’una) cast (index adlandırılır);
- taşınabilir yerleşik liste dışı sütun tipleri; schema’lar arası FK veya sequence sahipliği; geçersiz index (önce onarın);

### Restore

- Hedef schema **yok ya da boş** olmalı (artakalan bir enum/domain tipi de doluluk sayılır; eklentiye ait nesneler sayılmaz); aksi `SCHEMA_NOT_EMPTY`, hiçbir şey silinmez ya da ezilmez. Var olan verinin üstüne geri yüklemek için `--schema` ile başka ada yükleyin ya da eskisini kendiniz silin.
- Schema ve veri **tek transaction’da** kurulur (yarıda kalan geri yükleme hiçbir şey bırakmaz, tekrar denenebilir); satır sayıları doğrulanır (`RESTORE_MISMATCH`). Tanımlar yeni schema adına bağlanır. Migration kilidi alınır.
- Yedeğin migration ledger’ı bu kodun listesinin öneki olmalı (`MIGRATION_DRIFT`: daha yeni kodla alınmış yedek yeni kod ister); yedek eskiyse restore sonrası bekleyen migration’lar uygulanır.
- **Restore, veri transaction’ı commit olduktan sonra `migrate` çalıştırır** ve `migrate` her zaman `ALTER DATABASE` yazar: sahibi olmayan rolle veri geri yüklenir ama komut `42501` ile çıkış kodu 1 verir; yeniden `restore` `SCHEMA_NOT_EMPTY` olur. Çözüm: `migrate`’i sahip rolle çalıştırın.
- PostgreSQL ana sürümü, encoding/locale/collation ve eklentiler eşleşmeli (`VERSION_MISMATCH`, `COLLATION_MISMATCH`, `EXTENSION_MISMATCH`). Tamamlanmış set yoksa `BACKUP_NOT_FOUND`, tablo dosyası ya da ledger eksikse `BACKUP_INVALID`.

### Artakalan `.partial` klasörleri

Her çalıştırma `<hedef>.partial` içine yazar, bitince yeniden adlandırır; başarısız çalıştırma onu kendi siler. **Öldürülen** (SIGKILL, elektrik kesintisi, OOM) çalıştırma silemez ve artık o tam hedefi engeller: aynı hedefe sonraki çalıştırma siz `<hedef>.partial`’ı silene kadar `BACKUP_EXISTS` verir (mesaj hedef adını yazmaz, `.partial` klasörünü silmenizi söyler; hedefin kendisi varsa yalnızca “already exists” der). `export <klasör>` için hedef seçtiğiniz klasördür; `backup <kök>` için `<kök>/<UTC saniye>`’dir: sonraki çalıştırmalar engellenmez (o saniyede set ya da artık varsa sonraki saniye en çok üç denemeyle denenir) ama artık kalır, `--keep` onu silmez (yazılmakta olan bir setten ayırt edilemez), elle silin. Aynı hedefe aynı anda yazan ikinci çalıştırma da aynı hatayı alır. Sondaki `/` hedefi değiştirmez. `--keep` aynı çalıştırmanın yazdığı seti, saat geri alınıp en eski görünse de silmez.
