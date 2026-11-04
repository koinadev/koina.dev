/** Neon API ile branch araçları: `migrate` öncesi güvenlik noktası, migrasyon denemesi için staging kopyası ve geçmiş anın export'u.
 * Yalnızca `fetch` kullanır; API anahtarı ve şifreli bağlantı URI'si bellekte tutulur, hiçbir çıktıya veya hata mesajına girmez.
 * Branch'ler asla silinmez. */
import { setTimeout as sleep } from "node:timers/promises";
import { createConfig } from "../config";
import { AppError, errorCode } from "../errors";
import type { Management } from "../management";
import { assertFree, type exportSchema } from "./backup";

const BASE_URL = "https://console.neon.tech/api/v2";
const MAX_MESSAGE_CHARS = 300;
const PROJECT_PAGE_SIZE = 100;
/** Hep imleç dönen API'de proje listesi sonsuz dönmez. */
const MAX_PROJECT_PAGES = 100;
/** Tek bir API isteğinin üst süresi: asılı kalan sunucu CLI'yi sonsuza dek bekletmez. */
const REQUEST_TIMEOUT_MS = 30_000;

type Fetch = (input: URL, init?: RequestInit) => Promise<Response>;

export interface NeonApi {
  /** İptal sinyali: istekleri ve operasyon beklemesini keser. */
  signal?: AbortSignal;
  request<T>(method: "GET" | "POST", path: string, options?: { query?: Record<string, string>; body?: unknown }): Promise<T>;
}

/** Neon API v2 istemcisi; hata mesajları anahtarı içermez. Her istek `timeoutMs` ile sınırlıdır ve `signal` ile iptal edilir. */
export function neonApi(
  apiKey: string,
  { fetch: send = fetch, baseUrl = BASE_URL, signal, timeoutMs = REQUEST_TIMEOUT_MS }: { fetch?: Fetch; baseUrl?: string; signal?: AbortSignal; timeoutMs?: number } = {},
): NeonApi {
  if (!apiKey) throw new AppError("USAGE", "Neon API key was not entered");
  const hide = (text: string) => text.split(apiKey).join("[hidden]");
  return {
    signal,
    async request<T>(method: "GET" | "POST", path: string, { query, body }: { query?: Record<string, string>; body?: unknown } = {}) {
      const url = new URL(`${baseUrl}${path}`);
      for (const [key, value] of Object.entries(query ?? {})) url.searchParams.set(key, value);
      const limit = AbortSignal.any([AbortSignal.timeout(timeoutMs), ...(signal ? [signal] : [])]);
      let response: Response;
      let text: string;
      try {
        response = await send(url, {
          signal: limit,
          method,
          headers: { Authorization: `Bearer ${apiKey}`, Accept: "application/json", ...(body === undefined ? {} : { "Content-Type": "application/json" }) },
          body: body === undefined ? undefined : JSON.stringify(body),
        });
        text = await response.text();
      } catch {
        const reason = signal?.aborted ? "was cancelled" : limit.aborted ? `timed out after ${timeoutMs} ms` : "could not be reached";
        throw new AppError("PROVIDER_API_ERROR", `Neon API ${method} ${path} ${reason}`);
      }
      if (!response.ok) {
        let message = "";
        try {
          message = String((JSON.parse(text) as { message?: unknown }).message ?? "");
        } catch {
          // Gövde JSON değil: yalnızca durum kodu yazılır.
        }
        throw new AppError("PROVIDER_API_ERROR", hide(`Neon API ${method} ${path} failed with ${response.status}${message ? `: ${message}` : ""}`).slice(0, MAX_MESSAGE_CHARS));
      }
      try {
        return (text ? JSON.parse(text) : {}) as T;
      } catch {
        throw new AppError("PROVIDER_API_ERROR", `Neon API ${method} ${path} returned a malformed response`);
      }
    },
  };
}

export interface NeonNode {
  projectId: string;
  branchId: string;
  endpointId: string;
  host: string;
  database: string;
  role: string;
}
interface EndpointRef {
  projectId: string;
  branchId: string;
  endpointId: string;
  host: string;
}

/** `-pooler` son eki doğrudan host'a çevrilir: API endpoint'in doğrudan host'unu listeler. */
const directHost = (host: string) => host.toLowerCase().replace(/-pooler(?=\.)/, "");

/** Beklenen alanı olmayan yanıt (TypeError): ham metin mesaja girmez. */
const unexpected = () => new AppError("PROVIDER_API_ERROR", "Neon API returned an unexpected response");

/** Hesaptaki bütün projelerin endpoint'leri (en çok `MAX_PROJECT_PAGES` sayfa). */
async function listEndpoints(api: NeonApi, org: string | undefined, pageSize: number): Promise<EndpointRef[]> {
  const found: EndpointRef[] = [];
  let cursor: string | undefined;
  for (let pages = 0; pages < MAX_PROJECT_PAGES; pages++) {
    const page = await api.request<{ projects: { id: string }[]; pagination?: { cursor?: string } }>("GET", "/projects", {
      query: { limit: String(pageSize), ...(cursor ? { cursor } : {}), ...(org ? { org_id: org } : {}) },
    });
    for (const { id } of page.projects) {
      const { endpoints } = await api.request<{ endpoints: { id: string; host: string; branch_id: string }[] }>("GET", `/projects/${id}/endpoints`);
      for (const endpoint of endpoints) found.push({ projectId: id, branchId: endpoint.branch_id, endpointId: endpoint.id, host: endpoint.host });
    }
    cursor = page.projects.length === pageSize ? page.pagination?.cursor : undefined;
    if (!cursor) return found;
  }
  throw new AppError("PROVIDER_API_ERROR", `Neon API listed more than ${MAX_PROJECT_PAGES} pages of projects; use --org`);
}

/** `DATABASE_URLS`'in host'unu hesaptaki endpoint'lerle eşleştirir; proje kimliği env gerektirmez. Eşleşme yoksa mesaj URL ya da host içermez. */
export async function resolveNode(api: NeonApi, url: string, { org, pageSize = PROJECT_PAGE_SIZE }: { org?: string; pageSize?: number } = {}): Promise<NeonNode> {
  const parsed = URL.parse(url);
  const endpoint =
    parsed &&
    (await listEndpoints(api, org, pageSize)
      .then((listed) => listed.find((candidate) => directHost(candidate.host) === directHost(parsed.hostname)))
      .catch((error: unknown) => {
        throw error instanceof AppError ? error : unexpected();
      }));
  if (!parsed || !endpoint)
    throw new AppError("PROVIDER_NODE_NOT_FOUND", "No Neon endpoint matches DATABASE_URLS; check that the API key belongs to the account that owns it (use --org for an organization)");
  return { ...endpoint, database: decodeURIComponent(parsed.pathname.slice(1)), role: decodeURIComponent(parsed.username) };
}

export interface NeonToolOptions {
  org?: string;
  now?: Date;
  pageSize?: number;
  /** Operasyon yoklama aralığı ve toplam süre (ms); testler `sleep` verir. */
  pollMs?: number;
  timeoutMs?: number;
  sleep?: (ms: number) => Promise<void>;
}

const OPERATION_POLL_MS = 1000;
const OPERATION_TIMEOUT_MS = 120_000;
const FAILED_OPERATION = new Set(["failed", "error", "cancelled", "skipped"]);
/** İptal sinyali beklemeyi hemen keser. */
const wait = (ms: number, signal?: AbortSignal) =>
  sleep(ms, undefined, { signal }).catch(() => {
    throw new AppError("PROVIDER_API_ERROR", "Neon operation wait was cancelled");
  });

/** `20261003T101500Z`: branch adlarında saniye çözünürlüklü, sıralanabilir zaman. */
const stamp = (now: Date) => now.toISOString().replace(/\.\d{3}Z$/, "Z").replace(/[-:]/g, "");

/** Operasyonlar bitene kadar yoklar; başarısız durum veya süre aşımı hata verir. */
async function waitForOperations(api: NeonApi, projectId: string, operations: readonly { id: string }[], { pollMs = OPERATION_POLL_MS, timeoutMs = OPERATION_TIMEOUT_MS, sleep = (ms) => wait(ms, api.signal) }: NeonToolOptions) {
  const started = Date.now();
  for (const { id } of operations)
    for (;;) {
      const { operation } = await api.request<{ operation: { action: string; status: string; error?: string | null } }>("GET", `/projects/${projectId}/operations/${id}`);
      if (operation.status === "finished") break;
      if (FAILED_OPERATION.has(operation.status))
        throw new AppError("PROVIDER_API_ERROR", `Neon operation ${operation.action} ended as ${operation.status}${operation.error ? `: ${operation.error}` : ""}`.slice(0, MAX_MESSAGE_CHARS));
      if (Date.now() - started >= timeoutMs) throw new AppError("PROVIDER_API_ERROR", `Neon operation ${operation.action} did not finish within ${timeoutMs} ms`);
      await sleep(pollMs);
    }
}

export interface BranchRun {
  projectId: string;
  sourceBranchId: string;
  branchId: string;
  endpointId: string;
  name: string;
  host: string;
}

/** Açılmış ve silinmeyen branch'in adı: kullanıcı konsoldan silebilsin. */
const leftBehind = (run: BranchRun) => `Branch created before the failure (not deleted): ${run.name} (project ${run.projectId}, branch ${run.branchId})`;

/** `DATABASE_URLS` endpoint'inin branch'inden bir branch açar (`timestamp` verilirse o andan) ve operasyonların bitmesini bekler. Açıldıktan sonraki hata
 * branch'i adıyla bildirir; branch asla silinmez. */
export async function branchNode(api: NeonApi, node: NeonNode, options: NeonToolOptions & { prefix: string; timestamp?: string }): Promise<BranchRun> {
  const { prefix, timestamp, now = new Date() } = options;
  const name = `${prefix}-${stamp(now)}`;
  let run: BranchRun | undefined;
  try {
    const response = await api.request<{ branch: { id: string }; endpoints: { id: string; host: string }[]; operations: { id: string }[] }>("POST", `/projects/${node.projectId}/branches`, {
      body: { branch: { name, parent_id: node.branchId, ...(timestamp ? { parent_timestamp: timestamp } : {}) }, endpoints: [{ type: "read_write" }] },
    });
    const endpoint = response.endpoints[0];
    run = { projectId: node.projectId, sourceBranchId: node.branchId, branchId: response.branch.id, endpointId: endpoint?.id ?? "", name, host: endpoint?.host ?? "" };
    if (!endpoint) throw new AppError("PROVIDER_API_ERROR", "Neon created the branch without a compute endpoint");
    await waitForOperations(api, node.projectId, response.operations, options);
    return run;
  } catch (error) {
    if (!run && error instanceof AppError) throw error;
    // Bozuk yanıtta branch açılmış olabilir: istenen adıyla söylenir. Ham hata metni (TypeError) mesaja girmez.
    const reason = error instanceof AppError ? error.message : unexpected().message;
    throw new AppError("PROVIDER_API_ERROR", `${reason}. ${run ? leftBehind(run) : `The branch may have been created (not deleted): ${name}`}`);
  }
}

type Configured = { config: { url: string } };
const branchTool = (prefix: string) => async (m: Configured, api: NeonApi, options: NeonToolOptions = {}) => ({
  provider: "neon" as const,
  branch: await branchNode(api, await resolveNode(api, m.config.url, options), { ...options, prefix }),
});

/** `migrate` öncesi: kaynak branch'in o anki başlangıcından `pre-migrate-<zaman>` branch'i. */
export const safetyPoint = branchTool("pre-migrate");
/** Migrasyon denemesi için `stage-<zaman>` branch'i; yalnızca branch id'si ve host döner, şifreli URI hiç alınmaz. */
export const stageCopy = branchTool("stage");

const usage = (message: string) => new AppError("USAGE", message);

const RFC3339 = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;

/** Tarih ve saat alanları gerçek bir takvim anını göstermeli (`2026-02-30` ertesi aya kaymaz). */
const realTime = ([year, month, day, hour, minute, second]: number[]) => {
  const date = new Date(Date.UTC(year as number, (month as number) - 1, day as number));
  return date.getUTCMonth() === (month as number) - 1 && date.getUTCDate() === day && (hour as number) < 24 && (minute as number) < 60 && (second as number) < 60;
};

/** `--at`: RFC 3339 (saat dilimi zorunlu: yerel saate sessizce çevrilmez) ve geçmişte olmalı; Neon'a gitmeden doğrulanır. Çıktı UTC ISO'dur. */
export function parsePastTimestamp(value: string | undefined, now: Date): string {
  if (!value) throw usage("--at <RFC 3339 time> is required");
  const text = value.toUpperCase();
  const match = RFC3339.exec(text);
  const time = Date.parse(text);
  if (!match || Number.isNaN(time) || !realTime(match.slice(1, 7).map(Number))) throw usage("--at must be an RFC 3339 time with a UTC offset, such as 2026-10-03T09:30:00Z");
  if (time >= now.getTime()) throw usage("--at must be in the past");
  return new Date(time).toISOString();
}

export function safetyPointProvider(value: string | undefined): "neon" | "supabase" | undefined {
  if (value === undefined) return undefined;
  if (value === "neon" || value === "supabase") return value;
  throw usage("--safety-point must be neon or supabase");
}

/** Supabase: yalnızca PITR saniyesi kaydedilir ve geri yükleme isteği yazdırılır; API çağrısı yapılmaz, anahtar istenmez. */
export function supabaseSafetyPoint(now = new Date()) {
  const recoveryTimeTargetUnix = Math.floor(now.getTime() / 1000);
  return {
    provider: "supabase" as const,
    recoveryTimeTargetUnix,
    restore: { method: "POST", url: "https://api.supabase.com/v1/projects/{ref}/database/backups/restore-pitr", body: { recovery_time_target_unix: recoveryTimeTargetUnix } },
    note: "No API call was made. Supabase PITR is a paid add-on (Pro, Team or Enterprise); without it this time is not a restore point. PITR restores the whole project in place.",
  };
}

/** Branch'in şifreli bağlantı URI'si; yalnızca bellekte kullanılır. */
export async function branchUrl(api: NeonApi, run: BranchRun, node: NeonNode): Promise<string> {
  const { uri } = await api.request<{ uri: string }>("GET", `/projects/${run.projectId}/connection_uri`, {
    query: { database_name: node.database, role_name: node.role, branch_id: run.branchId, endpoint_id: run.endpointId },
  });
  const url = URL.parse(uri);
  if (!url || !["postgres:", "postgresql:"].includes(url.protocol)) throw new AppError("PROVIDER_API_ERROR", "Neon returned an invalid connection URI");
  return uri;
}

export interface ExportDeps {
  manage(config: ReturnType<typeof createConfig>): Management;
  export: typeof exportSchema;
}

const defaultDeps = async (m: Management): Promise<ExportDeps> => {
  const [{ createManagement }, { exportSchema: exportOne }] = await Promise.all([import("../management"), import("./backup")]);
  return { manage: (config) => createManagement(config, { driver: m.driver, schema: m.schema }), export: exportOne };
};

/** Schema'nın `at` anındaki halini `dir`'e export eder: kaynak branch'ten o ana geçici branch açılır, bağlantı bilgileriyle geçici bir `Management`
 * kurulur ve mevcut `exportSchema` çalışır. Canlı veriye yazılmaz, branch silinmez; uygulamak `restore` iledir. */
export async function exportAt(
  m: Management,
  api: NeonApi,
  { dir, at, signal, ...options }: NeonToolOptions & { dir: string; at: string; signal?: AbortSignal },
  deps?: ExportDeps,
) {
  // Hedef doluysa hiçbir şey açılmaz: silinmeyen branch her denemede faturalanırdı.
  await assertFree(dir);
  const node = await resolveNode(api, m.config.url, options);
  const branch = await branchNode(api, node, { ...options, prefix: "pitr", timestamp: at });
  try {
    const url = await branchUrl(api, branch, node);
    const { manage, export: exportPast } = deps ?? (await defaultDeps(m));
    const past = manage(createConfig(url));
    try {
      const exported = await exportPast(past, dir, { signal });
      return { ...exported, at, branch, note: "The temporary branch was not deleted. Apply the export with `restore <dir>` (the target schema must be empty)." };
    } finally {
      await past.close().catch(() => {});
    }
  } catch (error) {
    // Branch açıldı ve silinmez: adıyla söyle. Sürücü hatalarının metni (host, kullanıcı, parola) mesaja girmez.
    const reason = error instanceof AppError ? error.message : `Neon export failed (${errorCode(error)})`;
    throw new AppError(errorCode(error), `${reason}. ${leftBehind(branch)}`);
  }
}
