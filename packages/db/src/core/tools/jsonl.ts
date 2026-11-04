/** JSON Lines dosyaları: satır satır okuma (`.gz` ise açarak), batch'lere bölme ve gzip'li yazma. */
import { once } from "node:events";
import { createReadStream, createWriteStream } from "node:fs";
import { createInterface } from "node:readline";
import { finished } from "node:stream/promises";
import { createGunzip, createGzip } from "node:zlib";

/** Dosyanın satırları (boş satırlar dahil); `.gz` uzantılı dosya açılarak okunur. */
export function readLines(path: string): AsyncIterable<string> {
  const input = createReadStream(path);
  return createInterface({ input: path.endsWith(".gz") ? input.pipe(createGunzip()) : input, crlfDelay: Infinity });
}

/** Boş olmayan satırları `size` uzunluğunda gruplar; son grup daha kısa olabilir. */
export async function* batches(lines: AsyncIterable<string>, size: number): AsyncGenerator<string[]> {
  let batch: string[] = [];
  for await (const line of lines) {
    if (!line) continue;
    batch.push(line);
    if (batch.length === size) {
      yield batch;
      batch = [];
    }
  }
  if (batch.length) yield batch;
}

export type GzipWriter = { write(line: string): Promise<void>; close(): Promise<void> };

/** `file` için gzip yazıcısı. `write` satır sonunu kendisi ekler ve akış dolarsa boşalmasını bekler; `close` dosya kapanana kadar bekler. */
export function openGzipWriter(file: string): GzipWriter {
  const gzip = createGzip();
  const done = finished(gzip.pipe(createWriteStream(file)));
  return {
    async write(line) {
      if (!gzip.write(`${line}\n`)) await once(gzip, "drain");
    },
    async close() {
      gzip.end();
      await done;
    },
  };
}
