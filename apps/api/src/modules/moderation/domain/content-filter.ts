import { STEMS, WORDS } from './word-list';

const LEET: Record<string, string> = { '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's', '7': 't', '@': 'a', $: 's', '€': 'e' };
const INVISIBLE = /[​-‏⁠﻿­]/g;

/** Karşılaştırma biçimi: görünmez karakterler atılır, Türkçe küçük harf, leetspeak harfe döner, yinelenen harfler teke iner. */
export function normalizeForFilter(text: string): string {
  return text
    .normalize('NFKC')
    .replace(INVISIBLE, '')
    .toLocaleLowerCase('tr')
    .replace(/[013457@$€]/g, (ch) => LEET[ch] ?? ch)
    .replace(/(\p{L})\1+/gu, '$1');
}

const collapse = (word: string) => word.replace(/(\p{L})\1+/gu, '$1');
const COLLAPSED_WORDS = new Set([...WORDS].map(collapse));
const COLLAPSED_STEMS = STEMS.map(collapse);

const matches = (token: string) => COLLAPSED_WORDS.has(token) || COLLAPSED_STEMS.some((stem) => token.startsWith(stem));

/** Harf aralarına boşluk ya da noktalama koyarak yazılmış kelime ("s.i.k.t.i.r", "o r o s p u"): harfler birleştirilir. */
const SPACED = /(?:^|[^\p{L}])((?:\p{L}[\s._\-*+|/\\]{1,3}){2,}\p{L})(?=$|[^\p{L}])/gu;

export interface FilterResult {
  ok: boolean;
  /** Eşleşen (sadeleştirilmiş) ifade; kayıt için, kullanıcıya gösterilmez. */
  term?: string;
}

/** Metin topluluk kurallarına aykırı bir ifade içeriyor mu. Kelime sınırıyla çalışır: "amca", "sıkıntı", "siklet" geçer. */
export function screenText(text: string): FilterResult {
  const normalized = normalizeForFilter(text);
  for (const token of normalized.split(/[^\p{L}]+/u)) {
    if (token && matches(token)) return { ok: false, term: token };
  }
  for (const [, spaced] of normalized.matchAll(SPACED)) {
    const joined = collapse(spaced!.replace(/[^\p{L}]/gu, ''));
    if (matches(joined)) return { ok: false, term: joined };
  }
  return { ok: true };
}
