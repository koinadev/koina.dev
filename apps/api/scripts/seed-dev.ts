// Yerel geliştirme için örnek veri: beş uydurma üye, projeler, gönderiler, yanıtlar, alkışlar, takipler ve faydalı bağlantılar.
// Yalnız yerel veritabanına yazar (127.0.0.1); her çalıştırmada önce kendi örnek kayıtlarını siler. Kullanım: `bun run seed`.
import postgres from 'postgres';
import { canonicalUrl } from '../src/modules/previews/domain/canonical-url';

const url = process.env.SEED_DATABASE_URL ?? 'postgres://admin:local_admin_password@127.0.0.1:46560/koina';
if (!/@(127\.0\.0\.1|localhost):/.test(url)) throw new Error('seed yalnız yerel veritabanına yazar');
const sql = postgres(url, { max: 1, onnotice: () => undefined });

const people = [
  { handle: 'deniz-kaya', name: 'Deniz Kaya', bio: 'Ön yüz geliştirici. Erişilebilirlik ve tasarım sistemleri.', roles: ['mentor'], interests: ['react', 'erişilebilirlik'], location: 'İzmir' },
  { handle: 'ece-yildiz', name: 'Ece Yıldız', bio: 'Bilgisayar mühendisliği öğrencisi, ilk açık kaynak katkısının peşinde.', roles: ['learner'], interests: ['python', 'veri'], location: 'Ankara' },
  { handle: 'mert-demir', name: 'Mert Demir', bio: 'Mahalle haritası projesinin kurucusu. Harita ve coğrafi veri meraklısı.', roles: ['founder'], interests: ['harita', 'postgis'], location: 'İstanbul' },
  { handle: 'selin-arslan', name: 'Selin Arslan', bio: 'Ürün tasarımcısı. Kullanıcı araştırması ve prototipleme.', roles: ['mentor', 'founder'], interests: ['figma', 'ux'], location: 'Eskişehir' },
  { handle: 'baris-oz', name: 'Barış Öz', bio: 'Arka uç ve altyapı. Postgres, Go, Cloudflare Workers.', roles: ['mentor'], interests: ['go', 'postgres'], location: 'Bursa' },
];

const ids = new Map<string, string>();
const at = (hoursAgo: number) => new Date(Date.now() - hoursAgo * 3_600_000);

await sql.begin(async (tx) => {
  await tx`DELETE FROM users WHERE email LIKE '%@seed.koina.local'`;
  await tx`DELETE FROM link_previews WHERE url LIKE 'https://seed.koina.local/%'`;
  for (const [i, p] of people.entries()) {
    const [row] = await tx<{ id: string }[]>`
      INSERT INTO users (name, email, email_verified, handle, bio, roles, interests, location, trust, created_at, updated_at)
      VALUES (${p.name}, ${`${p.handle}@seed.koina.local`}, true, ${p.handle}, ${p.bio}, ${tx.json(p.roles)}, ${tx.json(p.interests)},
              ${p.location}, 1, ${at(24 * (40 - i * 5))}, now())
      RETURNING id`;
    ids.set(p.handle, row!.id);
  }
  const u = (handle: string) => ids.get(handle)!;

  const projects = [
    { slug: 'imece-takvim', name: 'İmece Takvim', summary: 'Topluluk etkinliklerini tek takvimde toplayan, iCal ve RSS veren küçük bir araç.', status: 'building', owner: 'deniz-kaya', team: ['ece-yildiz'], looking: ['learner'] },
    { slug: 'mahalle-haritasi', name: 'Mahalle Haritası', summary: 'Mahalledeki ücretsiz hizmetleri (çeşme, kütüphane, park) gösteren açık veri haritası.', status: 'idea', owner: 'mert-demir', team: ['baris-oz'], looking: ['mentor', 'learner'] },
    { slug: 'erisilebilir-form', name: 'Erişilebilir Form', summary: 'Türkçe hata mesajlarıyla ekran okuyucu dostu form bileşenleri.', status: 'shipped', owner: 'selin-arslan', team: ['deniz-kaya'], looking: [] },
    { slug: 'cay-molasi', name: 'Çay Molası', summary: 'Uzaktan çalışanlar için rastgele eşleştirip 15 dakikalık sohbet ayarlayan bot.', status: 'building', owner: 'baris-oz', team: [], looking: ['learner'] },
  ];
  const projectIds = new Map<string, string>();
  for (const [i, p] of projects.entries()) {
    const id = crypto.randomUUID();
    projectIds.set(p.slug, id);
    await tx`INSERT INTO projects (id, slug, name, summary, status, looking_for, owner_id, created_at)
             VALUES (${id}, ${p.slug}, ${p.name}, ${p.summary}, ${p.status}, ${tx.json(p.looking)}, ${u(p.owner)}, ${at(24 * (20 - i * 3))})`;
    for (const member of [p.owner, ...p.team]) await tx`INSERT INTO project_members (project_id, user_id) VALUES (${id}, ${u(member)})`;
  }

  const posts: { key: string; by: string; body: string; hours: number; project?: string; parent?: string; quote?: string }[] = [
    { key: 'p1', by: 'mert-demir', hours: 30, project: 'mahalle-haritasi', body: 'Mahalle Haritası için ilk veri kümesini topladık: 214 çeşme, 38 kütüphane. #açıkveri #harita\nPostGIS bilen biri göz atabilir mi @baris-oz?' },
    { key: 'p2', by: 'ece-yildiz', hours: 20, body: 'İlk pull request\'im birleştirildi! İmece Takvim\'e Türkçe tarih biçimi ekledim. Korkulacak bir şey yokmuş. #ilkkatkı' },
    { key: 'p3', by: 'selin-arslan', hours: 8, project: 'erisilebilir-form', body: 'Erişilebilir Form 1.0 yayında. Hata mesajları artık ekran okuyucuda doğru sırayla okunuyor. #erişilebilirlik' },
    { key: 'p4', by: 'baris-oz', hours: 5, body: 'Cloudflare Workers\'ta Postgres bağlantısı için Hyperdrive kullanıyoruz; istek başına bağlantı açıp kapatmak şaşırtıcı derecede hızlı.' },
    { key: 'p5', by: 'deniz-kaya', hours: 2, body: 'Perşembe yayınında React ile erişilebilir modal yazacağız. Sorularınızı buraya bırakın. #canlıyayın' },
    { key: 'r1', by: 'baris-oz', hours: 28, parent: 'p1', body: 'Bakarım. Çeşmeler için nokta, parklar için alan geometrisi tutalım derim.' },
    { key: 'r2', by: 'mert-demir', hours: 27, parent: 'r1', body: 'Mantıklı, şemayı bu akşam güncelliyorum.' },
    { key: 'r3', by: 'deniz-kaya', hours: 19, parent: 'p2', body: 'Tebrikler Ece! Sıradaki iş için etiketli bir konu bırakıyorum.' },
    { key: 'q1', by: 'deniz-kaya', hours: 7, quote: 'p3', body: 'Bunu her projede kullanacağım.' },
  ];
  const postIds = new Map<string, string>();
  for (const p of posts) {
    const id = crypto.randomUUID();
    postIds.set(p.key, id);
    const parent = p.parent ? postIds.get(p.parent)! : null;
    const root = p.parent ? (posts.find((x) => x.key === p.parent)!.parent ? postIds.get(posts.find((x) => x.key === p.parent)!.parent!)! : parent) : null;
    await tx`INSERT INTO posts (id, user_id, project_id, parent_id, root_id, quote_id, body, created_at)
             VALUES (${id}, ${u(p.by)}, ${p.project ? projectIds.get(p.project)! : null}, ${parent}, ${root}, ${p.quote ? postIds.get(p.quote)! : null},
                     ${p.body}, ${at(p.hours)})`;
    for (const [, tag] of p.body.matchAll(/(?:^|\s)#([\p{L}\p{N}_]{2,40})/gu)) {
      await tx`INSERT INTO post_tags (post_id, tag, created_at) VALUES (${id}, ${tag!.toLocaleLowerCase('tr')}, ${at(p.hours)}) ON CONFLICT DO NOTHING`;
    }
  }
  const claps: [string, string[]][] = [['p1', ['ece-yildiz', 'selin-arslan', 'baris-oz']], ['p2', ['deniz-kaya', 'mert-demir', 'selin-arslan', 'baris-oz']], ['p3', ['deniz-kaya', 'ece-yildiz']], ['p5', ['ece-yildiz']]];
  for (const [key, who] of claps) for (const h of who) await tx`INSERT INTO claps (post_id, user_id) VALUES (${postIds.get(key)!}, ${u(h)})`;
  await tx`INSERT INTO reposts (post_id, user_id) VALUES (${postIds.get('p3')!}, ${u('baris-oz')})`;
  for (const [a, b] of [['ece-yildiz', 'deniz-kaya'], ['deniz-kaya', 'selin-arslan'], ['mert-demir', 'baris-oz'], ['baris-oz', 'mert-demir']]) {
    await tx`INSERT INTO follows (follower_id, followee_id) VALUES (${u(a!)}, ${u(b!)})`;
  }

  const links = [
    { by: 'deniz-kaya', url: 'https://www.a11yproject.com/checklist/', title: 'A11Y Project kontrol listesi', description: 'Erişilebilirlik için adım adım denetim listesi.', category: 'learning', tags: ['erişilebilirlik'], votes: ['ece-yildiz', 'selin-arslan'] },
    { by: 'baris-oz', url: 'https://www.postgresql.org/docs/current/', title: 'PostgreSQL belgeleri', description: 'Resmi belgeler; özellikle dizinler ve EXPLAIN bölümü.', category: 'learning', tags: ['postgres'], votes: ['mert-demir'] },
    { by: 'selin-arslan', url: 'https://www.figma.com/community', title: 'Figma topluluk dosyaları', description: 'Açık lisanslı tasarım kitleri ve bileşenler.', category: 'design', tags: ['figma', 'ux'], votes: [] },
    { by: 'mert-demir', url: 'https://www.openstreetmap.org/', title: 'OpenStreetMap', description: 'Açık harita verisi; Mahalle Haritası buradan besleniyor.', category: 'tool', tags: ['harita', 'açıkveri'], votes: ['baris-oz', 'deniz-kaya', 'ece-yildiz'] },
  ];
  for (const [i, l] of links.entries()) {
    const id = crypto.randomUUID();
    const hash = new Bun.CryptoHasher('sha256').update(canonicalUrl(l.url)).digest('hex');
    await tx`INSERT INTO links (id, user_id, url, url_hash, title, description, category, tags, created_at)
             VALUES (${id}, ${u(l.by)}, ${l.url}, ${hash}, ${l.title}, ${l.description}, ${l.category}, ${tx.json(l.tags)}, ${at(24 * (6 - i))})`;
    for (const h of l.votes) await tx`INSERT INTO link_votes (link_id, user_id) VALUES (${id}, ${u(h)})`;
  }
});

console.log(`seed: ${people.length} üye, örnek projeler, gönderiler ve bağlantılar yazıldı`);
await sql.end();
