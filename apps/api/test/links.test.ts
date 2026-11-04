import { beforeAll, describe, expect, test } from 'bun:test';
import type { Link, Page } from '@koina/shared/api';
import { call, json, resetDatabase, signIn, trust } from './helpers';

let ada: string;
let bob: string;

beforeAll(async () => {
  await resetDatabase();
  [ada, bob] = await Promise.all([signIn('ada@example.com'), signIn('bob@example.com')]);
  await trust('ada@example.com');
  await trust('bob@example.com');
});

// Ağa çıkmasın diye var olmayan bir alan adı: önizleme okunamaz, bağlantı kartsız eklenir.
const url = 'https://tools.koina-test-domain.com/editor?utm_source=x';

describe('faydalı bağlantılar', () => {
  let link: Link;

  test('ekleme: başlık ve kategori, alan adı ve etiketler', async () => {
    const res = await call('POST', '/v1/links', { url, title: 'Harika bir editör', category: 'tool', tags: ['Editör', 'web'] }, { token: ada });
    expect(res.status).toBe(201);
    link = await json<Link>(res);
    expect(link).toMatchObject({ host: 'tools.koina-test-domain.com', category: 'tool', tags: ['editör', 'web'], votes: 0 });
  });

  test('aynı kaynak (izleme parametresi farklı) ikinci kez eklenmez, var olan döner', async () => {
    const res = await call('POST', '/v1/links', { url: 'https://www.tools.koina-test-domain.com/editor/', title: 'Yine aynı', category: 'tool' }, { token: bob });
    expect(res.status).toBe(409);
    expect((await json(res)).id).toBe(link.id);
  });

  test('yerel ve IP adresleri reddedilir', async () => {
    for (const bad of ['http://localhost:8787/x', 'http://127.0.0.1/x', 'http://10.0.0.1/x', 'http://intranet.local/x', 'file:///etc/passwd']) {
      const res = await call('POST', '/v1/links', { url: bad, title: 'İç adres', category: 'other' }, { token: ada });
      expect(res.status).toBe(400);
    }
  });

  test('oy, sıralama ve süzgeç', async () => {
    const other = await json<Link>(await call('POST', '/v1/links', { url: 'https://learn.koina-test-domain.com', title: 'Öğrenme kaynağı', category: 'learning' }, { token: bob }));
    await call('POST', `/v1/links/${other.id}/vote`, {}, { token: ada });
    const top = await json<Page<Link>>(await call('GET', '/v1/links', undefined, { token: ada }));
    expect(top.items[0]).toMatchObject({ id: other.id, votes: 1, voted: true });
    const tools = await json<Page<Link>>(await call('GET', '/v1/links?category=tool&sort=new'));
    expect(tools.items.map((l) => l.id)).toEqual([link.id]);
    const search = await json<Page<Link>>(await call('GET', '/v1/links?q=EDİTÖR'));
    expect(search.items.map((l) => l.id)).toEqual([link.id]);
  });

  test('küfürlü başlık reddedilir; başkasının bağlantısı silinemez', async () => {
    expect((await call('POST', '/v1/links', { url: 'https://x.koina-test-domain.com', title: 'siktir edin bunu', category: 'other' }, { token: ada })).status).toBe(422);
    expect((await call('DELETE', `/v1/links/${link.id}`, undefined, { token: bob })).status).toBe(403);
    expect((await call('DELETE', `/v1/links/${link.id}`, undefined, { token: ada })).status).toBe(204);
  });
});
