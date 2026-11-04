import { describe, expect, test } from 'bun:test'
import { decodeCursor, encodeCursor, resolveCursorParams } from '../cursor'

const ID = '0199c6c8-7a52-7c3e-8f10-2b6d5a0f9e41'

describe('encodeCursor / decodeCursor', () => {
  test('kimliği opak, URL güvenli bir metne çevirir ve geri çözer', () => {
    const cursor = encodeCursor(ID)
    expect(cursor).toMatch(/^[A-Za-z0-9_-]{22}$/)
    expect(cursor).not.toContain(ID)
    expect(decodeCursor(cursor)).toBe(ID)
  })

  test('büyük harfli kimlik küçük harfe normalleşir', () => {
    expect(decodeCursor(encodeCursor(ID.toUpperCase()))).toBe(ID)
  })

  test('geçersiz kimlik kodlanmaz', () => {
    expect(() => encodeCursor('not-a-uuid')).toThrow(RangeError)
  })

  test('bozuk imleç null döner', () => {
    expect(decodeCursor('')).toBeNull()
    expect(decodeCursor('abc')).toBeNull()
    expect(decodeCursor(ID)).toBeNull()
    expect(decodeCursor('!'.repeat(22))).toBeNull()
    expect(decodeCursor(`${encodeCursor(ID)}A`)).toBeNull()
  })
})

describe('resolveCursorParams', () => {
  test('boş girdi varsayılan sınırı verir', () => {
    expect(resolveCursorParams({})).toEqual({ limit: 20, after: null, before: null })
  })

  test('sınır dizgisi tam sayıya çevrilir (sorgu parametresi)', () => {
    expect(resolveCursorParams({ limit: '50' }).limit).toBe(50)
    expect(resolveCursorParams({ limit: 1 }).limit).toBe(1)
    expect(resolveCursorParams({ limit: 100 }).limit).toBe(100)
  })

  test('sınır dışı ve tam sayı olmayan limit reddedilir', () => {
    for (const limit of [0, -1, 101, 1.5, Number.NaN, 'abc', '', '1e2', '0x10']) {
      expect(() => resolveCursorParams({ limit })).toThrow(RangeError)
    }
  })

  test('after ve before kimliğe çözülür', () => {
    expect(resolveCursorParams({ after: encodeCursor(ID) }).after).toBe(ID)
    expect(resolveCursorParams({ before: encodeCursor(ID) }).before).toBe(ID)
  })

  test('bozuk imleç reddedilir', () => {
    expect(() => resolveCursorParams({ after: 'bozuk' })).toThrow(RangeError)
  })

  test('after ve before birlikte verilemez', () => {
    const cursor = encodeCursor(ID)
    expect(() => resolveCursorParams({ after: cursor, before: cursor })).toThrow(RangeError)
  })
})
