/**
 * `wrangler.toml` `[vars]` okuyucusu. `sync-wrangler-env.ts` ve `build-incremental.ts` paylaşır.
 */

import { existsSync, readFileSync } from 'node:fs';
import { parse } from 'smol-toml';

export function readWranglerVars(path: string): Record<string, string> {
  if (!existsSync(path)) {
    throw new Error(`wrangler.toml bulunamadı: ${path}`);
  }

  const config = parse(readFileSync(path, 'utf8')) as { vars?: Record<string, unknown> };

  if (!config.vars || typeof config.vars !== 'object') {
    throw new Error('wrangler.toml içinde [vars] bölümü yok');
  }

  const vars: Record<string, string> = {};
  for (const [key, value] of Object.entries(config.vars)) {
    // `.env` yalnızca tek satırlık düz metin taşır: sayı/tablo/çok satırlı değer sessizce
    // bozulacağı için build'i burada durdurmak daha güvenli.
    if (typeof value !== 'string' || value.includes('\n')) {
      throw new Error(`\`vars.${key}\` tek satırlık bir metin olmalı`);
    }
    vars[key] = value;
  }

  return vars;
}
