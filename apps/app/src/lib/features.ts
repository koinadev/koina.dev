import type { Feature, FeatureMap } from '@koina/shared/features';
import { useQuery } from '@tanstack/react-query';
import { featuresQuery } from './queries';

const ALL_LOCKED: FeatureMap = { links: false, feed: false, follow: false, projects: false, seasons: false, mobile: false };

/** Açık özellikler. Kök yönlendirici veriyi sunucuda yükler; ilk çizimde hazır gelir. */
export function useFeatures(): FeatureMap {
  return useQuery(featuresQuery).data ?? ALL_LOCKED;
}

const PATHS: [RegExp, Feature][] = [
  [/^\/(akis|etiket|ara|kaydedilenler|bildirimler)(\/|$)/, 'feed'],
  [/^\/baglantilar(\/|$)/, 'links'],
  [/^\/(kesfet|proje)(\/|$)/, 'projects'],
];

/** Sayfanın bağlı olduğu özellik; takvim, yazılar, profil gibi her zaman açık sayfalarda `null`. */
export const featureOfPath = (pathname: string): Feature | null => PATHS.find(([re]) => re.test(pathname))?.[1] ?? null;
