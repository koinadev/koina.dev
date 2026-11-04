/** `pg` uyumlu havuz sürücüsü fabrikası: node-postgres (`drivers/pg.ts`) ve Neon serverless (`drivers/neon.ts`) aynı yüzeyi sunar.
 * Bu dosya `pg`'yi veya `@neondatabase/serverless`'i içe aktarmaz: isteğe bağlı peer'ler birbirinin (ve Workers paketinin) bağımlılığı olmasın. */
import { type Connection, type Driver, normalizeParams, withTimeout } from "./driver";

interface QueryResult {
  rows: unknown[];
  rowCount?: number | null;
}
export interface PgClient {
  query(text: string, values?: unknown[]): Promise<QueryResult>;
  release(error?: Error | boolean): void;
  on(event: "end" | "error", listener: () => void): unknown;
}
export interface PgPool {
  query(text: string, values?: unknown[]): Promise<QueryResult>;
  connect(): Promise<PgClient>;
  on(event: "error" | "connect", listener: (client: PgClient) => void): unknown;
  end(): Promise<void>;
}
type TypeParsers = { getTypeParser(oid: number, format?: "text" | "binary"): unknown };
export interface PgPoolConfig {
  connectionString: string;
  max: number;
  idleTimeoutMillis: number;
  maxLifetimeSeconds: number;
  connectionTimeoutMillis: number;
  types: TypeParsers;
}
/** `pg` modülünün (veya Neon'un) bu fabrikanın kullandığı yüzeyi; iki paketin tipleri farklı bildirildiği için çağıran `as unknown as PgModule` ile verir. */
export interface PgModule {
  Pool: new (config: PgPoolConfig) => PgPool;
  types: TypeParsers;
}
export interface PgDriverOptions {
  /** İstemcinin çalışan deyimini sunucuda iptal eder; verilmezse `Reserved.cancel` tanımlanmaz (deadline sonrası bağlantı atılır). */
  cancel?(client: PgClient, url: string): void;
}

// Diğer sürücülerle aynı değerler: date UTC gece yarısı `Date`, interval metin. Global parser'lara dokunulmaz.
const overrides: Record<number, (value: string) => unknown> = {
  1082: (value) => new Date(`${value}T00:00:00Z`),
  1186: (value) => value,
};

function connection(client: Pick<PgPool, "query">): Connection {
  return {
    // Parametresiz sorgu simple protocol ile gider; parametreli sorgu isimsiz statement kullanır.
    query: async <R>(text: string, values?: readonly unknown[]) => {
      const result = await client.query(text, normalizeParams(values));
      const rows = result.rows as R[] & { count?: number };
      rows.count = result.rowCount ?? undefined;
      return rows;
    },
    exec: async (text) => {
      await client.query(text);
    },
  };
}

export function createPgDriver(module: PgModule, { cancel }: PgDriverOptions = {}): Driver {
  const types: TypeParsers = { getTypeParser: (oid, format) => overrides[oid] ?? module.types.getTypeParser(oid, format) };
  return (url, options) => {
    const pool = new module.Pool({
      connectionString: url,
      max: options.max,
      idleTimeoutMillis: options.idleTimeoutSeconds * 1000,
      maxLifetimeSeconds: options.maxLifetimeSeconds,
      connectionTimeoutMillis: options.connectTimeoutSeconds * 1000,
      types,
    });
    // Boştaki bağlantı hatası süreci düşürmemeli; bağlantı havuzdan zaten atılır.
    pool.on("error", () => {});
    // Ödünçteyken hata veren bağlantı bırakılırken atılır. Dinleyici bağlantı başına bir kez eklenir (ödünç başına değil).
    const broken = new WeakSet<PgClient>();
    pool.on("connect", (client) => {
      client.on("end", () => options.onClose?.());
      client.on("error", () => broken.add(client));
    });
    // pg-pool ikinci end() çağrısında fırlatır; bağlantı kaybı havuzu kapattıktan sonra oturumlar yine kapanabilir.
    let ending: Promise<void> | undefined;
    return {
      ...connection(pool),
      async reserve() {
        const client = await pool.connect();
        return {
          ...connection(client),
          ...(cancel ? { cancel: () => cancel(client, url) } : {}),
          release: (discard) => client.release(broken.has(client) || discard === true),
        };
      },
      close: (ms) => withTimeout((ending ??= pool.end().catch(() => {})), ms),
    };
  };
}
