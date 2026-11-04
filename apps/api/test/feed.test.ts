import { beforeAll, describe, expect, test } from 'bun:test';
import type { Notification, Page, Post, Thread, Trend } from '@koina/shared/api';
import { call, json, resetDatabase, signIn, trust } from './helpers';

let ada: string;
let bob: string;
let cem: string;

beforeAll(async () => {
  await resetDatabase();
  [ada, bob, cem] = await Promise.all([signIn('ada@example.com'), signIn('bob@example.com'), signIn('cem@example.com')]);
  await Promise.all([trust('ada@example.com'), trust('bob@example.com'), trust('cem@example.com')]);
});

const post = async (token: string, body: Record<string, unknown>) => {
  const res = await call('POST', '/v1/feed', body, { token });
  if (res.status !== 201) throw new Error(`post ${res.status} ${await res.text()}`);
  return json<Post>(res);
};

describe('akış', () => {
  test('gönderi etiket ve anmaları ayıklar; anılan üye bildirim alır', async () => {
    const p = await post(ada, { body: 'Merhaba #İmece topluluğu, @bob bakar mısın? #imece #açıkKaynak' });
    expect(p.author.handle).toBe('ada');
    expect(p.clapped).toBe(false);
    const tagged = await json<Page<Post>>(await call('GET', '/v1/feed?tag=imece'));
    expect(tagged.items.map((x) => x.id)).toContain(p.id);
    const notes = await json<Page<Notification>>(await call('GET', '/v1/me/notifications', undefined, { token: bob }));
    expect(notes.items[0]).toMatchObject({ kind: 'mention', actor: { handle: 'ada' }, read: false });
    expect((await json(await call('GET', '/v1/me', undefined, { token: bob }))).unread).toBe(1);
    await call('POST', '/v1/me/notifications/read', {}, { token: bob });
    expect((await json(await call('GET', '/v1/me', undefined, { token: bob }))).unread).toBe(0);
  });

  test('arama Türkçe harfleri sadeleştirerek eşleşir', async () => {
    const p = await post(bob, { body: 'Şehir haritası için ÇALIŞMA grubu' });
    for (const q of ['sehir', 'ŞEHİR', 'calisma', 'harıta']) {
      const page = await json<Page<Post>>(await call('GET', `/v1/feed?q=${encodeURIComponent(q)}`));
      expect(page.items.map((x) => x.id)).toContain(p.id);
    }
  });

  test('yanıt zinciri: yanıta yanıt verilir, konu sayfası üst zinciri gösterir', async () => {
    const root = await post(ada, { body: 'Kök gönderi' });
    const r1 = await post(bob, { body: 'Birinci yanıt', parentId: root.id });
    const r2 = await post(cem, { body: 'Yanıta yanıt', parentId: r1.id });
    expect(r1.replyTo).toBe('ada');
    expect(r2.rootId).toBe(root.id);
    const thread = await json<Thread>(await call('GET', `/v1/feed/${r2.id}`));
    expect(thread.ancestors.map((p) => p.id)).toEqual([root.id, r1.id]);
    const top = await json<Thread>(await call('GET', `/v1/feed/${root.id}`));
    expect(top.post.replies).toBe(1);
    expect(top.replies.map((p) => p.id)).toEqual([r1.id]);
    const notes = await json<Page<Notification>>(await call('GET', '/v1/me/notifications', undefined, { token: ada }));
    expect(notes.items.some((n) => n.kind === 'reply' && n.actor.handle === 'bob')).toBe(true);
  });

  test('alıntı, yeniden paylaşım ve takip akışı', async () => {
    const original = await post(cem, { body: 'Alıntılanacak fikir' });
    const quote = await post(ada, { body: 'Buna katılıyorum', quoteId: original.id });
    expect(quote.quote).toMatchObject({ id: original.id, author: { handle: 'cem' } });
    expect((await call('POST', '/v1/members/bob/follow', {}, { token: ada })).status).toBe(204);
    const fromBob = await post(cem, { body: 'Bob bunu yeniden paylaşacak' });
    expect((await call('POST', `/v1/feed/${fromBob.id}/repost`, {}, { token: bob })).status).toBe(204);
    const following = await json<Page<Post>>(await call('GET', '/v1/feed?tab=following', undefined, { token: ada }));
    const shared = following.items.find((p) => p.id === fromBob.id);
    expect(shared?.repostedBy?.handle).toBe('bob');
    expect(following.items.some((p) => p.id === quote.id)).toBe(true);
    expect((await call('GET', '/v1/feed?tab=following')).status).toBe(401);
  });

  test('alkış ve kaydetme izleyene özel; kaydedilenler listesi', async () => {
    const p = await post(bob, { body: 'Kaydetmelik' });
    await call('POST', `/v1/feed/${p.id}/clap`, {}, { token: ada });
    await call('POST', `/v1/feed/${p.id}/clap`, {}, { token: ada });
    await call('POST', `/v1/feed/${p.id}/bookmark`, {}, { token: ada });
    const seen = await json<Thread>(await call('GET', `/v1/feed/${p.id}`, undefined, { token: ada }));
    expect(seen.post).toMatchObject({ claps: 1, clapped: true, bookmarked: true });
    const guest = await json<Thread>(await call('GET', `/v1/feed/${p.id}`));
    expect(guest.post.clapped).toBeUndefined();
    const saved = await json<Page<Post>>(await call('GET', '/v1/me/bookmarks', undefined, { token: ada }));
    expect(saved.items[0]?.id).toBe(p.id);
    await call('DELETE', `/v1/feed/${p.id}/clap`, undefined, { token: ada });
    expect((await json<Thread>(await call('GET', `/v1/feed/${p.id}`, undefined, { token: ada }))).post.claps).toBe(0);
  });

  test('öne çıkanlar etkileşimli gönderiyi öne alır ve sayfalanır', async () => {
    const quiet = await post(cem, { body: 'Sessiz gönderi' });
    const loud = await post(bob, { body: 'Çok konuşulan gönderi' });
    for (const token of [ada, cem]) {
      await call('POST', `/v1/feed/${loud.id}/clap`, {}, { token });
      await post(token, { body: `Yanıt ${Math.random()}`, parentId: loud.id });
    }
    const page = await json<Page<Post>>(await call('GET', '/v1/feed'));
    const ids = page.items.map((p) => p.id);
    expect(ids.indexOf(loud.id)).toBeLessThan(ids.indexOf(quiet.id));
    expect(page.items.every((p) => p.parentId === null)).toBe(true);
  });

  test('gündemdeki etiketler', async () => {
    await post(bob, { body: 'Ben de #imece diyorum' });
    const trends = await json<Page<Trend>>(await call('GET', '/v1/tags/trending'));
    expect(trends.items[0]).toMatchObject({ tag: 'imece', people: 2 });
  });

  test('başkasının gönderisini silemezsin; kendi gönderin yanıtlarıyla gider', async () => {
    const p = await post(ada, { body: 'Silinecek' });
    const reply = await post(bob, { body: 'Yanıt', parentId: p.id });
    expect((await call('DELETE', `/v1/feed/${p.id}`, undefined, { token: bob })).status).toBe(403);
    expect((await call('DELETE', `/v1/feed/${p.id}`, undefined, { token: ada })).status).toBe(204);
    expect((await call('GET', `/v1/feed/${reply.id}`)).status).toBe(404);
  });

  test('bozuk kimlik 404, boş gönderi 400', async () => {
    expect((await call('GET', '/v1/feed/not-a-uuid')).status).toBe(404);
    expect((await call('POST', '/v1/feed', { body: '   ' }, { token: ada })).status).toBe(400);
  });
});
