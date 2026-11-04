# SQL derleyicisi

Uygulama SQL’i (`src/queries/*.sql`, migration ve seed’ler) `bun run db:codegen` sırasında bir kez derlenir; runtime girişi (`src/index.ts`) parser’ı hiç yüklemez. Kullanım: [docs/queries.md](../../../docs/queries.md), [docs/migrations-and-seeds.md](../../../docs/migrations-and-seeds.md).

## Derleme ne yapar

1. **Ayrıştırma**: kaynak sabitlenmiş `pgsql-ast-parser@12.0.2` ile bir kez ayrıştırılır. Yorumlar önce aynı uzunlukta boşlukla maskelenir (konumlar korunur). Parser’ın tanımadığı birkaç yan cümle (`ALTER COLUMN … TYPE … USING`, `UNIQUE NULLS NOT DISTINCT`, `ALTER TYPE … ADD VALUE IF NOT EXISTS/BEFORE/AFTER`, `INTERSECT`/`EXCEPT`, `IS [NOT] DISTINCT FROM`, `GROUPING SETS`, katı pencere çerçeveleri, `WITH RECURSIVE`) `parser-gaps.ts`’te yalnızca parser’ın kopyasında gizlenir ve ayrıştırmadan sonra tam olarak bitişiğindeki AST düğümüne bağlanır; bağlanamayan yan cümle reddedilir. Üretilen SQL her zaman özgün kaynaktır.
2. **Doğrulama**: `grammar.ts` her AST düğüm türü için izinli alanları, tipleri, fonksiyonları ve operatörleri sayar; `compiler.ts` anlamsal kuralları (kapsam, CTE çözümü, kilit cümlesi, `DROP … CASCADE` kuralı) uygular. Bilinmeyen düğüm ya da alan, schema’lı ad, eklenti tipi/fonksiyonu, dollar-quote ve `U&` tırnaklama `SQL_UNSUPPORTED` ile reddedilir. Desteklenen alt kümenin tek doğru listesi `grammar.ts`’tir.
3. **Parçalara bölme**: her gerçek tablo/DML hedefi/FK hedefi/enum adı için schema ekleme noktası kaydedilir; yerleşik tipler ve fonksiyonlar `pg_catalog` ile nitelenir (çıplak `INTERVAL` hariç). `casing.ts` en dıştaki çıktı adlarını camelCase takma ada çevirir; `*` ancak bir sütun adı değişiyorsa migration’lardan katlanan (`tables.ts`) sütun listesine açılır.
4. **Bağlama**: `bind(schema)` yalnızca schema adını doğrular ve değişmez parçaları birleştirir; AST yürüyüşü, oturum ayarı ya da önbellek yoktur. Değerler her zaman `$n` parametresidir.

Sonuç (`PreparedQuery`) değişmezdir ve `readOnly` (kilitsiz, veri değiştirmeyen) ile `requiresTransaction` (`FOR UPDATE …`) bayraklarını taşır. Migration bölümleri `prepareMigration` ile çok deyimli derlenir ve ayrıştırılmış `statements`’ı da verir (registry CONCURRENTLY index’i, codegen tablo tiplerini buradan türetir). `pull` çıktısındaki kaynak schema önekleri `unqualifyMigration` ile AST konumunda silinir, sonra normal derleme yapılır.

## Sınır

Derleyici güvenilir uygulama kodu içindir, istemciden SQL kabul etmez. Yetki, view/trigger içeriği ve PostgreSQL’in kendi anlamsal denetimi (eksik sütun, tip uyuşmazlığı) kapsam dışıdır. Bağlantılar `standard_conforming_strings=on` (varsayılan) kullanmalıdır.

## Genişletmek

Yeni sözdizimi için: `grammar.ts`’e alanı/fonksiyonu/operatörü ekleyin; schema taşıyan her yeni ad için `compiler.ts`’te ekleme noktası ve kapsam kuralı yazın; kabul ve ret testlerini (`sql*.test.ts`) aynı değişiklikte ekleyin. Parser sürümünü yükseltmek aynı incelemeyi gerektirir (yeni AST alanları, kaynak konumları). Mevcut migration dosyaları yeni gramer için düzenlenmez; yeni migration eklenir.
