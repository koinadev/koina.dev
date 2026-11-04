# Replica okuması

Replica okuma yükünü primary’den alır. Yazı her zaman primary’dedir ve paket sorguyu **kendiliğinden yönlendirmez**: replica’dan okuma açık bir çağrıdır (`db.read.query`), çünkü replica bayat olabilir.

## Yapılandırma

URL’ler `DATABASE_REPLICA_URLS` (ya da `createConfig`’in ikinci argümanı) ile verilir: virgüllü düz liste, en çok 8, tekil, birincilden farklı; bozuksa `INVALID_CONFIG`. Davranış üç düz seçenekle ayarlanır (`createDb`, `dbMiddleware`; yeni ortam değişkeni yok): `replicaMaxLagMs` (5000; bunu aşan lag’li replica kullanılmaz), `replicaStatusMs` (5000; durum önbellek süresi), `replicaOnUnavailable` (`"primary"` | `"error"`) — sınırlar [configuration.md](configuration.md#runtime-seçenekleri-createdb)’de. Replica bağlantıları tembel açılır; `ready()` replica’yı beklemez ve ondan hata vermez. Her replica `poolMax` büyüklüğünde kendi havuzunu açar: toplam `poolMax × (1 + replica sayısı)`.

## Kullanım

```ts
import { findUsers } from "@koina/db/repositories/users";

await findUsers(db.read, 20);            // Db üzerinde: her çağrıda replica seçer; repository fonksiyonuna db.read verin
await findUsers(c.get("db").read, 20);   // istek kapsamında (middleware, createDbScope)
```

- Okuma bağlamında yalnızca `query` vardır; replica’da `transaction` yoktur (uzun transaction recovery çakışması riski taşır).
- İstek kapsamında okumalar **ilk okumanın seçtiği replica’ya sabitlenir** (iki okuma farklı bayatlıkta görüntü görmez); replica bağlantı hatasıyla düşerse sabitleme kalkar. Round-robin sırası modül düzeyindedir (yalnızca sayaç).
- **`readOnly` bayrağı:** codegen her sorguya SQL’in AST’sinden `readOnly` yazar (çalışma anında SQL ayrıştırılmaz). `readOnly` olmayan sorgu (`INSERT`/`UPDATE`/`DELETE`, `FOR UPDATE/SHARE`, veri değiştiren CTE) okuma bağlamında DB’ye gidilmeden `QUERY_NOT_READ_ONLY` olur. Yan etkili fonksiyonlar (`nextval`) statik ayrılamaz: replica yazıyı kendisi reddeder, ama primary’deki okuma (replica yok ya da yazıdan sonra) tek deyimdir ve engellemez; okuma sorgusuna yan etkili fonksiyon koymayın.
- **Yazıdan sonra okuma:** aynı istek kapsamında bir yazı çalıştıysa (transaction içindeki dahil) sonraki `read.query` çağrıları primary’ye gider (tek deyim); yalnızca okuyan sorgular işaret koymaz. Başka isteğe taşan tutarlılık garanti edilmez; gerekiyorsa o okumayı `db.query`/`db` ile yapın.

## Düşme politikası

Sağlıklı replica yoksa (hiç yapılandırılmamış, düşmüş, `in_recovery` değil, lag eşiği aşılmış): `"primary"` (varsayılan) okumayı primary’de tek deyim olarak çalıştırır (replica yapılandırılmış ama kullanılamıyorsa `READ ONLY` transaction’da: replica okumasıyla aynı anlam, ek `BEGIN`/`COMMIT` gidiş-dönüşü); `"error"` `REPLICA_UNAVAILABLE` verir (replica hiç yapılandırılmamışsa da; sessiz düşme yok). Yazıdan sonra okuma bundan etkilenmez. Replica sorgusu bağlantı hatasıyla düşerse hata olduğu gibi çıkar ve replica `replicaStatusMs` boyunca kullanılmaz; sorgu başına gizli yeniden deneme yoktur.

## Lag ölçümü

Durum tembel yoklanır (arka plan zamanlayıcısı yok; Workers’ta yaşamaz), `replicaStatusMs` önbelleğe alınır, aynı replica için eşzamanlı çağrılar tek yoklamayı paylaşır. Yoklama primary’den `pg_current_wal_lsn()`, replica’dan `pg_is_in_recovery()`, `pg_last_wal_replay_lsn()` ve `pg_last_xact_replay_timestamp()` okur: replica primary’nin konumuna ulaştıysa lag **0**, değilse son replay edilen commit’ten bu yana geçen süre; `in_recovery` false ise URL replica değildir ve kullanılmaz. Commit’siz WAL akarken (autovacuum, checkpoint) lag kısa süre fazla görünebilir; hata yönü güvenlidir (primary’ye düşme).

## Araçlar

**`replicas`** (`bun run cli replicas`): `DATABASE_REPLICA_URLS`’teki her replica’yı önbelleksiz yoklar, `{ ok, maxLagMs, replicas: [{ replica, up, inRecovery, lagMs, usable, error? }] }` yazar (`replica` config sırasıyla 1 tabanlı numara; **hiçbir çıktıda URL, host, kullanıcı, parola yok**). Replica düşükse, replica değilse ya da lag eşiği aşıyorsa `ok: false` ve çıkış kodu 1. Kodda `replicaReport(m)` (`@koina/db/tools`), uygulamada `db.replicas()`.

**`doctor` replica denetimleri** (hedef `replica#1`…; hepsi salt okunur): `replica_reachable` (bağlanılamazsa diğerleri atlanır), `replica_in_recovery` (primary’yi replica diye vermek), `replica_lag`, `replica_runtime_timeouts` (DB varsayılanları replica ile gelmedi: primary’de `migrate`).

**`--from-replica`** (`export`, `backup`): veri primary yerine replica’dan okunur. Komut **tek bir doğrudan replica URL’sini gizli girişle** sorar (argv/ortama yazılmaz; `DATABASE_REPLICA_URLS` okunmaz). Hiçbir şey yazmadan doğrular: tek düz URL ve primary’den farklı (`INVALID_CONFIG`), transaction pooler değil (`DIRECT_CONNECTION_REQUIRED`; yedek çok adımlı REPEATABLE READ snapshot ve cursor kullanır), gerçekten replica (`INVALID_CONFIG`), açılışta lag eşiğin altında (`REPLICA_LAG_EXCEEDED`).

- Okumadan önce replica primary’nin o anki WAL konumunu replay edene kadar beklenir (en çok `replicaMaxLagMs`, sonra `REPLICA_LAG_EXCEEDED`); `backup.json` `source: "replica"` ve verinin `replayLsn`’ini taşır.
- **Recovery çakışması:** standby uzun snapshot’ı `max_standby_streaming_delay` sonunda iptal edebilir; sürücüler bunu genel bağlantı hatası gösterir. Araç her transaction başında standby’ın çakışma sayacını (`pg_stat_database_conflicts`) okur; bağlantı sınıfı hata sırasında sayaç arttıysa `REPLICA_CONFLICT` bildirir. Yeniden deneyin ya da primary’den alın; sağlayıcıda `hot_standby_feedback` ve `max_standby_streaming_delay` ayarlarına bakın ([providers.md](providers.md)).
- Sessizce primary’ye düşmez. Geri yükleme aynı `restore` komutudur.
