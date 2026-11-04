# Hata kodları

Paket hataları `AppError` olarak fırlatır: `error.code` kararlıdır, `error.message` insan içindir ve URL veya parola içermez. Sürücü ve PostgreSQL hataları da `AppError`’a (`DriverError`) çevrilir: kod SQLSTATE veya bağlantı kodudur, mesaj yalnızca `Database operation failed (<kod>)`’dur. `errorCode(error)` her şeyi tek koda indirger. HTTP durumuna eşlemek uygulamanın işidir ([middleware-and-jobs.md](middleware-and-jobs.md#http-durum-eşlemesi-örnek)).

```ts
import { AppError, databaseUnavailable, errorCode } from "@koina/db";

try {
  await createUser(db, { name, email });
} catch (error) {
  errorCode(error);           // AppError → kod; PostgreSQL → SQLSTATE ("23505"); bağlantı → "ECONNREFUSED", "CONNECTION_CLOSED" …; bilinmeyen → "OPERATION_FAILED"
  databaseUnavailable(error); // SQLSTATE 08xxx, 53xxx, 57P0x veya sürücü/soket bağlantı hatası → true
  error instanceof AppError;  // paketin kendi hatası mı
}
```

CLI hatayı stderr’e `{"error": "<kod>", "message": "…"}` yazar ve çıkış kodu 1 verir; `AppError` olmayan hataların mesajı yazılmaz.

## Sık görülen PostgreSQL kodları

| Kod | Ne zaman | Ne yapmalı |
|---|---|---|
| `23505` | UNIQUE ihlali (aynı e-posta/id) | 409; kuyruk tekrar denemesinde başarı sayılabilir |
| `23503` | Yabancı anahtar ihlali | Girdiyi veya yazma sırasını düzeltin |
| `23502` | NOT NULL ihlali | Sütunu verin |
| `42P01` | Tablo yok (schema silinmiş, migration eksik) | `migrate`; schema kaybında [restore](operations.md#restore) |
| `42501` | Yetki yok (ör. DB sahibi olmayan rolle `migrate`’in `ALTER DATABASE`’i; `restore` verisi yazıldıktan sonra da bununla düşebilir) | Sahip rolle çalıştırın ([operations.md](operations.md#migratein-veritabanına-yazdıkları)) |
| `08P01` | PgBouncer sunucu bulamadı (arkadaki DB kapalı) | 503; `databaseUnavailable(error)` ile `DATABASE_UNAVAILABLE`’a indirin |
| `57014` | Sunucu statement timeout’u | Paket `DATABASE_TIMEOUT` olarak verir |

## Yapılandırma ve kullanım

| Kod | Ne zaman | Ne yapmalı |
|---|---|---|
| `INVALID_CONFIG` | Geçersiz `DATABASE_URLS` (boş, birden çok, schema’yı parametreyle yönlendiren) veya `DATABASE_REPLICA_URLS` (8’den çok, tekrarlı, birincile eşit); seçenek sınır dışı (CLI’de `--steps`/`--keep` dahil); yanlış `pooler`/`replicaOnUnavailable`; `dbMiddleware` yanlış birleşim; Better Auth secret < 32 karakter, bozuk `cookiePrefix`/`basePath`; `auth generate` tipi uymayan sütun veya alanla uyuşmayan index bulur; `--from-replica` bozuk, birincil ya da replica olmayan URL alır; bozuk PgBouncer konsol URL’si | Mesajın adlandırdığını düzeltin ([configuration.md](configuration.md)) |
| `USAGE` | CLI argümanı eksik/fazla/tekrarlı/bilinmeyen; değersiz seçenek; snake_case olmayan ad; `--steps` ile `--to` birlikte ya da `--steps` uygulanmış sayıdan büyük; `pull` bozuk schema/`--exclude` adı; `--safety-point` neon/supabase dışı ya da neon’suz `--org`; `--at` eksik, ofsetsiz veya geçmişte değil; gizli giriş iptal/boş; varsayılan dışa aktarımı olmayan `auth generate` modülü | Komutun kullanımına bakın ([cli.md](cli.md)) |
| `INVALID_SCHEMA` | Schema adı geçersiz: büyük harf, `pg_*`, `information_schema`, `a-z0-9_` dışı karakter, 63 bayttan uzun | Düz küçük harfli ad kullanın |
| `INVALID_IDENTIFIER` | Boş, 63 bayttan uzun veya NUL içeren identifier | Geçerli PostgreSQL identifier’ı kullanın |

## Veritabanı ve hazırlık

| Kod | Ne zaman | Ne yapmalı |
|---|---|---|
| `DATABASE_UNAVAILABLE` | `ready()`: DB’ye erişilemiyor (mesaj yalnızca neden kodunu ekler) | DB’yi/ağı düzeltin; 503 |
| `POOLER_REQUIRED` | `ready()`: URL transaction pooler olmadan (doğrudan) DB’ye gidiyor | `DATABASE_URLS`’i transaction-mode pooler’a yöneltin; sınanamayan ortamda bilerek `pooler: "assumed"`; 503 |
| `DIRECT_CONNECTION_REQUIRED` | Yönetim (veya `--from-replica` URL’si) transaction pooler üzerinden bağlandı | Doğrudan veya session-pooled URL ([configuration.md](configuration.md#doğrudan-ve-pooler-url)) |
| `DATABASE_CLOSED` | `close()` sonrası kullanım | Kapanış sırasını düzeltin |
| `DATABASE_TIMEOUT` | Bağlantı `statementTimeoutMs` içinde alınamadı, deyim `statementTimeoutMs + 1 sn` içinde yanıtlanmadı ([ayrıntı](configuration.md#timeoutlar-ve-iptal)) ya da sunucu timeout’u | 504; `poolMax`, yavaş sorgular, DB sağlığı |
| `DATABASE_BUSY` | Bağlantı bekleyen iş sınırı (64) dolu | 503; yükü azaltın veya `poolMax` artırın |
| `CONNECTION_CLOSED` | `errorCode` yedek kodu: bağlantı kapandı | Log’a bakın; genellikle geçici |
| `OPERATION_FAILED` | `errorCode` yedek kodu: tanınmayan hata | Log’a bakın |
| `PROVIDER_API_ERROR` | Neon komutu: API hata verdi, 30 sn’de zaman aşımına uğradı, iptal edildi ya da kullanılamaz yanıt döndü; mesaj durumu ve Neon’un mesajını taşır (anahtar asla yok). Branch açıldıktan sonraysa mesaj onu adlandırır ve silinmediğini söyler | Nedeni giderin (anahtar, branch limiti, geçmiş süresi); branch’leri Neon konsolundan silin |
| `PROVIDER_NODE_NOT_FOUND` | Neon komutu: `DATABASE_URLS` host’u anahtarın hesabındaki hiçbir endpoint’le eşleşmedi | Anahtarın DB’yi barındıran hesaba ait olduğunu doğrulayın; organizasyonda `--org <id>` |

## Sorgular

| Kod | Ne zaman | Ne yapmalı |
|---|---|---|
| `INVALID_QUERY` | Derlenmiş sorgu olmayan nesne | Üretilmiş sorgu veya `prepareQuery` |
| `QUERY_NOT_READ_ONLY` | `readOnly` olmayan sorgu okuma bağlamında (`read.query`); DB’ye gidilmeden reddedilir | Yazıyı `db.query` ile çalıştırın ([replicas.md](replicas.md)) |
| `REPLICA_UNAVAILABLE` | `replicaOnUnavailable: "error"` iken sağlıklı replica yok (düştü, lag aşıldı veya hiç yok) | Replica’yı düzeltin ya da politikayı `"primary"` yapın; 503 |
| `TRANSACTION_REQUIRED` | Satır kilidi (`FOR UPDATE`) transaction dışında | `db.transaction(async (tx) => …)` |
| `NESTED_TRANSACTION` | Transaction içinde `transaction` | Tek transaction kullanın |
| `TRANSACTION_CLOSED` | Bağlam `work` bittikten sonra kullanıldı | Bağlamı `work` dışına taşımayın |
| `SQL_UNSUPPORTED` | Derleyicinin desteklemediği SQL (codegen veya `prepareQuery`) | SQL’i sadeleştirin ([queries.md](queries.md)) |
| `UNSUPPORTED` | Better Auth bağdaştırıcısında bilinmeyen operatör veya geçersiz limit/offset | Better Auth yapılandırmasını değiştirin |
| `UNSUPPORTED_PASSWORD_HASH` | Bun dışında argon2 hash’iyle giriş | Kullanıcı parolayı sıfırlasın veya Bun’da çalıştırın |

## Migration ve seed

| Kod | Ne zaman | Ne yapmalı |
|---|---|---|
| `MIGRATION_INVALID` | Dosya adı/bölüm biçimi bozuk; SQL seed’de DML dışı deyim; ID sırası/tekilliği; bölümde yalnız olmayan `CONCURRENTLY` | Dosyayı düzeltin ([migrations-and-seeds.md](migrations-and-seeds.md#dosya-biçimi)) |
| `MIGRATION_DRIFT` | Ledger listenin öneki değil (değişmiş/bilinmeyen/boşluklu geçmiş); concurrent index tanımı farklı; yedek daha yeni kodla alınmış | Uygulanmış dosyayı geri alın, yeni migration yazın; restore için güncel kod |
| `SEED_DRIFT` | Uygulanmış seed değişti veya bilinmiyor | Yeni seed yazın; TS seed sonrası `codegen` |
| `MIGRATION_IRREVERSIBLE` | Seçimde `--down`’ı boş migration var | Geri alınamaz; ileri yönde düzeltme migration’ı |
| `MIGRATION_NOT_APPLIED` | `--to` uygulanmamış ID | Uygulanmış bir ID verin |
| `MIGRATION_NOT_PENDING` | Baseline ID’si bekleyen migration değil | `migration-status` ile ID’yi seçin |
| `SCHEMA_MISMATCH` | Baseline: katlanmış tablo/sütun/enum canlı schema’da yok | Schema’yı eşleştirin, tekrar deneyin |
| `MIGRATIONS_PENDING` | Seed güncel migration ister | Önce `migrate` |
| `MIGRATION_INDEX_INVALID` | Concurrent index tekrar kurulduktan sonra da geçersiz | Index’i elle inceleyin (çakışan veri) |
| `MIGRATION_RUNNER_BUSY` | Başka migration/seed/baseline/restore çalışıyor | Bitmesini bekleyin; komut beklemez |
| `MIGRATION_CANCELLED` | İşlem iptal edildi (sinyal) | Aynı komutu tekrar çalıştırın |
| `LOCK_LOST` | Yönetim oturumu koptu/yanıt vermedi ya da kilit kayboldu | Aynı komutu tekrar çalıştırın |

## Yedek, geri yükleme ve pull

| Kod | Ne zaman | Ne yapmalı |
|---|---|---|
| `BACKUP_EXISTS` | Hedef klasör ya da `<hedef>.partial` var, ya da başka çalışma yazıyor | Başka klasör seçin; öldürülmüş çalışmanın `.partial`’ını silin ([operations.md](operations.md#artakalan-partial-klasörleri)) |
| `BACKUP_NOT_FOUND` | Kökte tamamlanmış set yok ya da `--set` eksik/yarım | Set listesine ve `backup.json`’a bakın |
| `BACKUP_INVALID` | Yedekte migration ledger’ı, tablo dosyası yok ya da biçim farklı | Yedeği inceleyin |
| `UNSUPPORTED_SCHEMA` | `export`/`backup`: schema’da yedeğin birebir üretemediği bir şey var (view, domain/range/composite tip, başka schema’daki enum, fonksiyon, desteklenmeyen sütun tipi …); ihlal edilen her kural bildirilir, mesaj mümkünse nesneyi adlandırır (kural başına en çok 20 ad, fazlası “and N more”) | Nesneyi kaldırın/değiştirin veya DB düzeyinde araçla yedekleyin ([operations.md](operations.md#neyi-kapsar-neyi-reddeder)) |
| `SCHEMA_NOT_EMPTY` | `restore`: hedef schema’da nesne var; hiçbir şey silinmedi | `--schema` ile başka ada yükleyin ya da eskisini kendiniz silin |
| `RESTORE_MISMATCH` | Geri yüklenen satır sayısı yedektekinden farklı | Transaction geri alındı; yedeği inceleyip tekrar deneyin |
| `VERSION_MISMATCH` | Yedek/kaynak ile hedefin PostgreSQL ana sürümü farklı | Aynı ana sürümde geri yükleyin |
| `COLLATION_MISMATCH` | Encoding, locale veya collation sürümü farklı | Hedef DB’yi aynı encoding/locale ile açın |
| `EXTENSION_MISMATCH` | Yedekteki eklenti hedefte yok ya da sürümü farklı | Önce aynı eklentileri kurun |
| `COPY_FAILED` | Sequence durumu veya sunucu bilgisi okunamadı | Erişimi denetleyip tekrar deneyin |
| `REPLICA_CONFLICT` | `--from-replica`: replica uzun snapshot’ı iptal etti (recovery çakışması) | Yeniden deneyin veya primary’den alın ([replicas.md](replicas.md)) |
| `REPLICA_LAG_EXCEEDED` | `--from-replica`: lag açılışta eşiği aştı/bilinmiyor ya da replica primary’nin konumuna o sürede yetişemedi | Yetişince tekrar deneyin. CLI eşiği değiştiremez (5000 ms); kodda `createManagement({ replicaMaxLagMs })` |
| `PULL_UNSUPPORTED` | `pull`: schema’da başlangıç migration’ının ifade edemediği nesne var; hepsi mesajda listelenir | Nesneyi kaldırın, pull’dan sonra elle yazın ya da `--exclude` ([migrations-and-seeds.md](migrations-and-seeds.md#var-olan-veritabanından-başlangıç-migrationı-pull)) |
| `SOURCE_SCHEMA_MISSING` | `pull`: kaynak schema yok | Adı denetleyin |
