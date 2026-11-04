// Bağlantının kimliği: aynı sayfaya giden farklı yazımlar aynı özete iner (önizleme önbelleği ve faydalı bağlantıların tekilliği).

const TRACKING = /^(utm_|mc_|pk_|hsa_)|^(fbclid|gclid|dclid|msclkid|yclid|igshid|ref|ref_src|ref_url|si|spm|_hsenc|_hsmi|mkt_tok)$/i;

/** Parça ve izleme parametreleri atılır, ana makine küçülür ve `www.` düşer, parametreler sıralanır, sondaki `/` gider. */
export function canonicalUrl(raw: string): string {
  const url = new URL(raw);
  url.hash = '';
  url.hostname = url.hostname.toLowerCase().replace(/^www\./, '');
  if ((url.protocol === 'https:' && url.port === '443') || (url.protocol === 'http:' && url.port === '80')) url.port = '';
  const params = [...url.searchParams.entries()].filter(([key]) => !TRACKING.test(key)).sort(([a], [b]) => a.localeCompare(b));
  url.search = new URLSearchParams(params).toString();
  if (url.pathname.length > 1) url.pathname = url.pathname.replace(/\/+$/, '');
  // Aynı içerik http ve https'te: kimlikte şema yok sayılır.
  return url.toString().replace(/^http:/, 'https:');
}

/** Listede kaynak olarak gösterilen alan adı. */
export const hostOf = (raw: string): string => new URL(raw).hostname.toLowerCase().replace(/^www\./, '');
