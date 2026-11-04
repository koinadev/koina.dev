/** Katalog okuması: schema durumu. */
import type { Connection } from "./driver";

/** Bu DB'de `name` schema'sı var mı. */
export async function schemaExists(db: Pick<Connection, "query">, name: string): Promise<boolean> {
  const [row] = await db.query<{ exists: boolean }>("SELECT EXISTS(SELECT 1 FROM pg_catalog.pg_namespace WHERE nspname=$1) AS exists", [name]);
  return !!row?.exists;
}

/** Eklentinin üyesi olan nesne (fonksiyon, tür, ilişki …) uygulama verisi değildir: yedek ve boşluk denetimi onlara bakmaz. */
export const notExtensionMember = (catalog: "pg_class" | "pg_proc" | "pg_type", alias: string) =>
  `NOT EXISTS(SELECT 1 FROM pg_catalog.pg_depend x WHERE x.classid='pg_catalog.${catalog}'::pg_catalog.regclass AND x.objid=${alias}.oid AND x.deptype='e')`;

/** `$1` schema'sının eklentiye ait olmayan enum'ları (ad sırasıyla): ad, okuyan oturumun `regtype` metni (katalog ifadelerinde göründüğü
 * gibi) ve sıralı etiketlerin JSON dizisi. Yedek ve `pull` kullanır. */
export const ENUMS_SQL = `SELECT t.typname AS name,t.oid::pg_catalog.regtype::text AS reference,pg_catalog.array_to_json(ARRAY(
    SELECT e.enumlabel FROM pg_catalog.pg_enum e WHERE e.enumtypid=t.oid ORDER BY e.enumsortorder))::text AS labels
  FROM pg_catalog.pg_type t JOIN pg_catalog.pg_namespace n ON n.oid=t.typnamespace
  WHERE n.nspname=$1 AND t.typtype='e' AND ${notExtensionMember("pg_type", "t")} ORDER BY t.typname`;

/** `name` schema'sında eklentiye ait olmayan hiç tablo, view, sequence, yabancı tablo ya da tek başına tip (enum, domain, range; ilişki
 * satır tipleri ve diziler hariç) yok mu (schema hiç yoksa da boştur). */
export async function schemaIsEmpty(db: Pick<Connection, "query">, name: string): Promise<boolean> {
  const [row] = await db.query<{ empty: boolean }>(
    `SELECT NOT EXISTS(SELECT 1 FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
      WHERE n.nspname=$1 AND c.relkind IN ('r','p','v','m','f','S') AND ${notExtensionMember("pg_class", "c")})
    AND NOT EXISTS(SELECT 1 FROM pg_catalog.pg_type t JOIN pg_catalog.pg_namespace n ON n.oid=t.typnamespace
      WHERE n.nspname=$1 AND t.typrelid=0 AND t.typelem=0 AND ${notExtensionMember("pg_type", "t")}) AS empty`,
    [name],
  );
  return row?.empty === true;
}
