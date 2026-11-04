import { describe, expect, it } from 'vitest';
import { featureOfPath } from './features';

describe('featureOfPath', () => {
  it('kilitli bölümleri bulur, açık sayfaları karıştırmaz', () => {
    expect(featureOfPath('/akis/1')).toBe('feed');
    expect(featureOfPath('/baglantilar/yeni')).toBe('links');
    expect(featureOfPath('/kesfet')).toBe('projects');
    expect(featureOfPath('/proje/a')).toBe('projects');
    expect(featureOfPath('/home')).toBeNull();
    expect(featureOfPath('/takvim')).toBeNull();
    expect(featureOfPath('/arama-degil')).toBeNull();
  });
});
