import { FEATURES, reachedFeatures, type Feature, type FeatureMap } from '@koina/shared/features';
import { countMembers, insertFeatureUnlock, listFeatureUnlocks } from '@koina/db/repositories/site';
import type { AppContext } from '../../../core/types/env';
import { fail } from '../../../core/utils/errors';

/**
 * Açık özellikler. Eşik geçilince kayda yazılır ve bir daha kapanmaz; üye sayısı düşünce kimsenin içeriği kaybolmasın.
 * Üye sayısının kendisi bilerek dışarı verilmez: topluluk sayıları herkese açık değil (docs/platform.md).
 */
export async function unlockedFeatures(c: AppContext): Promise<FeatureMap> {
  const open = new Set<string>(c.env.FEATURE_GATES === 'off' ? FEATURES : await listFeatureUnlocks(c.get('db')));
  if (open.size < FEATURES.length) {
    const reached = reachedFeatures(await countMembers(c.get('db'))).filter((f) => !open.has(f));
    for (const feature of reached) {
      await insertFeatureUnlock(c.get('db'), feature);
      open.add(feature);
    }
  }
  return Object.fromEntries(FEATURES.map((f) => [f, open.has(f)])) as FeatureMap;
}

export const requireFeature = (feature: Feature) => async (c: AppContext, next: () => Promise<void>) => {
  if (!(await unlockedFeatures(c))[feature]) fail('FEATURE_LOCKED');
  await next();
};
