/** `bun run cli`: argümanları doğrular, yönetim ve araç fonksiyonlarını çağırır, JSON yazdırır; hata
 * veya eksik işte çıkış kodu 1. DB modülleri ve seçilen sürücü geç yüklenir; `local` komutlar (dosya üretenler) DB'ye bağlanmaz. */
import { boundedInteger } from "./config";
import type { Driver } from "./driver";
import { AppError, errorCode } from "./errors";
import { validateSchema } from "./identifier";
import type { Management } from "./management";
import type * as ManagementApi from "../management";

/** Çözülmüş seçenekler; `--pgbouncer-url`, `--pooled-url` ve `--from-replica` değer almaz, yalnızca "URL'yi gizli girişle sor" anlamına gelir. */
type Options = {
  /** Hedef schema (`--schema`); verilmezse `public`. */
  schema?: string;
  steps?: number;
  /** Yönetim deyimlerinin üst süresi (ms); verilmezse 30 s. */
  statementTimeoutMs?: number;
  to?: string;
  name?: string;
  keep?: number;
  set?: string;
  at?: string;
  org?: string;
  safetyPoint?: string;
  exclude?: string[];
  signal?: AbortSignal;
  report?: (event: Record<string, unknown>) => void;
  dryRun?: boolean;
  ts?: boolean;
  pgbouncerUrl?: boolean;
  pooledUrl?: boolean;
  fromReplica?: boolean;
};
interface Command {
  /** `<x>` zorunlu, `[x]` isteğe bağlı argüman; `--…` yalnızca yardım metnidir. */
  usage: string;
  summary: string;
  /** Kabul edilen seçenekler. */
  flags?: readonly string[];
  /** SIGINT/SIGTERM yeni iş alımını durdurur ve iş iptal edilir; yerel komutlarda işi durdurur. */
  cancellable?: boolean;
  local?(options: Options, ...args: string[]): Promise<unknown>;
  run?(context: { api: typeof ManagementApi; app: Management; options: Options }, ...args: string[]): Promise<unknown>;
}

const print = (value: unknown) => console.log(JSON.stringify(value, null, 2));
const usage = (message: string) => new AppError("USAGE", message);
const BOOLEAN_FLAGS = ["--dry-run", "--ts", "--pgbouncer-url", "--pooled-url", "--from-replica"];
/** Tekrarlanabilen seçenekler: değerler (virgülle de ayrılabilir) listede birikir. */
const REPEATABLE_FLAGS = ["--exclude"];
/** Sayı seçenekleri → [alt, üst] sınır. */
const INTEGER_FLAGS: Record<string, readonly [number, number]> = { "--steps": [1, 10000], "--keep": [1, 1000], "--statement-timeout-ms": [1000, 3600000] };
const TIMEOUT_FLAG = ["--statement-timeout-ms"];
const HELP_FLAGS = ["--help", "-h"];
const DRIVER_FLAG = "--driver=";
const SCHEMA_FLAGS = ["--schema"];
const commaList = (value: string) => value.split(",").map((id) => id.trim()).filter(Boolean);
/** Yalnızca seçilen sürücü yüklenir; CLI Bun'da çalıştığı için varsayılan Bun SQL'dir (testler kendi sürücüsünü ekler). */
export const drivers: Record<string, () => Promise<Driver>> = {
  bun: () => import("./drivers/bun").then((m) => m.bunDriver),
  postgres: () => import("./drivers/postgres").then((m) => m.postgresDriver),
  pg: () => import("./drivers/pg").then((m) => m.pgDriver),
};
const REPLICA_URL_QUESTION = "Doğrudan replica URL'si (postgres://…, yazılan görünmez): ";
const POOLED_URL_QUESTION = "Runtime URL'si (DATABASE_URLS biçimi, yazılan görünmez): ";
const PGBOUNCER_URL_QUESTION = "PgBouncer konsol URL'si (postgres://…/pgbouncer, yazılan görünmez): ";
/** Parola taşıyan URL gizli girişle sorulur; biçim doğrulanır, hata metinleri değeri içermez. */
const askUrl = async (question: string, subject: string) => {
  const { askSecret, postgresUrl } = await import("./tools/ask-secret");
  return postgresUrl(await askSecret(question), subject).href;
};
const askReplicaUrl = () => askUrl(REPLICA_URL_QUESTION, "Replica URL");
const backup = () => import("./tools/backup");
const NEON_KEY_QUESTION = "Neon API anahtarı (yazılan görünmez): ";
const neon = () => import("./tools/neon");
/** Neon API anahtarı argv'ye veya env'e girmez; gizli girişle sorulur. */
const askNeonApi = async (signal?: AbortSignal) => {
  const [{ askSecret }, { neonApi }] = await Promise.all([import("./tools/ask-secret"), neon()]);
  return neonApi(await askSecret(NEON_KEY_QUESTION), { signal });
};

/** `migrate --safety-point`: bekleyen migration varsa migrate'ten ÖNCE sağlayıcıda güvenlik noktası alınır; alınamazsa hata migrate'i hiç başlatmaz.
 * `--dry-run` ve bekleyeni olmayan çalıştırma nokta almaz (her dağıtımda branch açmak sağlayıcı kotasını tüketirdi). */
export async function takeSafetyPoint(api: Pick<typeof ManagementApi, "migrate">, app: Management, options: Options, openApi = askNeonApi) {
  if (options.safetyPoint === undefined && options.org === undefined) return;
  const tools = await neon();
  const provider = tools.safetyPointProvider(options.safetyPoint);
  if (options.org !== undefined && provider !== "neon") throw usage("--org applies to --safety-point neon");
  if (!provider || options.dryRun || !(await api.migrate(app, { dryRun: true })).migrations.length) return;
  return provider === "neon" ? tools.safetyPoint(app, await openApi(options.signal), { org: options.org }) : tools.supabaseSafetyPoint();
}

const commands: Record<string, Command> = {
  migrate: {
    usage: "[--dry-run] [--schema ad] [--statement-timeout-ms N] [--safety-point neon|supabase] [--org ID]",
    summary: "Bekleyen migration'ları uygular; schema yoksa kurar ve runtime timeout'larını DB varsayılanı olarak yazar (--safety-point: önce sağlayıcıda güvenlik noktası alır)",
    flags: ["--dry-run", "--safety-point", "--org", ...TIMEOUT_FLAG, ...SCHEMA_FLAGS],
    cancellable: true,
    run: async ({ api, app, options }) => {
      const point = await takeSafetyPoint(api, app, options);
      if (point) print(point);
      return api.migrate(app, options);
    },
  },
  "migrate-down": {
    usage: "[--steps N | --to ID] [--dry-run] [--schema ad] [--statement-timeout-ms N]",
    summary: "Son migration'ları geri alır (varsayılan 1)",
    flags: ["--steps", "--to", "--dry-run", ...TIMEOUT_FLAG, ...SCHEMA_FLAGS],
    cancellable: true,
    run: ({ api, app, options }) => api.rollback(app, options),
  },
  "migration-status": {
    usage: "[--schema ad]",
    summary: "Uygulanmış sayıyı ve bekleyen migration'ları gösterir (salt okunur)",
    flags: SCHEMA_FLAGS,
    run: ({ api, app }) => api.migrationStatus(app),
  },
  "migration create": {
    usage: "<name>",
    summary: "Boş --up/--down dosyası (src/migrations/<UTC zaman>_<ad>.sql) ve liste",
    local: async (_, name) => (await import("./sql/codegen")).createMigration({ name }),
  },
  "migration baseline": {
    usage: "<migrationId> [--schema ad]",
    summary: "Çalıştırmadan uygulanmış işaretler (canlı schema migration'ın tablo, sütun ve enum'larını içermeli)",
    flags: SCHEMA_FLAGS,
    cancellable: true,
    run: ({ api, app, options }, migrationId) => api.baseline(app, migrationId, options),
  },
  seed: {
    usage: "[--dry-run] [--schema ad] [--statement-timeout-ms N]",
    summary: "Bekleyen seed'leri uygular (migration'lar güncel olmalı)",
    flags: ["--dry-run", ...TIMEOUT_FLAG, ...SCHEMA_FLAGS],
    cancellable: true,
    run: ({ api, app, options }) => api.seed(app, options),
  },
  "seed create": {
    usage: "<name> [--ts]",
    summary: "Boş SQL (veya --ts) seed dosyası ve liste",
    flags: ["--ts"],
    local: async ({ ts }, name) => (await import("./sql/codegen")).createSeed({ name, kind: ts ? "ts" : "sql" }),
  },
  pull: {
    usage: "[schema] [--name init] [--exclude tablo ...]",
    summary: "Var olan schema'nın yapısından tek başlangıç migration'ı yazar (DB'yi yalnızca okur; schema varsayılan public; ardından migration baseline)",
    flags: ["--name", "--exclude"],
    run: async ({ app, options }, schema) => (await import("./tools/pull")).pullSchema(app, schema || "public", { name: options.name, exclude: options.exclude }),
  },
  export: {
    usage: "<dir> [--from-replica] [--schema ad]",
    summary: "Schema'nın bütün verisini tek seferde klasöre yazar (klasör var olmamalı; --from-replica: veriyi replica'dan okur, URL gizli girişle sorulur)",
    flags: ["--from-replica", ...SCHEMA_FLAGS],
    cancellable: true,
    run: async ({ app, options }, dir) => (await backup()).exportSchema(app, dir, { signal: options.signal, replicaUrls: options.fromReplica ? await askReplicaUrl() : undefined }),
  },
  backup: {
    usage: "<dir> [--keep N] [--from-replica] [--schema ad]",
    summary: "<dir>/<UTC zaman> altına tam bir yedek seti yazar; --keep N eskileri siler (--from-replica: veriyi replica'dan okur)",
    flags: ["--keep", "--from-replica", ...SCHEMA_FLAGS],
    cancellable: true,
    run: async ({ app, options }, dir) => (await backup()).backupSchema(app, dir, { keep: options.keep, signal: options.signal, replicaUrls: options.fromReplica ? await askReplicaUrl() : undefined }),
  },
  "backup prune": {
    usage: "<dir> --keep N",
    summary: "Son N tamamlanmış seti tutar, eskileri siler (yarım setlere dokunmaz)",
    flags: ["--keep"],
    local: async ({ keep }, dir) => {
      if (keep === undefined) throw usage("backup prune needs --keep N");
      return (await backup()).pruneBackups(dir, keep);
    },
  },
  restore: {
    usage: "<dir> [--set ID] [--schema ad] [--statement-timeout-ms N]",
    summary: "Yedekten (yedek kökü ya da export klasörü) schema'yı kurar; hedef schema yok ya da boş olmalı, eski yedekte bekleyen migration'lar uygulanır",
    flags: ["--set", ...TIMEOUT_FLAG, ...SCHEMA_FLAGS],
    cancellable: true,
    run: async ({ app, options }, dir) => (await backup()).restoreSchema(app, dir, { set: options.set, signal: options.signal, report: options.report }),
  },
  "auth generate": {
    usage: "<optionsModule> [--name better_auth]",
    summary: "Better Auth seçeneklerinden migration (fark yoksa dosya yazmaz; fark geçici bir schema'da hesaplanır)",
    flags: ["--name"],
    cancellable: true,
    run: async ({ app, options }, module) => {
      const { generateAuthMigration } = await import("./tools/auth");
      const { resolve } = await import("node:path");
      const authOptions = (await import(resolve(module))).default;
      if (!authOptions) throw usage("The options module must export the Better Auth options as its default export");
      return generateAuthMigration({ db: app, options: authOptions, name: options.name, signal: options.signal });
    },
  },
  "neon stage-copy": {
    usage: "[--org ID]",
    summary: "Neon: kaynak branch'ten migrasyon denemesi için branch açar (branch id ve host yazılır, şifreli URI yazılmaz)",
    flags: ["--org"],
    run: async ({ app, options }) => (await neon()).stageCopy(app, await askNeonApi(options.signal), { org: options.org }),
  },
  "neon export": {
    usage: "<dir> --at ZAMAN [--org ID] [--schema ad]",
    summary: "Neon: schema'nın geçmiş anını export klasörüne yazar (canlı veriye dokunmaz; uygulamak için restore)",
    flags: ["--at", "--org", ...SCHEMA_FLAGS],
    cancellable: true,
    run: async ({ app, options }, dir) => {
      const tools = await neon();
      const at = tools.parsePastTimestamp(options.at, new Date());
      await (await backup()).assertFree(dir); // anahtar sorulmadan: dolu hedef için branch açılmaz
      return tools.exportAt(app, await askNeonApi(options.signal), { dir, at, org: options.org, signal: options.signal });
    },
  },
  replicas: {
    usage: "",
    summary: "DATABASE_REPLICA_URLS'teki replica'ların durumu ve lag'i (düşük ya da eşiği aşan replica varsa çıkış kodu 1)",
    run: async ({ app }) => {
      const result = await (await import("./tools/replicas")).replicaReport(app);
      if (!result.ok) process.exitCode = 1;
      return result;
    },
  },
  doctor: {
    usage: "[--pgbouncer-url] [--pooled-url] [--schema ad]",
    summary: "Bağlantı, timeout'lar, schema ve migration durumunu salt okunur denetler (--pgbouncer-url: konsol URL'sini, --pooled-url: runtime URL'sini gizli girişle sorar; başarısız denetimde çıkış kodu 1)",
    flags: ["--pgbouncer-url", "--pooled-url", ...SCHEMA_FLAGS],
    run: async ({ app, options }) => {
      const pgbouncerUrl = options.pgbouncerUrl ? await askUrl(PGBOUNCER_URL_QUESTION, "PgBouncer admin URL") : undefined;
      const pooledUrl = options.pooledUrl ? await askUrl(POOLED_URL_QUESTION, "Runtime URL") : undefined;
      const result = await (await import("./tools/doctor")).doctor(app, { pgbouncerUrl, pooledUrl });
      if (!result.ok) process.exitCode = 1;
      return result;
    },
  },
};

/** Belgelenen komut adları (belge denetimi ve test için). */
export const commandNames = () => Object.keys(commands);

/** Kısa satırlarda özet 40. sütunda; uzun satırlarda bir alt satırda aynı sütunda. */
const helpLine = ([name, command]: [string, Command]) => {
  const line = `${name} ${command.usage}`.trim();
  return line.length < 40 ? `  ${line.padEnd(40)}${command.summary}` : `  ${line}\n  ${" ".repeat(40)}${command.summary}`;
};

const help = `Tek veritabanı yönetim aracı

Kullanım:
  bun run cli <komut> [argümanlar] [seçenekler] [--driver=bun|postgres|pg]

Komutlar:
${Object.entries(commands).map(helpLine).join("\n")}

Seçenek değeri --ad değer veya --ad=değer biçiminde verilir. Hedef schema --schema ile verilir (varsayılan public).
Ortam: DATABASE_URLS (zorunlu; bu pakette tek URL; doğrudan veya session pooling bağlantısı).
Sürücü: --driver (varsayılan bun). Ayrıntılı kurulum için README'ye bakın.`;

const camelCase = (name: string) => name.replace(/-([a-z])/g, (_, letter: string) => letter.toUpperCase());

/** Değerli seçeneğin değerini türüne göre çözer: sınırlı tamsayı ya da metin. */
function optionValue(flag: string, value: string): unknown {
  const range = INTEGER_FLAGS[flag];
  return range === undefined ? value : boundedInteger(value, flag.slice(2), range[1], range[0]);
}

/** `--seçenek değer` veya `--seçenek=değer`; kabul edilmeyen, tekrarlanan veya değersiz seçenek `USAGE`. */
export function parseOptions(args: readonly string[], allowed: readonly string[] = []): Options {
  const options: Record<string, unknown> = {};
  const seen = new Set<string>();
  for (let i = 0; i < args.length; i++) {
    const [flag = "", inline] = (args[i] ?? "").split(/=(.*)/s);
    // Argüman metni gizli olabilir (parolalı URL): yalnızca seçenek adı biçimindeki metin yazdırılır.
    if (!allowed.includes(flag))
      throw usage(/^--[a-z][a-z0-9-]*$/.test(flag) ? `Unknown option: ${flag}` : "Unexpected argument: values are given as --option value, and URL options ask for the value with hidden input");
    const repeatable = REPEATABLE_FLAGS.includes(flag);
    if (seen.has(flag) && !repeatable) throw usage(`Repeated option: ${flag}`);
    seen.add(flag);
    const key = camelCase(flag.slice(2));
    if (BOOLEAN_FLAGS.includes(flag)) {
      if (inline !== undefined) throw usage(`${flag} takes no value`);
      options[key] = true;
      continue;
    }
    const value = inline ?? args[++i];
    if (!value || value.startsWith("--")) throw usage(`${flag} needs a value`);
    options[key] = repeatable ? [...((options[key] as string[] | undefined) ?? []), ...commaList(value)] : optionValue(flag, value);
  }
  return options;
}

/** `--driver=` argümanlarını ayırır; geri kalanlar komut ve seçeneklerdir. */
function takeDriverFlag(argv: readonly string[]) {
  const isDriverFlag = (arg: string) => arg.startsWith(DRIVER_FLAG);
  return {
    driverNames: argv.filter(isDriverFlag).map((arg) => arg.slice(DRIVER_FLAG.length)),
    args: argv.filter((arg) => !isDriverFlag(arg)),
  };
}

function selectDriver(driverNames: readonly string[]) {
  const driver = drivers[driverNames.at(-1) ?? "bun"];
  if (driverNames.length > 1 || !driver) throw usage("--driver must be one of: bun, postgres, pg");
  return driver;
}

/** İki kelimelik komutlar (`migration create`) tek kelimelilerden önce eşleşir. */
function resolveCommand(args: readonly string[]) {
  const words = Object.hasOwn(commands, args.slice(0, 2).join(" ")) ? 2 : 1;
  const name = args.slice(0, words).join(" ");
  const command = Object.hasOwn(commands, name) ? commands[name] : undefined;
  return { name, command, rest: args.slice(words) };
}

const requiredCount = (command: Pick<Command, "usage">) => command.usage.split("<").length - 1;

/** Konum argümanları seçeneklerden önce ya da sonra gelebilir (script'ler seçeneği önce yazar: `migration create --x ad`).
 * Kabul edilen değerli seçeneğin (`--ad değer`) sonraki argümanı değeridir. En çok zorunlu + isteğe bağlı sayıda konum argümanı
 * alınır; fazlası seçenek listesine düşer ve `USAGE` verir. `[x]` isteğe bağlı konum argümanıdır, `[--x]` sayılmaz. */
export function splitArguments(command: Pick<Command, "usage" | "flags">, rest: readonly string[]) {
  const max = requiredCount(command) + (command.usage.match(/\[(?!-)/g)?.length ?? 0);
  const positional: string[] = [];
  const options: string[] = [];
  for (let i = 0; i < rest.length; i++) {
    const arg = rest[i] ?? "";
    const next = rest[i + 1];
    if (arg.startsWith("--")) {
      options.push(arg);
      const takesValue = !arg.includes("=") && !BOOLEAN_FLAGS.includes(arg) && (command.flags ?? []).includes(arg);
      if (takesValue && next !== undefined && !next.startsWith("--")) options.push(rest[++i] ?? "");
    } else if (positional.length < max) positional.push(arg);
    else options.push(arg);
  }
  return { positional, options };
}

const CANCEL_SIGNALS = ["SIGINT", "SIGTERM"] as const;

/** İptal edilebilir komutlarda SIGINT/SIGTERM `stop` çağırır. */
function onCancelSignals(command: Command, stop: () => void) {
  if (command.cancellable) for (const signal of CANCEL_SIGNALS) process.once(signal, stop);
}

const wantsHelp = (name: string, command: Command | undefined, rest: readonly string[]) =>
  ["", "help", ...HELP_FLAGS].includes(name) || (command !== undefined && rest.some((arg) => HELP_FLAGS.includes(arg)));

export async function main(argv = process.argv.slice(2)) {
  const { driverNames, args } = takeDriverFlag(argv);
  const { name, command, rest } = resolveCommand(args);
  if (wantsHelp(name, command, rest)) return console.log(help);
  if (!command) {
    // Komut adı yankılanmaz: yanlış yere yazılmış bir URL parolasını sızdırırdı.
    console.error(`Unknown command\n\n${help}`);
    process.exitCode = 1;
    return;
  }
  const cancellation = new AbortController();
  const stop = () => cancellation.abort();
  let app: Management | undefined;
  try {
    const driver = selectDriver(driverNames);
    const split = splitArguments(command, rest);
    const options = parseOptions(split.options, command.flags ?? []);
    // Hedef schema DB'ye ve ortama bakmadan doğrulanır.
    if (options.schema !== undefined) validateSchema(options.schema);
    const positional = split.positional;
    if (positional.length < requiredCount(command)) throw usage(`Usage: ${name} ${command.usage}`.trim());
    onCancelSignals(command, stop);
    if (command.local) return print(await command.local({ ...options, signal: cancellation.signal }, ...positional));
    const [api, { loadConfig }] = await Promise.all([import("../management"), import("./config")]);
    app = api.createManagement(loadConfig(), { driver: await driver(), schema: options.schema, migrationStatementTimeoutMs: options.statementTimeoutMs });
    print(await command.run?.({ api, app, options: { ...options, signal: cancellation.signal, report: print } }, ...positional));
  } catch (error) {
    // Sürücü hataları kimlik bilgisi içerebilir: yalnızca AppError mesajları yazdırılır.
    const message = error instanceof AppError ? error.message : "Operation failed; inspect PostgreSQL availability";
    console.error(JSON.stringify({ error: errorCode(error), message }));
    process.exitCode = 1;
  } finally {
    for (const signal of CANCEL_SIGNALS) process.removeListener(signal, stop);
    if (cancellation.signal.aborted) process.exitCode = 1;
    await app?.close().catch(() => {});
  }
}

if (import.meta.main) await main();
