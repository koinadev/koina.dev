/** node-postgres sürücüsü (isteğe bağlı peer `pg`); Node, Bun ve Cloudflare Workers (`nodejs_compat`) ile çalışır. Mantık
 * `core/pg-pool.ts` fabrikasındadır; yalnızca sunucuda iptal burada tanımlıdır. */
import pg from "pg";
import { createPgDriver, type PgModule } from "../pg-pool";

export const pgDriver = createPgDriver(pg as unknown as PgModule, {
  // `Client#cancel` ayrı bir bağlantıdan CancelRequest gönderir; çalışan sorgu 57014 ile döner.
  cancel: (client, url) => {
    const active = (client as unknown as { _activeQuery?: unknown })._activeQuery;
    if (!active) return;
    const canceller = new pg.Client({ connectionString: url }) as unknown as { connection: { on(event: string, listener: () => void): void }; cancel(client: unknown, query: unknown): void };
    canceller.connection.on("error", () => {});
    canceller.cancel(client, active);
  },
});
