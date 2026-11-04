// Spam kuralları: hesabın güven düzeyine göre sınırlar. 0 yeni hesap (3 günden genç ya da 3 görünür gönderiden az), 1 olağan,
// 2 moderatörün güvendiği üye.

export const TRUST_AFTER_DAYS = 3;

/** Bir gönderide izin verilen bağlantı sayısı. */
export const maxLinks = (trust: number): number => (trust === 0 ? 1 : 3);

/** Saatlik gönderi (yanıt dahil) sınırı. */
export const postsPerHour = (trust: number): number => (trust === 0 ? 8 : trust === 1 ? 40 : 120);

/** Günlük faydalı bağlantı ekleme sınırı. */
export const linksPerDay = (trust: number): number => (trust === 0 ? 3 : 20);

/** Aynı metin bu süre içinde yeniden gönderilemez. */
export const DUPLICATE_WINDOW_MS = 24 * 3600_000;

/**
 * Şikâyetle kendiliğinden gizleme: güvenilir (trust ≥ 1 ya da moderatör) üç farklı üye ya da toplam beş farklı üye.
 * Moderatör kuyruğunda kalır; geri açılabilir.
 */
export const shouldAutoHide = ({ reporters, trusted }: { reporters: number; trusted: number }): boolean =>
  trusted >= 3 || reporters >= 5;
