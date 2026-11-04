/** Neon serverless sürücüsü (isteğe bağlı peer `@neondatabase/serverless`): WebSocket `Pool`, pg uyumlu; Workers/edge runtime'ı içindir.
 * Yalnızca runtime: yönetim (advisory lock) pg/postgres/bun sürücüsü ve doğrudan URL ister. `cancel` tanımlı değildir: Neon istemcisinin
 * iptali yeni bir TCP bağlantısı açar, Workers'ta TCP yok. Deadline sonrası bağlantı atılır, sunucu deyimi `client_connection_check_interval`
 * ile keser (Bun SQL ile aynı sözleşme). WebSocket'ler tek isteği aşamaz: `Pool` istek içinde açılıp kapatılır (`poolMax: 1`). */
import { Pool, types } from "@neondatabase/serverless";
import { createPgDriver, type PgModule } from "../pg-pool";

export const neonDriver = createPgDriver({ Pool, types } as unknown as PgModule);
