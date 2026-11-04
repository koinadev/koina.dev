/** Sürücü sözleşmesi: Bun SQL, postgres.js ve pg bu küçük arayüzü uygular (`core/drivers/*`). Motor başka sürücü API'si kullanmaz.
 * Değer tipleri sürücüden bağımsızdır: int8/numeric string, date ve timestamptz `Date` (date UTC gece yarısı), json parse edilmiş,
 * uuid/interval string, bytea `Buffer`. */
export type Row = Record<string, unknown>;

export interface Connection {
  /** `$n` parametreli metin sorgusu; hiçbir zaman isimli prepared statement kullanmaz (PgBouncer/Hyperdrive güvenli).
   * Dizi `count` ile etkilenen/dönen satır sayısını taşır (`@koina/db/auth` bağdaştırıcısı `updateMany`/`deleteMany`). */
  query<R = Row>(text: string, params?: readonly unknown[]): Promise<R[] & { count?: number }>;
  /** Parametresiz, çok deyimli simple-protocol çalıştırma (DDL, `BEGIN; SET LOCAL …`). */
  exec(sql: string): Promise<void>;
}
/** Havuzdan ayrılmış tek bağlantı; ölmüşse sürücü `release` sonrası onu atar. */
export interface Reserved extends Connection {
  /** `discard`: bağlantı havuza dönmez, kapatılır (çalışan deyim bitmeden de); sonraki ayırma yeni bağlantı açar. */
  release(discard?: boolean): void;
  /** Bu bağlantıda çalışan deyimleri sunucuda iptal etmeyi dener (CancelRequest; PgBouncer doğru sunucuya iletir). Güvenilir iptali
   * olmayan sürücü (Bun SQL) bunu tanımlamaz; o durumda bağlantı atılır ve sunucu deyimi `client_connection_check_interval` ile keser. */
  cancel?(): void;
}
export interface Pool extends Connection {
  reserve(): Promise<Reserved>;
  close(timeoutMs: number): Promise<void>;
}
export interface PoolOptions {
  max: number;
  idleTimeoutSeconds: number;
  maxLifetimeSeconds: number;
  connectTimeoutSeconds: number;
  /** Bir bağlantı kapandığında (sunucu sonlandırdı, ağ koptu); yönetim oturumları ölümü böyle fark eder. */
  onClose?: () => void;
}
export type Driver = (url: string, options: PoolOptions) => Pool;

/** `Date` parametreleri her sürücüde ISO UTC metni olarak gider: Bun `prepare:false` ile `toString()` gönderir (reddedilir),
 * pg yerel saat ofseti gönderir (`::date` negatif ofsette bir gün kayar). */
export function normalizeParams(values: readonly unknown[] = []): unknown[] {
  // Sıcak yol: `Date` yoksa dizi kopyalanmaz (sürücüler parametre dizisini değiştirmez).
  for (const value of values) if (value instanceof Date) return values.map((item) => (item instanceof Date ? item.toISOString() : item));
  return values as unknown[];
}

/** Sürücüler süreyi kendi garantisi olarak sunmaz; havuz kapatma her sürücüde aynı üst sınırla biter. */
export function withTimeout(work: Promise<unknown>, ms: number) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const expired = new Promise<void>((resolve) => {
    timer = setTimeout(resolve, ms);
    timer.unref?.();
  });
  // İş bitince zamanlayıcı kalmaz (Workers'ta istek başına bir havuz kapanır).
  return Promise.race([work.then(() => {}), expired]).finally(() => clearTimeout(timer));
}

/** `begin` (ör. `BEGIN; SET LOCAL …`) → iş → `COMMIT`; hata olursa `ROLLBACK` (ölü ya da deadline'ı dolmuş bağlantıda o da düşer,
 * bağlantı atılır). `beginWith`: `begin`'i başka deadline'la çalıştıran aynı bağlantı. */
export async function runInTransaction<T>(
  connection: Connection,
  begin: string,
  work: (connection: Connection) => Promise<T>,
  beginWith: Connection = connection,
): Promise<T> {
  await beginWith.exec(begin);
  try {
    const result = await work(connection);
    await connection.exec("COMMIT");
    return result;
  } catch (error) {
    await connection.exec("ROLLBACK").catch(() => {});
    throw error;
  }
}
