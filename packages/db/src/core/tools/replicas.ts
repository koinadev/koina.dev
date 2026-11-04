/** `replicas` komutu: DATABASE_REPLICA_URLS'teki her replica'nın durumu (sağlık, lag, kullanılabilirlik). Kısa ömürlü bir runtime `Db` açar ve
 * kapatır; yönetim havuzuna dokunmaz. Çıktıda URL yoktur (replica config sırasıyla 1 tabanlı numaralanır). */
import type { Management } from "../management";
import { createDb } from "../runtime";

export async function replicaReport(m: Management) {
  const db = createDb(m.config, { driver: m.driver, poolMax: 2, pooler: "assumed", replicaMaxLagMs: m.config.replicaMaxLagMs });
  try {
    const replicas = await db.replicas();
    return { ok: replicas.every((replica) => replica.usable), maxLagMs: m.config.replicaMaxLagMs, replicas };
  } finally {
    await db.close();
  }
}
