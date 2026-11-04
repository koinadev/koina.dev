// İmleçli liste yardımcıları (conventions §3.4): imleç, sınır satırın UUIDv7 kimliğidir; kimlik zamana göre
// sıralı olduğu için `id > after` / `id < before` aynı zamanda zaman sırasıdır. Saf fonksiyonlar; Workers'ta çalışır.
export const DEFAULT_LIMIT = 20
export const MAX_LIMIT = 100

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
const CURSOR = /^[A-Za-z0-9_-]{22}$/

export interface CursorParams {
  limit: number
  after: string | null
  before: string | null
}

export function encodeCursor(id: string): string {
  const hex = id.toLowerCase()
  if (!UUID.test(hex)) throw new RangeError('Cursor id must be a UUID')
  const bytes = Uint8Array.from(hex.replaceAll('-', '').match(/../g) ?? [], (pair) => Number.parseInt(pair, 16))
  return btoa(String.fromCharCode(...bytes))
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replaceAll('=', '')
}

/** Geçersiz imleçte `null` döner; çağıran bunu isteğin hatası olarak ele alır. */
export function decodeCursor(cursor: string): string | null {
  if (!CURSOR.test(cursor)) return null
  const binary = atob(cursor.replaceAll('-', '+').replaceAll('_', '/') + '==')
  if (binary.length !== 16) return null
  const hex = Array.from(binary, (char) => char.charCodeAt(0).toString(16).padStart(2, '0')).join('')
  const id = `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
  // Son karakterin kullanılmayan bitleri sıfır değilse imleç kanonik değildir.
  return encodeCursor(id) === cursor ? id : null
}

function resolveLimit(limit: number | string | undefined): number {
  if (limit === undefined) return DEFAULT_LIMIT
  const value = typeof limit === 'string' ? (/^\d+$/.test(limit) ? Number(limit) : Number.NaN) : limit
  if (!Number.isInteger(value) || value < 1 || value > MAX_LIMIT) {
    throw new RangeError(`Limit must be an integer between 1 and ${MAX_LIMIT}`)
  }
  return value
}

function resolveCursor(cursor: string | undefined): string | null {
  if (cursor === undefined) return null
  const id = decodeCursor(cursor)
  if (id === null) throw new RangeError('Cursor is invalid')
  return id
}

/** `limit/after/before` sorgu parametrelerini doğrular; ihlalde `RangeError` fırlatır (service `BadRequest`'e çevirir). */
export function resolveCursorParams(input: { limit?: number | string; after?: string; before?: string }): CursorParams {
  if (input.after !== undefined && input.before !== undefined) {
    throw new RangeError('Only one of after and before can be set')
  }
  return { limit: resolveLimit(input.limit), after: resolveCursor(input.after), before: resolveCursor(input.before) }
}
