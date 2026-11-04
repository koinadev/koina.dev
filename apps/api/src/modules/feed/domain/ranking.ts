// "Öne çıkanlar" sıralaması. Saf fonksiyonlar: girdi aday satırlar, çıktı sıralı kimlikler. Ağırlıklar burada, gerekçeleri
// docs/platform.md'de.

export interface RankInput {
  id: string;
  userId: string;
  createdAt: Date;
  claps: number;
  repliers: number;
  reposts: number;
  quotes: number;
  bookmarks: number;
  reports: number;
  authorTrust: number;
  followed: boolean;
  myProject: boolean;
  inProject: boolean;
  rich: boolean;
}

export const WEIGHTS = {
  clap: 1,
  replier: 2,
  repost: 3,
  quote: 2,
  bookmark: 1,
  followed: 1.6,
  myProject: 1.3,
  inProject: 1.1,
  rich: 1.05,
  newAccount: 0.7,
  reported: 0.4,
  gravity: 1.5,
  /** Aynı yazarın listedeki her yeni gönderisi bu oranla zayıflar. */
  sameAuthor: 0.6,
} as const;

/** Tek gönderinin puanı: etkileşim logaritmik büyür (bir gönderi sayıyla ezmez), yaşla çürür. */
export function scorePost(p: RankInput, now: Date): number {
  const engagement =
    WEIGHTS.clap * p.claps +
    WEIGHTS.replier * p.repliers +
    WEIGHTS.repost * p.reposts +
    WEIGHTS.quote * p.quotes +
    WEIGHTS.bookmark * p.bookmarks;
  let score = 1 + Math.log1p(engagement);
  if (p.followed) score *= WEIGHTS.followed;
  if (p.myProject) score *= WEIGHTS.myProject;
  else if (p.inProject) score *= WEIGHTS.inProject;
  if (p.rich) score *= WEIGHTS.rich;
  if (p.authorTrust === 0) score *= WEIGHTS.newAccount;
  if (p.reports > 0) score *= WEIGHTS.reported;
  const hours = Math.max(0, (now.getTime() - p.createdAt.getTime()) / 3_600_000);
  return score / Math.pow(hours + 2, WEIGHTS.gravity);
}

/**
 * Adayları puanlar ve sıralar; ardından çeşitlilik: listede aynı yazara ait her sonraki gönderi `sameAuthor` ile çarpılarak yeniden
 * yerleşir. Böylece çok paylaşan biri akışı dolduramaz. Eşit puanda yeni olan önce.
 */
export function rankPosts(candidates: readonly RankInput[], now: Date): string[] {
  const scored = candidates
    .map((p) => ({ p, score: scorePost(p, now) }))
    .sort((a, b) => b.score - a.score || b.p.createdAt.getTime() - a.p.createdAt.getTime());
  const seen = new Map<string, number>();
  return scored
    .map(({ p, score }) => {
      const count = seen.get(p.userId) ?? 0;
      seen.set(p.userId, count + 1);
      return { p, score: score * Math.pow(WEIGHTS.sameAuthor, count) };
    })
    .sort((a, b) => b.score - a.score || b.p.createdAt.getTime() - a.p.createdAt.getTime())
    .map(({ p }) => p.id);
}
