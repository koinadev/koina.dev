/** `DATABASE_URLS` (bu pakette tek URL) ve isteğe bağlı `DATABASE_REPLICA_URLS` doğrulanır; ayarlar env değil, fabrikalara verilen tipli seçeneklerdir. */
import { AppError } from "./errors";

/** Düz veri: env'den (`loadConfig`) veya doğrudan URL'lerden (`createConfig`). Hata mesajları hiçbir zaman URL içermez. */
export interface Config {
  /** Runtime'da transaction-mode pooler (PgBouncer, Supavisor, Neon pooler, Hyperdrive) olmalı; yönetimde doğrudan (veya session pooling) bağlantı olmalı. */
  readonly url: string;
  /** Salt okunur replica URL'leri. */
  readonly replicas: readonly string[];
}

/** Seçenek → [varsayılan, üst sınır]. `statementTimeoutMs` runtime'da bağlantı edinme deadline'ı, yönetimde `migrate`'in yazdığı DB varsayılanıdır. */
const RUNTIME_LIMITS = {
  poolMax: [5, 100],
  statementTimeoutMs: [5000, 300000],
  idleTimeoutSeconds: [20, 300],
  maxLifetimeSeconds: [300, 3600],
  /** Replica okuması: bunu aşan lag'li replica elenir; durum (sağlık + lag) kaydı bu kadar önbellekte kalır. */
  replicaMaxLagMs: [5000, 3_600_000],
  replicaStatusMs: [5000, 60_000],
} as const;
const MANAGEMENT_LIMITS = {
  ...RUNTIME_LIMITS,
  migrationStatementTimeoutMs: [30000, 3600000],
  migrationLockTimeoutMs: [1000, 60000],
} as const;
type Limits = Record<string, readonly [number, number]>;
type Values<T> = { -readonly [K in keyof T]: number };

/** Sağlıklı replica yokken (düştü ya da lag eşiği aşıldı) okuma: primary'de (replica yapılandırılmışsa `READ ONLY` transaction'da) ya da `REPLICA_UNAVAILABLE`. */
export type ReplicaPolicy = "primary" | "error";
export function replicaPolicy(value: unknown = "primary"): ReplicaPolicy {
  if (value === "primary" || value === "error") return value;
  throw new AppError("INVALID_CONFIG", 'replicaOnUnavailable must be "primary" or "error"');
}
export type DatabaseOptions = Partial<Values<typeof RUNTIME_LIMITS>> & { replicaOnUnavailable?: ReplicaPolicy };
export type ManagementOptions = Partial<Values<typeof MANAGEMENT_LIMITS>>;
export type ManagementSettings = Config & Values<typeof MANAGEMENT_LIMITS>;

/** min..max (varsayılan 1..max) aralığında sayı veya rakam dizesi (CLI) kabul eder. */
export function boundedInteger(value: unknown, name: string, max: number, min = 1) {
  const number = typeof value === "string" && /^\d+$/.test(value) ? Number(value) : value;
  if (typeof number === "number" && Number.isInteger(number) && number >= min && number <= max) return number;
  throw new AppError("INVALID_CONFIG", `${name} must be an integer from ${min} to ${max}`);
}

/** Schema yönlendiren URL parametreleri: schema'yı motor seçer, bağlantı değil. */
const ROUTING_PARAMETERS = ["options", "search_path"];
const MAX_REPLICAS = 8;

function isDatabaseUrl(entry: string) {
  const url = URL.parse(entry);
  const routesSchema = [...(url?.searchParams.keys() ?? [])].some((key) => ROUTING_PARAMETERS.includes(key.toLowerCase()));
  return !!url && ["postgres:", "postgresql:"].includes(url.protocol) && !routesSchema;
}

/** Virgüllü metin ya da dizi → kırpılmış girdiler; boş metin boş liste. */
const entries = (value: string | readonly string[]) => (typeof value === "string" ? (value.trim() ? value.split(",") : []) : value).map((entry) => entry.trim());

/** Tam olarak bir postgres:// URL'si (schema yönlendirme parametresi yok) ve isteğe bağlı replica URL'leri (en çok 8, tekil, birincilden farklı). */
export function createConfig(value: string | readonly string[], replicas: string | readonly string[] = []): Config {
  const urls = entries(value);
  const [url] = urls;
  if (urls.length !== 1 || !url || !isDatabaseUrl(url)) throw new AppError("INVALID_CONFIG", "Invalid configuration: DATABASE_URLS");
  const extra = entries(replicas);
  if (extra.length > MAX_REPLICAS || !extra.every(isDatabaseUrl) || new Set([url, ...extra]).size !== extra.length + 1)
    throw new AppError("INVALID_CONFIG", "Invalid configuration: DATABASE_REPLICA_URLS");
  return { url, replicas: extra };
}

/** Ortam: runtime, CLI, araçlar ve testler `DATABASE_URLS` okur; runtime ayrıca isteğe bağlı `DATABASE_REPLICA_URLS` okur. */
export const loadConfig = (env: Record<string, string | undefined> = process.env) =>
  createConfig(env.DATABASE_URLS ?? "", env.DATABASE_REPLICA_URLS ?? "");

function settings<T extends Limits>(limits: T, config: Config, options: Partial<Values<T>>): Config & Values<T> {
  const values: Record<string, unknown> = { url: config.url, replicas: config.replicas };
  for (const [key, [fallback, max]] of Object.entries(limits)) values[key] = boundedInteger(options[key] ?? fallback, key, max);
  return values as Config & Values<T>;
}
export const runtimeSettings = (config: Config, options: DatabaseOptions = {}) => settings(RUNTIME_LIMITS, config, options);
export const managementSettings = (config: Config, options: ManagementOptions = {}) => settings(MANAGEMENT_LIMITS, config, options);

/** Sunucu, istemcisi kopmuş oturumun çalışan deyimini en geç bu aralıkta keser (PostgreSQL 14+). Deadline'ı dolan bağlantı atılır;
 * iptal edemeyen sürücüde (Bun SQL) deyimin arkadan commit etmemesini bu ayar sağlar. */
export const CLIENT_CONNECTION_CHECK_MS = 1000;

/** Runtime'ın sunucu tarafı ayarları: `migrate` her DB'ye varsayılan olarak yazar (lock_timeout en çok 1000), `doctor` denetler. */
export const runtimeDatabaseDefaults = ({ statementTimeoutMs }: { statementTimeoutMs: number }) => [
  `statement_timeout=${statementTimeoutMs}`,
  `lock_timeout=${Math.min(statementTimeoutMs, 1000)}`,
  `client_connection_check_interval=${CLIENT_CONNECTION_CHECK_MS}`,
];
