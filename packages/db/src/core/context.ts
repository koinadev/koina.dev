/** Hazırlanmış SQL'i schema'ya bağlar ve query, transaction ve context ömrünü yönetir. */
import type { ReplicaPolicy } from "./config";
import type { Database, Pools } from "./database";
import type { Connection, Row } from "./driver";
import { AppError, databaseUnavailable } from "./errors";
import type { ReplicaHandle, ReplicaRouter } from "./replicas";
import { isPreparedQuery, type PreparedQuery } from "./sql/query";

export interface Queryable {
  query<R extends unknown[] = Row[]>(query: PreparedQuery, values?: readonly unknown[]): Promise<R>;
  transaction<T>(work: (db: Queryable) => Promise<T>): Promise<T>;
}

/** Replica'dan okuma bağlamı: yalnızca `readOnly` sorgular; transaction yoktur. */
export type ReadContext = Pick<Queryable, "query">;
/** `readOnly`: okuma bağlamı (hata autocommit gibi toparlanabilir, yazan sorgu reddedilir). `onWrite`: `readOnly` olmayan sorgu
 * çalıştığında (transaction içindekiler dahil) çağrılır; istek kapsamı yazıdan sonra okumayı primary'ye yöneltmek için kullanır. */
export interface ContextMode {
  readOnly?: boolean;
  onWrite?: () => void;
}

/** İstek kapsamının okuma oturumu: kapsam içindeki okumalar ilk okumanın seçtiği replica'ya sabitlenir (çağrılar arası monoton okuma);
 * replica bağlantı hatasıyla düşerse sabitleme kalkar ve sonraki okuma yeniden seçer. */
export interface ReadSession {
  handle?: ReplicaHandle;
}

/** `transactionDatabase` yoksa `connection` zaten bir transaction'dır (iç içe transaction reddedilir); seed'ler de bunu kullanır. */
export async function runContext<T>(
  connection: Connection,
  transactionDatabase: Database | undefined,
  schema: string,
  work: (db: Queryable) => Promise<T>,
  mode: ContextMode = {},
) {
  const insideTransaction = !transactionDatabase && !mode.readOnly;
  let isOpen = true;
  let failure: { error: unknown } | undefined;
  // Bitmemiş sorgular; ilk sorguda açılır. Tepki sorgu çözülünce çağıranın devamından önce çalışır, beklenen sorgu kümede kalmaz.
  let running: Set<Promise<unknown>> | undefined;

  function track<R>(operation: Promise<R>): Promise<R> {
    const pending = (running ??= new Set());
    pending.add(operation);
    operation.then(
      () => void pending.delete(operation),
      (error: unknown) => {
        // Transaction içinde yakalanmış hata da transaction'ı düşürür; autocommit'te çağıran toparlanabilir.
        if (insideTransaction) failure = { error };
        pending.delete(operation);
      },
    );
    return operation;
  }

  function assertOpen() {
    if (!isOpen) throw new AppError("TRANSACTION_CLOSED", "Database context is closed");
  }

  function assertRunnable(query: PreparedQuery) {
    if (!isPreparedQuery(query)) throw new AppError("INVALID_QUERY", "Use a prepared query");
    if (mode.readOnly && !query.readOnly) throw new AppError("QUERY_NOT_READ_ONLY", "Read contexts run read-only queries only");
    if (query.requiresTransaction && !insideTransaction) throw new AppError("TRANSACTION_REQUIRED", "Row locks require db.transaction");
  }

  const context: Queryable = Object.freeze({
    query<R extends unknown[] = Row[]>(query: PreparedQuery, values: readonly unknown[] = []): Promise<R> {
      assertOpen();
      assertRunnable(query);
      if (!query.readOnly) mode.onWrite?.();
      return track(connection.query(query.bind(schema), values) as Promise<R>);
    },
    transaction<R>(callback: (tx: Queryable) => Promise<R>): Promise<R> {
      assertOpen();
      if (!transactionDatabase) throw new AppError("NESTED_TRANSACTION", "Nested transactions are not supported");
      return track(transactionDatabase.transaction((tx) => runContext(tx, undefined, schema, callback, { onWrite: mode.onWrite })));
    },
  });

  let result: T;
  try {
    result = await work(context);
  } finally {
    isOpen = false;
    // Bekletilmemiş sorgular sürerken transaction commit/rollback edilemez.
    if (running?.size) await Promise.allSettled(running);
  }
  if (failure) throw failure.error;
  return result;
}

const NOT_READ_ONLY = () => Promise.reject(new AppError("QUERY_NOT_READ_ONLY", "Read contexts run prepared read-only queries only"));

/** Primary'de okuma. `readOnlyTransaction`: replica yapılandırılmış ama kullanılamıyor; okuma bir replica okumasıyla aynı anlamı taşımak için
 * `READ ONLY` transaction'da çalışır. Aksi halde tek deyim (tek gidiş-dönüş); `readOnly` bayrağı derleme zamanında denetlenmiştir. */
const primaryReads = (db: Database, readOnlyTransaction: boolean): Connection => ({
  query: (readOnlyTransaction
    ? (text: string, params?: readonly unknown[]) => db.transaction((tx) => tx.query(text, params), { mode: " READ ONLY" })
    : (text: string, params?: readonly unknown[]) => db.query(text, params)) as Connection["query"],
  exec: NOT_READ_ONLY,
});

/** Replica'da okuma: bağlantı hatası replica'yı `up = false` işaretler (SQL hatası işaretlemez); hata her halükârda yüzeye çıkar. */
const replicaReads = ({ db, markDown }: { db: Database; markDown(): void }): Connection => ({
  query: (async (text: string, params?: readonly unknown[]) => {
    try {
      return await db.query(text, params);
    } catch (error) {
      if (databaseUnavailable(error)) markDown();
      throw error;
    }
  }) as Connection["query"],
  exec: NOT_READ_ONLY,
});

/** Her çağrı bir replica'ya sabitlenir. Sağlıklı replica yoksa `onUnavailable`: primary ya da `REPLICA_UNAVAILABLE`. Primary okuması tek
 * deyimdir; yalnızca replica yapılandırılmış ama kullanılamıyorsa `READ ONLY` transaction'dadır. `afterWrite`: aynı istekte yazı oldu,
 * okuma politikadan bağımsız primary'de kalır (tek deyim). Replica yapılandırılmamışsa router'a hiç sorulmaz. */
export function createReader(pools: Pick<Pools, "primary" | "replicaUrls">, router: Pick<ReplicaRouter, "pick">, onUnavailable: ReplicaPolicy, schema: string) {
  return async function read<T>(work: (db: ReadContext) => Promise<T>, afterWrite = false, session?: ReadSession): Promise<T> {
    const configured = pools.replicaUrls.length > 0;
    let handle = afterWrite || !configured ? undefined : (session?.handle ?? (await router.pick()));
    if (handle && session) {
      const picked = handle;
      session.handle = picked;
      handle = {
        db: picked.db,
        markDown: () => {
          picked.markDown();
          if (session.handle === picked) session.handle = undefined;
        },
      };
    }
    let connection: Connection;
    if (handle) connection = replicaReads(handle);
    else if (afterWrite) connection = primaryReads(pools.primary, false);
    else if (onUnavailable === "primary") connection = primaryReads(pools.primary, configured);
    else throw new AppError("REPLICA_UNAVAILABLE", "No usable replica is available");
    return runContext(connection, undefined, schema, work, { readOnly: true });
  };
}
