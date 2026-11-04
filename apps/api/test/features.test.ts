import { afterAll, beforeEach, describe, expect, it } from 'bun:test';
import { call, env, json, resetDatabase, sql } from './helpers';

const addMembers = (n: number, verified = true) =>
  sql`INSERT INTO users (id, name, email, email_verified, handle, created_at, updated_at)
      SELECT gen_random_uuid(), 'Üye', 'uye' || i || '-' || gen_random_uuid() || '@koina.test', ${verified}, 'u' || replace(gen_random_uuid()::text, '-', ''), now(), now()
      FROM generate_series(1, ${n}) AS i`;

describe('üye eşiğine bağlı özellikler', () => {
  beforeEach(async () => {
    env.FEATURE_GATES = undefined;
    await resetDatabase();
  });
  afterAll(() => {
    env.FEATURE_GATES = 'off';
  });

  it('eşik altında API kilitli döner, üye sayısını açık etmez', async () => {
    await addMembers(24);
    const features = await json(await call('GET', '/v1/features'));
    expect(features.links).toBe(false);
    expect(features).not.toHaveProperty('members');
    const res = await call('GET', '/v1/links');
    expect(res.status).toBe(403);
    expect((await json(res)).code).toBe('FEATURE_LOCKED');
    expect((await call('GET', '/v1/feed')).status).toBe(403);
    expect((await call('GET', '/v1/events')).status).toBe(200);
  });

  it('doğrulanmamış hesaplar sayılmaz', async () => {
    await addMembers(30, false);
    expect((await json(await call('GET', '/v1/features'))).links).toBe(false);
  });

  it('eşikte açılır; üye sayısı düşse de kapanmaz', async () => {
    await addMembers(50);
    expect((await call('GET', '/v1/feed')).status).toBe(200);
    expect((await json(await call('GET', '/v1/features'))).follow).toBe(false);
    await sql`DELETE FROM users`;
    const features = await json(await call('GET', '/v1/features'));
    expect(features.feed).toBe(true);
    expect((await call('GET', '/v1/links')).status).toBe(200);
  });
});
