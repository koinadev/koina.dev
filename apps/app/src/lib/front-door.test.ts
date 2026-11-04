import { readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { hasSessionCookie, isAppPath, isLanding } from './front-door';

describe('giriş kapısı', () => {
  it('her üst düzey rota uygulamada kalır', () => {
    const dir = fileURLToPath(new URL('../routes', import.meta.url));
    const tops = readdirSync(dir)
      .map((f) => f.replace(/\[\.\]/g, '.').replace(/\.(tsx|ts)$/, ''))
      .filter((f) => f !== '__root' && f !== 'index');
    expect(tops.length).toBeGreaterThan(5);
    for (const top of tops) expect([top, isAppPath(`/${top}`)]).toEqual([top, true]);
  });
  it('sitenin yolları siteye gider', () => {
    for (const p of ['/', '/tr', '/tr/kayit', '/en/about', '/_astro/a.js', '/blog/tr.json', '/homepage']) expect(isAppPath(p)).toBe(false);
  });
  it('yalnız ana sayfalar yönlendirilir', () => {
    for (const p of ['/', '/tr', '/en', '/tr/']) expect(isLanding(p)).toBe(true);
    for (const p of ['/tr/kayit', '/home', '/trx']) expect(isLanding(p)).toBe(false);
  });
  it('oturum çerezini adıyla tanır', () => {
    expect(hasSessionCookie('a=1; koina.session_token=x')).toBe(true);
    expect(hasSessionCookie('__Secure-koina.session_token=x')).toBe(true);
    expect(hasSessionCookie('xkoina.session_token=x')).toBe(false);
    expect(hasSessionCookie(null)).toBe(false);
  });
});
