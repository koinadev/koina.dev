/** Runtime: derlenmiş SQL parçalarını markalar ve schema'ya bağlar. Parser yüklemez. */
import { validateSchema } from "../identifier";

export interface PreparedQuery {
  readonly requiresTransaction: boolean;
  /** Yalnızca okuyan sorgu (kilitsiz SELECT, veri değiştiren CTE yok): okuma bağlamı (replica) yalnızca bunları çalıştırır. */
  readonly readOnly: boolean;
  readonly bind: (schema: string) => string;
}
/** `defineQuery` ile markalanmış sorgular. */
const preparedQueries = new WeakSet<object>();

/** Derlenmiş parçaları doğrulanmış schema adıyla birleştirir. */
export const bindParts = (parts: readonly string[], schema: string) => parts.join(`"${validateSchema(schema)}"`);

/** Yalnızca derleyici çıktısı çağırabilir; `codegen --check` diğer çağıranları reddeder. */
export function defineQuery(parts: readonly string[], requiresTransaction: boolean, readOnly: boolean): PreparedQuery {
  const frozen = Object.freeze([...parts]);
  // Bir `Db` tek schema kullanır: son doğrulanmış schema'nın metni saklanır, sıcak yolda birleştirme ve regex yapılmaz.
  let lastSchema: string | undefined;
  let lastText = "";
  const bind = (schema: string) => {
    if (schema !== lastSchema) {
      lastText = bindParts(frozen, schema);
      lastSchema = schema;
    }
    return lastText;
  };
  const query = Object.freeze({ requiresTransaction, readOnly, bind });
  preparedQueries.add(query);
  return query;
}

export const isPreparedQuery = (value: unknown): value is PreparedQuery => typeof value === "object" && value !== null && preparedQueries.has(value);
