/** `wrangler kv key list` çıktısındaki ön kayıtları CSV'ye çevirir (worker/index.ts kaydı metadata'ya da yazar). */
export interface PresignupKey {
  name: string;
  metadata?: { email?: string; consent?: string; locale?: string; at?: string };
}

// Hücre `=`, `+`, `-`, `@` ile başlarsa tablo programı formül sanar; başına `'` eklenir (CSV enjeksiyonu).
const cell = (value: string) => {
  const safe = /^[=+\-@]/.test(value) ? `'${value}` : value;
  return /[",\n\r]/.test(safe) ? `"${safe.replaceAll('"', '""')}"` : safe;
};

export function toCsv(keys: PresignupKey[]): string {
  const rows = keys
    .filter((k) => k.name.startsWith('email:'))
    .map((k) => [
      k.metadata?.email ?? k.name.slice('email:'.length),
      k.metadata?.at ?? '',
      k.metadata?.consent ?? '',
      k.metadata?.locale ?? '',
    ])
    .sort((a, b) => a[1]!.localeCompare(b[1]!));
  return [['email', 'kayit_tarihi', 'onay_surumu', 'dil'], ...rows].map((r) => r.map(cell).join(',')).join('\n') + '\n';
}
