/**
 * Canlı ön kayıtları CSV olarak indirir: `bun run presignups:export [dosya.csv]` (varsayılan `on-kayitlar-<tarih>.csv`).
 * Wrangler oturumunu kullanır (`wrangler login`); `--local` verilirse `wrangler dev`in yerel KV'sini okur.
 */
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { toCsv, type PresignupKey } from './lib/presignups-csv';

const args = process.argv.slice(2);
const local = args.includes('--local');
const out = resolve(args.find((a) => !a.startsWith('--')) ?? `on-kayitlar-${new Date().toISOString().slice(0, 10)}.csv`);

const proc = Bun.spawnSync(
  ['bunx', 'wrangler', 'kv', 'key', 'list', '--binding', 'PRESIGNUPS', '--prefix', 'email:', local ? '--local' : '--remote'],
  { cwd: resolve(import.meta.dirname, '..'), stderr: 'inherit' },
);
if (proc.exitCode !== 0) process.exit(proc.exitCode ?? 1);

const keys = JSON.parse(proc.stdout.toString()) as PresignupKey[];
writeFileSync(out, toCsv(keys));
console.log(`✓ ${keys.length} ön kayıt → ${out}`);
