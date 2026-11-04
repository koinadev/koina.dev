// Koina'nın özellikleri topluluk büyüdükçe açılır: eşik, doğrulanmış ve uzaklaştırılmamış üye sayısıdır. Tek kaynak burası;
// API kilidi, uygulama menüsü ve sitedeki yol haritası buradan okur. Gerekçe: plan/07-yol-haritasi.md.
export const MEMBER_GOALS = {
  links: 25,
  feed: 50,
  follow: 100,
  projects: 200,
  seasons: 500,
  mobile: 1000,
} as const;

export type Feature = keyof typeof MEMBER_GOALS;
export type FeatureMap = Record<Feature, boolean>;

export const FEATURES = Object.keys(MEMBER_GOALS) as Feature[];

/** Bu üye sayısında eşiği geçilmiş özellikler. */
export const reachedFeatures = (members: number): Feature[] => FEATURES.filter((f) => members >= MEMBER_GOALS[f]);
