# CLI başvurusu

`bun run cli <komut>` yönetim ve araç fonksiyonlarını sarar, sonucu JSON yazar. Günlük migration/seed işleri için kısa `db:*` script’leri vardır ([aşağıda](#paket-scriptleri-db)). `bun run cli --help` (veya `help`, `-h`, komuttan sonra `--help`) komut listesini yazar. Aşağıdaki tablonun CLI’nin bildiği komutlarla birebir aynı olduğunu `docs.test.ts` denetler.

## Komutlar

| Komut | Kullanım | Ne yapar |
|---|---|---|
| `migrate` | `[--dry-run] [--schema ad] [--statement-timeout-ms N] [--safety-point neon\|supabase] [--org ID]` | Bekleyen migration’ları uygular; schema yoksa kurar, runtime timeout’larını DB varsayılanı olarak yazar. `--safety-point` bekleyen migration varsa önce sağlayıcıda geri dönüş noktası alır ([providers.md](providers.md)) |
| `migrate-down` | `[--steps N \| --to ID] [--dry-run] [--schema ad] [--statement-timeout-ms N]` | Son migration’ları geri alır (varsayılan 1) |
| `migration-status` | `[--schema ad]` | Uygulanmış sayı ve bekleyenler (salt okunur) |
| `migration create` | `<ad>` | Boş `--up`/`--down` dosyası `src/migrations/<UTC zaman>_<ad>.sql` ve liste; DB’ye bağlanmaz |
| `migration baseline` | `<migrationId> [--schema ad]` | ID’ye kadar bekleyenleri çalıştırmadan uygulanmış işaretler |
| `seed` | `[--dry-run] [--schema ad] [--statement-timeout-ms N]` | Bekleyen seed’leri uygular (migration’lar güncel olmalı) |
| `seed create` | `<ad> [--ts]` | Boş SQL (veya `--ts` TypeScript) seed dosyası ve liste; DB’ye bağlanmaz |
| `pull` | `[schema] [--name init] [--exclude tablo ...]` | Var olan schema’dan (varsayılan `public`) tek başlangıç migration’ı yazar; ardından `migration baseline` |
| `export` | `<klasör> [--from-replica] [--schema ad]` | Schema’nın bütün verisini yeni bir klasöre yazar |
| `backup` | `<klasör> [--keep N] [--from-replica] [--schema ad]` | `<klasör>/<UTC zaman>` altına tam set yazar; `--keep N` eskileri siler (`prune` adlı klasör için `./prune` yazın) |
| `backup prune` | `<klasör> --keep N` | Son N tamamlanmış seti tutar, eskileri siler (yarım setlere dokunmaz); DB’ye bağlanmaz |
| `restore` | `<klasör> [--set ID] [--schema ad] [--statement-timeout-ms N]` | Yedek kökünden veya export klasöründen schema’yı kurar; hedef schema yok ya da boş olmalı |
| `auth generate` | `<seçenekModülü> [--name better_auth]` | Better Auth tablolarındaki fark için migration yazar (fark yoksa yazmaz) |
| `neon stage-copy` | `[--org ID]` | Neon: migrasyon denemesi için kaynak branch’ten branch açar |
| `neon export` | `<klasör> --at ZAMAN [--org ID] [--schema ad]` | Neon: schema’nın geçmiş anını klasöre yazar (uygulamak için `restore`) |
| `replicas` | | `DATABASE_REPLICA_URLS` replica’larının durumu ve lag’i; biri düşük ya da geride ise çıkış kodu 1 |
| `doctor` | `[--pgbouncer-url] [--pooled-url] [--schema ad]` | Bağlantı, timeout, schema, migration ve replica denetimleri; başarısız denetimde çıkış kodu 1 |

Ayrıntılar: [migrations-and-seeds.md](migrations-and-seeds.md), [operations.md](operations.md), [providers.md](providers.md), [replicas.md](replicas.md), [auth.md](auth.md).

## Ortak kurallar

```sh
bun run cli <komut> [argümanlar] [seçenekler] [--driver=bun|postgres|pg]
```

- **Çalışma klasörü:** `packages/db-single` (kökten `bun run single cli <komut>`); Bun `.env`’i oradan okar, dosya üreten komutlar `src/`’ye oraya yazar.
- **Ortam:** `DATABASE_URLS` (doğrudan veya session pooling, [configuration.md](configuration.md#doğrudan-ve-pooler-url)); `migration create`, `seed create` ve `backup prune` DB’ye bağlanmaz.
- **Sürücü:** `--driver=` yalnızca `=` biçiminde ve bir kez; varsayılan `bun`; Neon sürücüsü CLI’de yoktur.
- **Seçenekler:** `--ad değer` veya `--ad=değer`; konum argümanları seçeneklerden önce ya da sonra yazılabilir. Komutun kabul etmediği, tekrarlanan (`--exclude` hariç) veya değersiz seçenek ve fazla konum argümanı `USAGE` verir; mesaj yalnızca seçenek adını yazar (`Unknown option: --x`), değeri ya da konum argümanını yankılamaz. `--steps` ≤ 10000, `--keep` ≤ 1000, ikisi de ≥ 1; `--statement-timeout-ms` 1000–3600000 (yalnızca `migrate`, `migrate-down`, `seed`, `restore`; varsayılan 30000, aralık dışı `INVALID_CONFIG`): yönetim deyimlerinin üst süresi, büyük tabloda `CREATE INDEX CONCURRENTLY` gibi uzun deyimler için yükseltin.
- **`--schema`:** hedef schema (varsayılan `public`), DB’ye bakmadan doğrulanır (`x"; DROP`, büyük harf, `pg_*` → `INVALID_SCHEMA`). `pull` kaynak schema’yı konumsal argüman alır; `auth generate` `--schema` almaz (fark her zaman geçici schema’da hesaplanır).
- **Çıktı:** sonuç stdout’a JSON; ilerleme olayları (`migrate`, `migrate-down`, `seed`, `restore`) sonuçtan önce ayrı JSON belgeleridir, son üst düzey belge sonuçtur.
- **Hata:** stderr’e `{"error": "<kod>", "message": "..."}`, çıkış kodu 1; yalnızca `AppError` mesajları yazılır (diğerleri kimlik bilgisi içerebilir: “Operation failed; inspect PostgreSQL availability”). Bilinmeyen komut için (adı yankılanmadan) `Unknown command` ve yardım stderr’e yazılır, çıkış kodu 1. Çıkış kodu 1: her hata, başarısız `doctor` denetimi, `ok: false` `replicas`, iptal edilen çalışma. Kodlar: [errors.md](errors.md).
- **İptal:** `migrate`, `migrate-down`, `migration baseline`, `seed`, `export`, `backup`, `restore`, `neon export`, `auth generate` SIGINT/SIGTERM’de yeni adım almaz ve çalışan işi iptal eder; `MIGRATION_CANCELLED`/`LOCK_LOST` sonrası aynı komutu tekrar çalıştırın.

### Gizli girişler

Sır argv’ye, ortama veya dosyaya girmez ve çıktıya yazılmaz; bu seçenekler yalnızca “değeri gizli girişle sor” demektir: `--from-replica` (tek doğrudan replica URL’si), `--pooled-url` (uygulamanın runtime URL’si), `--pgbouncer-url` (PgBouncer konsol URL’si `postgres://.../pgbouncer`) ve Neon API anahtarı (`neon stage-copy`, `neon export`, `migrate --safety-point neon`). Ctrl+C/Ctrl+D iptal eder (`USAGE`); yönlendirilmiş girişte ilk satır okunur; bozuk URL hatası değeri içermez.

## Paket script’leri (`db:*`)

`db:migrate` (`migrate`), `db:rollback` (`migrate-down`), `db:status` (`migration-status`), `db:seed` (`seed`), `db:generate <ad>` (`migration create`), `db:generate:seed <ad> [--ts]` (`seed create`), `db:generate:auth <modül>` (`auth generate`), `db:pull [schema]` (`pull`), `db:codegen` (`bun src/core/sql/codegen.ts`, CI için `--check`), `verify:provider` ([providers.md](providers.md#verifyprovider)). Ek argümanlar iletilir (`bun run db:rollback --steps 2`). Kökten: `single:migrate`, `single:rollback`, `single:status`, `single:seed`, `single:generate`, `single:codegen`, `single:pull`; `bun run single <script>` herhangi bir paket script’ini, `bun run single cli <komut>` herhangi bir komutu çalıştırır.
