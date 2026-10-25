import { fileURLToPath } from 'node:url';
import type { AstroIntegration } from 'astro';

import { cacheStats, pruneCache, resolveCacheDir } from '../lib/build-cache';

/** Önbellek kullanan üreticiler. Yenisi eklenirse buraya da yazılmalı, yoksa artıkları birikir. */
const NAMESPACES = ['og', 'markdown'];

/**
 * Build önbelleğinin YAŞAM DÖNGÜSÜ: başlangıcı damgalar, bitişte kullanılmayan kayıtları siler
 * ve her üreticinin kaç tanesini önbellekten, kaç tanesini yeniden ürettiğini bildirir.
 *
 * Önbelleğin kendisi üreticilerde (`og/[slug].png.ts`, `page-markdown.ts`); burası yalnızca
 * çöp toplama ve raporlama. `pageMarkdown()`dan SONRA sıralanmalı: `astro:build:done` hook'ları
 * yapılandırma sırasıyla koşar ve markdown sayaçları o hook'ta dolar.
 *
 * Silme yalnızca `build:done`da yapılır, yani yalnızca BAŞARILI build'de: düşen bir build hiçbir
 * kaydı "kullanmamış" olabilir ve tüm önbelleği boşaltırdı.
 */
export default function buildCache(): AstroIntegration {
  let projectRoot = process.cwd();
  let startedAt = Date.now();

  return {
    name: 'build-cache',
    hooks: {
      'astro:config:done': ({ config }) => {
        projectRoot = fileURLToPath(config.root);
      },
      'astro:build:start': () => {
        // Dosya sistemi mtime çözünürlüğü kaba olabilir (1 sn); sınırı geriye çekmek yalnızca
        // "bir build fazla sakla" demektir, hiçbir zaman kullanılan kaydı silmez.
        startedAt = Date.now() - 1000;
      },
      'astro:build:done': ({ logger }) => {
        const report = NAMESPACES.map((namespace) => {
          const { hit, miss } = cacheStats(namespace);
          return `${namespace}: ${hit} önbellekten, ${miss} yeniden üretildi`;
        });
        const removed = pruneCache(NAMESPACES, startedAt, resolveCacheDir(projectRoot));
        logger.info(`Build önbelleği — ${report.join(' · ')} (${removed} eski kayıt silindi).`);
      },
    },
  };
}
