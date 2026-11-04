/** Bun SQL sürücüsü (ek bağımlılık yok; yalnızca Bun). COPY desteklemez; yedek/geri yükleme veriyi toplu JSON ile taşır. Bun'ın
 * `query.cancel()`'ı çalışan deyimi durdurmaz (denendi: deyim commit eder), bu yüzden `cancel` yoktur; deadline'ı dolan bağlantı atılır. */
import { SQL } from "bun";
import { type Connection, type Driver, normalizeParams, withTimeout } from "../driver";

function connection(sql: Pick<SQL, "unsafe">): Connection {
  return {
    // Sonuç dizisi kopyalanmaz: Bun'ın dizisi `count` taşır ve türettiği diziler (`map`, `filter`) düz `Array`'dir.
    query: async (text, values) => await sql.unsafe(text, normalizeParams(values)),
    exec: async (text) => {
      await sql.unsafe(text).simple();
    },
  };
}

export const bunDriver: Driver = (url, options) => {
  const sql = new SQL({
    url,
    max: options.max,
    prepare: false,
    idleTimeout: options.idleTimeoutSeconds,
    maxLifetime: options.maxLifetimeSeconds,
    connectionTimeout: options.connectTimeoutSeconds,
    onclose: () => options.onClose?.(),
  });
  return {
    ...connection(sql),
    async reserve() {
      const reserved = await sql.reserve();
      return {
        ...connection(reserved),
        // Bun kapanmış bağlantıyı bırakırken (senkron ya da asenkron) reddeder; bağlantı her durumda atılır. `discard` bağlantıyı kapatır.
        release: (discard) => void Promise.resolve().then(() => (discard ? reserved.close({ timeout: 0 }) : reserved.release())).catch(() => {}),
      };
    },
    close: (ms) => withTimeout(sql.close({ timeout: ms / 1000 }), ms + 100),
  };
};
