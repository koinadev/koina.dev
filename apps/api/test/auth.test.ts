import { beforeAll, describe, expect, test } from 'bun:test';
import { APP_ORIGIN, call, json, resetDatabase, signIn } from './helpers';

beforeAll(resetDatabase);

describe('giriş', () => {
  test('e-posta koduyla hesap açılır, kullanıcı adı e-postadan üretilir', async () => {
    const token = await signIn('ada.lovelace@example.com');
    const me = await json(await call('GET', '/v1/me', undefined, { token }));
    expect(me.handle).toBe('ada-lovelace');
    expect(me.name).toBe('Ada Lovelace');
    expect(me.role).toBe('member');
    expect(me.unread).toBe(0);
  });

  test('yanlış kod reddedilir', async () => {
    await call('POST', '/v1/auth/email-otp/send-verification-otp', { email: 'wrong@example.com', type: 'sign-in' });
    const res = await call('POST', '/v1/auth/sign-in/email-otp', { email: 'wrong@example.com', otp: '000000' });
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.headers.get('set-auth-token')).toBeNull();
  });

  test('girişsiz /v1/me 401', async () => {
    expect((await call('GET', '/v1/me')).status).toBe(401);
  });

  test('aynı adrese ikinci kod isteği aynı hesaba girer; çakışan kullanıcı adına sonek eklenir', async () => {
    const a = await signIn('ada.lovelace@example.com');
    const b = await signIn('ada.lovelace@other.example');
    const meA = await json(await call('GET', '/v1/me', undefined, { token: a }));
    const meB = await json(await call('GET', '/v1/me', undefined, { token: b }));
    expect(meA.handle).toBe('ada-lovelace');
    expect(String(meB.handle)).toMatch(/^ada-lovelace-\d{3}$/);
  });

  test('çıkıştan sonra belirteç geçersiz', async () => {
    const token = await signIn('leaver@example.com');
    expect((await call('POST', '/v1/auth/sign-out', {}, { token })).status).toBe(200);
    expect((await call('GET', '/v1/me', undefined, { token })).status).toBe(401);
  });

  test('tarayıcıdan kod isteği izinli kökenden gelir', async () => {
    const res = await call('POST', '/v1/auth/email-otp/send-verification-otp', { email: 'web@example.com', type: 'sign-in' }, { origin: 'https://evil.example' });
    expect(res.status).toBe(403);
    const ok = await call('POST', '/v1/auth/email-otp/send-verification-otp', { email: 'web@example.com', type: 'sign-in' }, { origin: APP_ORIGIN });
    expect(ok.status).toBe(200);
  });
});
