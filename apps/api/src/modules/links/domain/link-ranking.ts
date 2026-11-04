// "Öne çıkan" bağlantılar: oy ve yaşla. Bağlantılar gönderiden yavaş eskir (iyi bir araç haftalarca işe yarar), bu yüzden yaş gün
// cinsinden ve yerçekimi düşük.

export interface LinkRankInput {
  id: string;
  createdAt: Date;
  votes: number;
  reports: number;
}

export const LINK_GRAVITY = 0.8;
const REPORTED = 0.4;

export function scoreLink(l: LinkRankInput, now: Date): number {
  const days = Math.max(0, (now.getTime() - l.createdAt.getTime()) / 86_400_000);
  const base = (1 + l.votes) / Math.pow(days + 2, LINK_GRAVITY);
  return l.reports > 0 ? base * REPORTED : base;
}

export function rankLinks(candidates: readonly LinkRankInput[], now: Date): string[] {
  return candidates
    .map((l) => ({ l, score: scoreLink(l, now) }))
    .sort((a, b) => b.score - a.score || b.l.createdAt.getTime() - a.l.createdAt.getTime())
    .map(({ l }) => l.id);
}
