import { describe, expect, it } from 'vitest';
import { reachedFeatures } from '../src/features';

describe('reachedFeatures', () => {
  it('eşik üyesiyle açılır, bir eksikle açılmaz', () => {
    expect(reachedFeatures(24)).toEqual([]);
    expect(reachedFeatures(25)).toEqual(['links']);
    expect(reachedFeatures(49)).toEqual(['links']);
    expect(reachedFeatures(50)).toEqual(['links', 'feed']);
    expect(reachedFeatures(1000)).toHaveLength(6);
  });
});
