import { beforeAll, describe, expect, test } from 'bun:test';
import type { MemberProfile, Post } from '@koina/shared/api';
import { APP_ORIGIN, call, json, media, resetDatabase, signIn, sql, trust } from './helpers';

let ada: string;
let bob: string;

beforeAll(async () => {
  await resetDatabase();
  [ada, bob] = await Promise.all([signIn('ada@example.com'), signIn('bob@example.com')]);
  await trust('ada@example.com');
});

// 1x1 PNG + konum bilgisi taşıyabilecek bir tEXt parçası.
function tinyPng(): Uint8Array {
  const b64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  const png = Uint8Array.from(atob(b64), (ch) => ch.charCodeAt(0));
  const text = new TextEncoder().encode('Comment\0GPS 41.0,29.0');
  const chunk = new Uint8Array(12 + text.length);
  new DataView(chunk.buffer).setUint32(0, text.length);
  chunk.set(new TextEncoder().encode('tEXt'), 4);
  chunk.set(text, 8);
  return new Uint8Array([...png.subarray(0, 33), ...chunk, ...png.subarray(33)]);
}

describe('profil', () => {
  test('güncelleme, ayrılmış ve dolu kullanıcı adı', async () => {
    const res = await call('PATCH', '/v1/me', { name: 'Ada L.', bio: 'Açık kaynak', roles: ['mentor'], website: 'https://ada.dev', location: 'İzmir' }, { token: ada });
    expect(await json(res)).toMatchObject({ name: 'Ada L.', roles: ['mentor'], website: 'https://ada.dev', location: 'İzmir' });
    expect((await call('PATCH', '/v1/me', { handle: 'admin' }, { token: ada })).status).toBe(409);
    expect((await call('PATCH', '/v1/me', { handle: 'bob' }, { token: ada })).status).toBe(409);
    expect((await call('PATCH', '/v1/me', { website: 'javascript:alert(1)' }, { token: ada })).status).toBe(400);
  });

  test('profil: sayılar ve takip; üye listesi yok', async () => {
    await call('POST', '/v1/members/ada/follow', {}, { token: bob });
    const profile = await json<MemberProfile>(await call('GET', '/v1/members/ada', undefined, { token: bob }));
    expect(profile.stats).toMatchObject({ followers: 1, following: 0 });
    expect(profile.followed).toBe(true);
    expect((profile as unknown as Record<string, unknown>).email).toBeUndefined();
    expect((await call('GET', '/v1/members')).status).toBe(404);
    expect((await call('POST', '/v1/members/ada/follow', {}, { token: ada })).status).toBe(400);
  });
});

describe('görseller', () => {
  test('yükleme meta veriyi çıkarır; görsel gönderiye bağlanınca sunulur', async () => {
    const form = new FormData();
    form.append('file', new File([tinyPng()], 'x.png', { type: 'image/svg+xml' }));
    form.append('width', '1');
    form.append('height', '1');
    form.append('alt', 'Bir piksel');
    const res = await call('POST', '/v1/media', form, { token: ada });
    expect(res.status).toBe(201);
    const uploaded = await json<{ id: string; url: string }>(res);
    const key = uploaded.url.replace('http://localhost:8787/media/', '');
    const stored = media.objects.get(key)!;
    expect(stored.type).toBe('image/png');
    expect(new TextDecoder().decode(stored.body)).not.toContain('GPS');
    expect((await call('GET', `/media/${key}`)).status).toBe(404);

    const post = await json<Post>(await call('POST', '/v1/feed', { body: '', media: [uploaded.id] }, { token: ada }));
    expect(post.media[0]).toMatchObject({ id: uploaded.id, alt: 'Bir piksel' });
    const served = await call('GET', `/media/${key}`);
    expect(served.status).toBe(200);
    expect(served.headers.get('content-type')).toBe('image/png');
    expect(served.headers.get('x-content-type-options')).toBe('nosniff');
    // Başkasının görseli bağlanamaz.
    expect((await call('POST', '/v1/feed', { body: 'çalıntı', media: [uploaded.id] }, { token: bob })).status).toBe(415);
  });

  test('görsel olmayan dosya reddedilir', async () => {
    const form = new FormData();
    form.append('file', new File(['<svg onload="alert(1)"/>'], 'x.png', { type: 'image/png' }));
    form.append('width', '1');
    form.append('height', '1');
    expect((await call('POST', '/v1/media', form, { token: ada })).status).toBe(415);
  });
});

describe('güvenlik', () => {
  test('çerezle gelen yazma isteği izinli köken ister (CSRF)', async () => {
    const cookie = `koina.session_token=${ada}`;
    expect((await call('PATCH', '/v1/me', { bio: 'x' }, { cookie })).status).toBe(403);
    expect((await call('PATCH', '/v1/me', { bio: 'x' }, { cookie, origin: 'https://evil.example' })).status).toBe(403);
    expect((await call('PATCH', '/v1/me', { bio: 'x' }, { cookie, origin: APP_ORIGIN })).status).not.toBe(403);
  });

  test('güvenlik başlıkları ve önbellek', async () => {
    const res = await call('GET', '/v1/feed');
    expect(res.headers.get('x-content-type-options')).toBe('nosniff');
    expect(res.headers.get('x-frame-options')).toBe('DENY');
    expect(res.headers.get('cache-control')).toBe('private, no-store');
  });

  test('hesap silme tüm veriyi ve görselleri götürür', async () => {
    expect((await call('DELETE', '/v1/me', undefined, { token: ada })).status).toBe(204);
    expect((await call('GET', '/v1/me', undefined, { token: ada })).status).toBe(401);
    const [{ n }] = await sql<{ n: number }[]>`SELECT count(*)::int AS n FROM posts`;
    expect(n).toBe(0);
    expect(media.objects.size).toBe(0);
  });
});
