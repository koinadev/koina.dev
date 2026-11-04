/** Runtime URL'sinin bir transaction-mode pooler'a (PgBouncer, Supavisor, Neon pooler, Hyperdrive) gittiğinin kanıtı. Pooler adı
 * SQL'den güvenilir okunmaz; bu yüzden davranışa bakılır: iki ayrı istemci ardışık deyimlerde aynı sunucu oturumunu görürse
 * (`pg_backend_pid`) pooler kesindir, çünkü doğrudan bağlantıda iki istemci aynı backend'i göremez. Hiç görülmemesi "doğrudan"
 * ya da "çok yoğun / dairesel dağıtan pooler" demektir (yanlış negatif mümkündür; `pooler: "assumed"` açık kaçıştır).
 * Advisory lock kullanılmaz: transaction modunda kilit sunucu bağlantısında sızabilir. */
import { deadlineExceeded } from "./database";
import type { Connection, Driver } from "./driver";

const PROBE_ROUNDS = 10;

const backendPid = async (db: Connection) => Number((await db.query<{ pid: number }>("SELECT pg_backend_pid() AS pid"))[0]?.pid);

/** `true`: aynı sunucu oturumu iki ayrı bağlantıda görüldü. `false`: `rounds` turda görülmedi. Bütün sınama `deadlineMs` ile
 * sınırlıdır (`DATABASE_TIMEOUT`); bağlantı hataları olduğu gibi iletilir. Sınama kendi geçici havuzunu (`max: 2`) açar ve kapatır:
 * `poolMax: 1` (Workers) ve çalışan havuz etkilenmez. */
export async function usesTransactionPooler(
  driver: Driver,
  url: string,
  { deadlineMs, rounds = PROBE_ROUNDS }: { deadlineMs: number; rounds?: number },
): Promise<boolean> {
  const pool = driver(url, { max: 2, idleTimeoutSeconds: 1, maxLifetimeSeconds: 0, connectTimeoutSeconds: 10 });
  let timer: ReturnType<typeof setTimeout> | undefined;
  const expired = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(deadlineExceeded()), deadlineMs);
  });
  const probe = async () => {
    for (let round = 0; round < rounds; round++) {
      const first = await pool.reserve();
      const second = await pool.reserve().catch((error: unknown) => {
        first.release();
        throw error;
      });
      try {
        if ((await backendPid(first)) === (await backendPid(second))) return true;
      } finally {
        first.release();
        second.release();
      }
    }
    return false;
  };
  const work = probe();
  // Süre dolunca havuz kapanır ve yarım kalan sınama reddedilir; kimse beklemediği için işlenmemiş reddedilme olmamalı.
  work.catch(() => {});
  try {
    return await Promise.race([work, expired]);
  } finally {
    clearTimeout(timer);
    await pool.close(1000);
  }
}
