# Yönetilen Postgres sağlayıcıları (Neon, Supabase, RDS, Hyperdrive)

Hangi bağlantı türünün hangi iş için kullanılacağı. Sağlayıcı davranışı varsayılmaz, ölçülür.

> **Bu sayfadaki hiçbir şey gerçek bir Neon, Supabase veya RDS hesabında doğrulanmadı (tüm satırlar belgeye dayanır).** Sağlayıcı araçları (`neon stage-copy`, `neon export`, `migrate --safety-point`) yalnızca **sahte bir Neon API’sine** (çağırdıkları HTTP uç noktalarının yerel taklidi) ve yerel PostgreSQL’e karşı sınandı; Supabase güvenlik noktası hiç API çağrısı yapmaz. Neon *sürücüsü* yerel WebSocket proxy üzerinden sınanır: bu sürücüyü sınar, Neon servisini değil. Araçları ve `verify:provider`’ı kendi hesabınızda çalıştırmak ilk gerçek ölçümdür.

Temel kural ([configuration.md](configuration.md#doğrudan-ve-pooler-url)): **uygulama** transaction-mode pooler’a, **yönetim** doğrudan veya session-pooled bağlantıya bağlanır.

## URL türü → rol

| Sağlayıcı | URL türü | Kullanım |
|---|---|---|
| Neon | doğrudan (`ep-…`, `-pooler` yok) | yönetim |
| Neon | `-pooler` (PgBouncer, transaction) | uygulama; Workers/edge’de `neonDriver` |
| Supabase | doğrudan `db.<ref>.supabase.co:5432` (yalnızca IPv6; IPv4 eklentisi ücretli) | yönetim (IPv6 ağı varsa) |
| Supabase | Supavisor session `…pooler.supabase.com:5432` (kullanıcı `postgres.<ref>`) | yönetim (IPv4) |
| Supabase | Supavisor transaction `…pooler.supabase.com:6543` | uygulama |
| Supabase | ayrılmış PgBouncer `db.<ref>.supabase.co:6543` (ücretli plan) | uygulama |
| RDS | instance endpoint | yönetim |
| RDS | önünde transaction-mode pooler (PgBouncer veya transaction pooling’e ayarlı RDS Proxy) | uygulama |
| Hyperdrive | Workers binding | uygulama; sınama yanlış negatif verebilir, `pooler: "assumed"` önerilir |

`migrate` `ALTER DATABASE … SET` yazar: her sağlayıcıda DB’yi sahiplenen rolle çalıştırın ([operations.md](operations.md#migratein-veritabanına-yazdıkları)).

## `verify:provider`

```bash
DATABASE_URLS='<yönetim URL’si>' bun run verify:provider [--driver bun|postgres|pg|neon] [--replica]
```

Pooler sınamasını, `migrate`’in `ALTER DATABASE` işini, yetkileri ve deadline sonrası sunucu davranışını ölçer; alanlar JSON çıktısında ve `src/__tests__/provider/measure.ts`’tedir. Uygulama URL’si (ve `--replica` ile replica URL’si) gizli girişle sorulur; çıktı URL, host, kullanıcı, parola içermez. **Yalnızca ücretsiz/geçici test DB’lerinde çalıştırın:** `statement_timeout` DB varsayılanını geçici değiştirir ve geri yazar; yazılamazsa `alterDatabase.restoreSql` elle çalıştırılacak komutu verir. Bağlantı denetimlerini `doctor --pooled-url` ölçer; ikisini birlikte kullanın.

| Ölçüm | Eylem |
|---|---|
| Gerçek pooler’da sınama `false` | Yanlış negatif: o sağlayıcı için `pooler: "assumed"` |
| `ALTER DATABASE … SET` reddedilir | Rolün yetkisi sağlayıcıda düzeltilmeli; yoksa runtime timeout’ları kurulamaz |
| Supabase doğrudan URL IPv6 yüzünden bağlanamaz | `DATABASE_UNAVAILABLE`; yönetim için session pooler (`:5432`) |
| Pooler üzerinde deadline sonrası backend sürer | Deyim sunucu `statement_timeout`’una kadar çalışabilir; runtime `statement_timeout`’unu düşük tutun |

## Sağlayıcı araçları

Neon araçları Neon API’sini `fetch` ile çağırır. API anahtarı **gizli girişle** sorulur (argv/ortama girmez) ve hiçbir çıktıya ya da hata mesajına girmez. Proje, `DATABASE_URLS` host’unun (`-pooler` eki yok sayılır) anahtarın hesabındaki endpoint’lerle eşleştirilmesiyle bulunur (`PROVIDER_NODE_NOT_FOUND`); organizasyon hesabında `--org <id>` verin (yalnızca neon ile, aksi `USAGE`). **Araçlar hiçbir branch silmez** (silme geri alınamaz): açtıkları branch’leri Neon konsolundan siz silin. Ücretsiz planın branch sayısı ve geçmiş süresi sınırlıdır; sınır aşılırsa Neon’un mesajı `PROVIDER_API_ERROR` olarak görünür. Her API isteği 30 sn ile sınırlıdır ve Ctrl-C ile iptal edilir; branch operasyonunu beklemek 120 sn ile sınırlıdır. Bir hatadan sonra branch açılmışsa hata onu (ad, proje, branch id) adlandırır ve silinmediğini söyler.

| Komut | Ne yapar |
|---|---|
| `migrate --safety-point neon` | `migrate`’ten önce kaynak branch’in o anki noktasından `pre-migrate-<UTC zaman>` branch’i açar. **Açılamazsa `migrate` hiç çalışmaz.** `--dry-run` ve bekleyen migration olmayan çalıştırma nokta almaz |
| `migrate --safety-point supabase` | API çağrısı yapmaz, anahtar istemez: UTC saniyeyi (`recoveryTimeTargetUnix`) kaydeder ve `restore-pitr` isteğini yazdırır |
| `neon stage-copy` | Migrasyon denemesi için kaynak branch’ten `stage-<zaman>` branch’i açar; yalnızca branch id ve host yazılır, parolalı URI yazılmaz (parolayı konsoldan alın) |
| `neon export <klasör> --at ZAMAN` | `--at` anından `pitr-<zaman>` branch’i açar, onunla geçici yönetim bağlamı kurup `export` eder; canlı veriye yazılmaz |

- **`--safety-point neon` bekleyen migration olan her `migrate`’te bir branch açar ve asla silmez** (bekleyen yoksa açmaz). Branch’ler plan kotasından düşer; konsoldan temizleyin.
- **30 sn’yi aşan bir `POST /branches` branch bırakabilir.** Neon istemci vazgeçtikten sonra branch’i yine açabilir; araç yanıtı hiç görmediği için hata yalnızca isteğin zaman aşımına uğradığını söyler, branch’i adlandırmaz. Neon konsolunda eşleşen zamanlı `pre-migrate-`, `stage-` veya `pitr-` branch’ini arayıp çalışma devam etmediyse silin.

### Geçmiş bir ana döndürme

```bash
bun run cli neon export ./at-0930 --at 2026-10-03T09:30:00Z   # --at: UTC ofsetli RFC 3339 ve geçmişte; ofsetsiz zaman reddedilir
bun run cli restore ./at-0930 --schema restored               # hedef schema yok ya da boş olmalı
```

`--at` ve hedef klasör API anahtarı sorulmadan önce denetlenir: var olan `<klasör>` veya `<klasör>.partial` hiçbir branch açılmadan `BACKUP_EXISTS` verir (branch silinmediği için tekrarlar birikirdi). `restore` var olan nesnelerin üstüne yazmaz (`SCHEMA_NOT_EMPTY`); karşılaştırmak ya da satırları geri kopyalamak için başka schema adına yükleyin. Çıktı `{ dir, tables, rows, at, branch, note }`; geçici branch kalır.

### Supabase

Supabase güvenlik noktası yalnızca zaman kaydeder ve **ücretli bir eklentiye dayanır**: PITR yalnızca Pro, Team ve Enterprise planlarında açılabilir; ücretsiz planda ya da eklenti olmadan kaydedilen zaman geri dönüş noktası değildir (orada `migrate` öncesi kendi dump’ınızı alın). PITR (`POST https://api.supabase.com/v1/projects/{ref}/database/backups/restore-pitr`, gövde `{"recovery_time_target_unix": <saniye>}`) **tüm projeyi yerinde ve kesintiyle** geri yükler; tek schema’yı geri yüklemek mümkün değildir.

## Sınırlar

Neon HTTP `neon()` fonksiyonu desteklenmez (etkileşimli oturum ve ayrılmış bağlantı sunmaz).
