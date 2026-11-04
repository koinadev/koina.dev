import { beforeAll, describe, expect, test } from 'bun:test';
import type { ModQueueItem, Page, Post } from '@koina/shared/api';
import { call, env, json, resetDatabase, signIn, sql, trust } from './helpers';

let author: string;
let fresh: string;
const reporters: string[] = [];

beforeAll(async () => {
  await resetDatabase();
  author = await signIn('author@example.com');
  fresh = await signIn('fresh@example.com');
  await trust('author@example.com');
  for (let i = 0; i < 5; i += 1) reporters.push(await signIn(`reporter${i}@example.com`));
});

const create = (token: string, body: string) => call('POST', '/v1/feed', { body }, { token });

describe('içerik süzgeci ve spam', () => {
  test('küfürlü gönderi reddedilir, masum kelimeler geçer', async () => {
    for (const bad of ['siktir git', 'S.İ.K.T.İ.R', 'tam bir 0r0spu', 'amk ya', 'f u c k this']) {
      const res = await create(author, bad);
      expect(res.status).toBe(422);
      expect((await json(res)).code).toBe('CONTENT_REJECTED');
    }
    for (const ok of ['Amcamla siklet maçı izledik', 'Sıkıntı yok, şikayet de yok', 'cok sik bir tasarim olmus']) {
      expect((await create(author, ok)).status).toBe(201);
    }
  });

  test('profil adı ve biyografisi de süzülür', async () => {
    expect((await call('PATCH', '/v1/me', { bio: 'orospu çocuğu' }, { token: author })).status).toBe(422);
  });

  test('aynı metin 24 saat içinde tekrar gönderilemez', async () => {
    expect((await create(author, 'Tekrar eden duyuru')).status).toBe(201);
    expect((await json(await create(author, 'Tekrar eden duyuru'))).code).toBe('DUPLICATE');
  });

  test('yeni hesap gönderide tek bağlantı paylaşabilir', async () => {
    const res = await create(fresh, 'https://a.koina-test-domain.com ve https://b.koina-test-domain.com');
    expect((await json(res)).code).toBe('TOO_MANY_LINKS');
  });
});

describe('şikâyet ve moderasyon', () => {
  let target: Post;

  test('beş farklı üyenin şikâyeti gönderiyi gizler', async () => {
    target = await json<Post>(await create(author, 'Tartışmalı gönderi'));
    expect((await call('POST', `/v1/feed/${target.id}/report`, { reason: 'spam' }, { token: author })).status).toBe(403);
    for (const [i, token] of reporters.entries()) {
      expect((await call('POST', `/v1/feed/${target.id}/report`, { reason: 'abuse' }, { token })).status).toBe(204);
      const visible = (await call('GET', `/v1/feed/${target.id}`)).status === 200;
      expect(visible).toBe(i < 4);
    }
    // Yazar gizlenen gönderisini görür, işaretli.
    const own = await json<{ post: Post }>(await call('GET', `/v1/feed/${target.id}`, undefined, { token: author }));
    expect(own.post.hidden).toBe(true);
    const latest = await json<Page<Post>>(await call('GET', '/v1/feed?tab=latest'));
    expect(latest.items.some((p) => p.id === target.id)).toBe(false);
  });

  test('kuyruk yalnız moderatöre açık; yönetici moderatör atar', async () => {
    expect((await call('GET', '/v1/mod/queue', undefined, { token: reporters[0] })).status).toBe(403);
    const assign = await call('POST', '/v1/admin/members/reporter0/role', { role: 'moderator' }, { headers: { authorization: `Bearer ${env.ADMIN_TOKEN}` } });
    expect(assign.status).toBe(204);
    const queue = await json<Page<ModQueueItem>>(await call('GET', '/v1/mod/queue', undefined, { token: reporters[0] }));
    expect(queue.items[0]).toMatchObject({ targetKind: 'post', targetId: target.id, reports: 5 });
    expect(queue.items[0]?.post?.id).toBe(target.id);
  });

  test('moderatör geri açar; şikâyetler çözülür ve işlem kayda geçer', async () => {
    const res = await call('POST', '/v1/mod/actions', { targetKind: 'post', targetId: target.id, action: 'restore' }, { token: reporters[0] });
    expect(res.status).toBe(204);
    expect((await call('GET', `/v1/feed/${target.id}`)).status).toBe(200);
    const queue = await json<Page<ModQueueItem>>(await call('GET', '/v1/mod/queue', undefined, { token: reporters[0] }));
    expect(queue.items).toHaveLength(0);
    const log = await json<Page<{ action: string }>>(await call('GET', '/v1/mod/log', undefined, { token: reporters[0] }));
    expect(log.items.map((l) => l.action)).toEqual(['restore', 'auto-hide']);
  });

  test('uzaklaştırma: oturumlar düşer, içerik gizlenir, yeniden giriş açılmaz', async () => {
    const [{ id }] = await sql<{ id: string }[]>`SELECT id FROM users WHERE email = 'author@example.com'`;
    const res = await call('POST', '/v1/mod/actions', { targetKind: 'user', targetId: id, action: 'ban', reason: 'spam' }, { token: reporters[0] });
    expect(res.status).toBe(204);
    expect((await call('GET', '/v1/me', undefined, { token: author })).status).toBe(401);
    expect((await call('GET', `/v1/feed/${target.id}`)).status).toBe(404);
    expect((await call('GET', '/v1/members/author')).status).toBe(404);
    await expect(signIn('author@example.com')).rejects.toThrow();
  });
});
