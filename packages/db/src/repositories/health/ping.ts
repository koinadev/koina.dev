import type { Queryable } from '../../core/context'
import { ping as pingQuery } from '../../queries/health.gen'

/** Sağlık yoklaması: veritabanı bir sorguya cevap veriyorsa `true`; hata `AppError` olarak yukarı çıkar. */
export async function ping(db: Pick<Queryable, 'query'>) {
  const [row] = await db.query<{ ok: number }[]>(pingQuery)
  return row?.ok === 1
}
