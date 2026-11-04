-- Akış sorguları iki adımlıdır: liste sorgusu yalnız kimlik (ve sıralama için gerekenleri) döndürür, `postsByIds` o kimlikleri
-- tam gönderiye çevirir. Böylece gönderinin biçimi tek yerde tanımlı kalır. `$2` izleyen üye (girişsizse NULL).

-- name: postsByIds
SELECT p.id, p.body, p.created_at, p.parent_id, p.root_id, p.status, p.user_id, p.link_url,
  u.handle AS author_handle, u.name AS author_name, u.roles AS author_roles,
  pr.slug AS project_slug, pr.name AS project_name,
  pu.handle AS parent_handle,
  (SELECT count(*) FROM claps c WHERE c.post_id = p.id)::int AS claps,
  (SELECT count(*) FROM posts r WHERE r.parent_id = p.id AND r.status = 'visible')::int AS replies,
  (SELECT count(*) FROM reposts rp WHERE rp.post_id = p.id)::int AS reposts,
  (SELECT count(*) FROM posts q WHERE q.quote_id = p.id AND q.status = 'visible')::int AS quotes,
  EXISTS (SELECT 1 FROM claps c WHERE c.post_id = p.id AND c.user_id = $2::uuid) AS clapped,
  EXISTS (SELECT 1 FROM reposts rp WHERE rp.post_id = p.id AND rp.user_id = $2::uuid) AS reposted,
  EXISTS (SELECT 1 FROM bookmarks b WHERE b.post_id = p.id AND b.user_id = $2::uuid) AS bookmarked,
  (SELECT jsonb_agg(jsonb_build_object('id', m.id, 'key', m.key, 'width', m.width, 'height', m.height, 'alt', m.alt) ORDER BY m.position)
     FROM post_media m WHERE m.post_id = p.id) AS media,
  (SELECT jsonb_build_object('url', lp.url, 'title', lp.title, 'description', lp.description, 'image', lp.image, 'siteName', lp.site_name)
     FROM link_previews lp WHERE lp.hash = p.link_hash AND lp.ok) AS preview,
  (SELECT jsonb_build_object('id', q.id, 'body', q.body, 'createdAt', q.created_at, 'status', q.status,
            'handle', qu.handle, 'name', qu.name, 'roles', qu.roles,
            'media', (SELECT jsonb_agg(jsonb_build_object('id', m.id, 'key', m.key, 'width', m.width, 'height', m.height, 'alt', m.alt) ORDER BY m.position)
                        FROM post_media m WHERE m.post_id = q.id))
     FROM posts q JOIN users qu ON qu.id = q.user_id WHERE q.id = p.quote_id) AS quote
FROM posts p
JOIN users u ON u.id = p.user_id
LEFT JOIN projects pr ON pr.id = p.project_id
LEFT JOIN posts pp ON pp.id = p.parent_id
LEFT JOIN users pu ON pu.id = pp.user_id
WHERE p.id IN (SELECT jsonb_array_elements_text($1::text::jsonb)::uuid)

-- Zaman sırası: ana gönderiler, isteğe bağlı süzgeçlerle. `$1` imleç (bu andan eskiler), `$2` etiket, `$3` proje kısa adı,
-- `$4` yazar kullanıcı adı, `$5` yalnız projeye bağlılar, `$6` sadeleştirilmiş arama metni, `$7` sayfa boyu.
-- Etiket ya da arama varken yanıtlar da gelir: konuşmanın içinde geçen etiket de bulunur.
-- name: feedLatest
SELECT p.id, p.created_at
FROM posts p
JOIN users u ON u.id = p.user_id
LEFT JOIN projects pr ON pr.id = p.project_id
WHERE (p.parent_id IS NULL OR $2::text IS NOT NULL OR $6::text IS NOT NULL) AND p.status = 'visible' AND u.banned_at IS NULL
  AND p.created_at < $1::timestamptz
  AND ($2::text IS NULL OR EXISTS (SELECT 1 FROM post_tags t WHERE t.post_id = p.id AND t.tag = $2::text))
  AND ($3::text IS NULL OR pr.slug = $3::text)
  AND ($4::text IS NULL OR u.handle = $4::text)
  AND ($5::boolean IS NOT TRUE OR p.project_id IS NOT NULL)
  AND ($6::text IS NULL OR lower(replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(p.body, 'İ', 'i'), 'I', 'i'), 'ı', 'i'), 'Ş', 's'), 'ş', 's'), 'Ğ', 'g'), 'ğ', 'g'), 'Ü', 'u'), 'ü', 'u'), 'Ö', 'o'), 'ö', 'o'), 'Ç', 'c'), 'ç', 'c')) LIKE '%' || $6::text || '%')
ORDER BY p.created_at DESC
LIMIT $7::int

-- Takip: takip edilenlerin ve kendi gönderilerin, artı takip edilenlerin yeniden paylaştıkları. `sort_at` paylaşım anı.
-- name: feedFollowing
SELECT x.id, x.sort_at, x.repost_handle, x.repost_name FROM (
  SELECT p.id, p.created_at AS sort_at, NULL::text AS repost_handle, NULL::text AS repost_name
  FROM posts p
  WHERE p.parent_id IS NULL AND p.status = 'visible'
    AND (p.user_id = $1::uuid OR p.user_id IN (SELECT f.followee_id FROM follows f WHERE f.follower_id = $1::uuid))
    AND p.created_at < $2::timestamptz
  UNION ALL
  SELECT rp.post_id AS id, rp.created_at AS sort_at, ru.handle AS repost_handle, ru.name AS repost_name
  FROM reposts rp
  JOIN users ru ON ru.id = rp.user_id
  JOIN posts p ON p.id = rp.post_id
  WHERE rp.user_id IN (SELECT f.followee_id FROM follows f WHERE f.follower_id = $1::uuid)
    AND p.status = 'visible' AND rp.created_at < $2::timestamptz
) x
ORDER BY x.sort_at DESC
LIMIT $3::int

-- Öne çıkanlar için aday küme: son günlerin görünür ana gönderileri, puanlama için gereken sayılarla. Puan uygulamada hesaplanır.
-- name: feedCandidates
SELECT p.id, p.user_id, p.created_at,
  (p.project_id IS NOT NULL) AS in_project,
  (p.link_hash IS NOT NULL OR EXISTS (SELECT 1 FROM post_media m WHERE m.post_id = p.id)) AS rich,
  u.trust AS author_trust,
  (SELECT count(*) FROM claps c WHERE c.post_id = p.id AND c.user_id <> p.user_id)::int AS claps,
  (SELECT count(DISTINCT r.user_id) FROM posts r WHERE r.parent_id = p.id AND r.status = 'visible' AND r.user_id <> p.user_id)::int AS repliers,
  (SELECT count(*) FROM reposts rp WHERE rp.post_id = p.id AND rp.user_id <> p.user_id)::int AS reposts,
  (SELECT count(*) FROM posts q WHERE q.quote_id = p.id AND q.status = 'visible' AND q.user_id <> p.user_id)::int AS quotes,
  (SELECT count(*) FROM bookmarks b WHERE b.post_id = p.id AND b.user_id <> p.user_id)::int AS bookmarks,
  (SELECT count(*) FROM reports rr WHERE rr.target_kind = 'post' AND rr.target_id = p.id AND rr.resolved_at IS NULL)::int AS reports,
  EXISTS (SELECT 1 FROM follows f WHERE f.follower_id = $1::uuid AND f.followee_id = p.user_id) AS followed,
  EXISTS (SELECT 1 FROM project_members pm WHERE pm.project_id = p.project_id AND pm.user_id = $1::uuid) AS my_project
FROM posts p
JOIN users u ON u.id = p.user_id
WHERE p.parent_id IS NULL AND p.status = 'visible' AND u.banned_at IS NULL
  AND p.created_at > $2::timestamptz AND p.created_at <= $3::timestamptz
ORDER BY p.created_at DESC
LIMIT $4::int

-- name: postReplies
SELECT p.id FROM posts p JOIN users u ON u.id = p.user_id
WHERE p.parent_id = $1::uuid AND (p.status = 'visible' OR p.user_id = $2::uuid) AND u.banned_at IS NULL
ORDER BY p.created_at ASC
LIMIT 200

-- Üst zincir: yanıtlanan gönderiden köke doğru (en çok 20 adım). `depth` 1 en yakın üst.
-- name: postAncestors
WITH RECURSIVE chain AS (
  SELECT p.id, p.parent_id, 0 AS depth FROM posts p WHERE p.id = $1::uuid
  UNION ALL
  SELECT pp.id, pp.parent_id, chain.depth + 1 AS depth FROM posts pp JOIN chain ON pp.id = chain.parent_id WHERE chain.depth < 20
)
SELECT chain.id, chain.depth FROM chain WHERE chain.depth > 0 ORDER BY chain.depth DESC

-- name: postMeta
SELECT p.id, p.user_id, p.parent_id, p.root_id, p.project_id, p.status FROM posts p WHERE p.id = $1::uuid

-- name: postInsert
INSERT INTO posts (id, user_id, project_id, parent_id, root_id, quote_id, body, link_url, link_hash)
VALUES ($1::uuid, $2::uuid, $3::uuid, $4::uuid, $5::uuid, $6::uuid, $7::text, $8::text, $9::text)
RETURNING id

-- name: postDuplicate
SELECT 1 AS dup FROM posts WHERE user_id = $1::uuid AND body = $2::text AND created_at > $3::timestamptz LIMIT 1

-- name: postSetStatus
UPDATE posts SET status = $2::text WHERE id = $1::uuid RETURNING id

-- name: postMediaKeys
SELECT m.key FROM post_media m WHERE m.post_id = $1::uuid
   OR m.post_id IN (SELECT r.id FROM posts r WHERE r.root_id = $1::uuid OR r.parent_id = $1::uuid)

-- name: postDelete
DELETE FROM posts WHERE id = $1::uuid RETURNING id

-- name: postTagInsert
INSERT INTO post_tags (post_id, tag) VALUES ($1::uuid, $2::text) ON CONFLICT DO NOTHING

-- name: postMentionInsert
INSERT INTO post_mentions (post_id, user_id)
SELECT $1::uuid, u.id FROM users u WHERE u.handle = $2::text AND u.banned_at IS NULL
ON CONFLICT DO NOTHING
RETURNING user_id

-- name: clap
INSERT INTO claps (post_id, user_id) VALUES ($1::uuid, $2::uuid) ON CONFLICT DO NOTHING RETURNING post_id

-- name: unclap
DELETE FROM claps WHERE post_id = $1::uuid AND user_id = $2::uuid

-- name: repost
INSERT INTO reposts (post_id, user_id) VALUES ($1::uuid, $2::uuid) ON CONFLICT DO NOTHING RETURNING post_id

-- name: unrepost
DELETE FROM reposts WHERE post_id = $1::uuid AND user_id = $2::uuid

-- name: bookmark
INSERT INTO bookmarks (user_id, post_id) VALUES ($2::uuid, $1::uuid) ON CONFLICT DO NOTHING RETURNING post_id

-- name: unbookmark
DELETE FROM bookmarks WHERE post_id = $1::uuid AND user_id = $2::uuid

-- name: bookmarksOf
SELECT b.post_id AS id, b.created_at FROM bookmarks b JOIN posts p ON p.id = b.post_id
WHERE b.user_id = $1::uuid AND b.created_at < $2::timestamptz AND p.status = 'visible'
ORDER BY b.created_at DESC
LIMIT $3::int

-- Gündem: son günlerde en çok farklı kişinin kullandığı etiketler.
-- name: trendingTags
SELECT t.tag, count(DISTINCT p.user_id)::int AS people, count(*)::int AS posts
FROM post_tags t JOIN posts p ON p.id = t.post_id
WHERE t.created_at > $1::timestamptz AND p.status = 'visible'
GROUP BY t.tag
ORDER BY people DESC, posts DESC, t.tag
LIMIT $2::int

-- name: mediaInsert
INSERT INTO post_media (id, user_id, key, mime, bytes, width, height, alt)
VALUES ($1::uuid, $2::uuid, $3::text, $4::text, $5::int, $6::int, $7::int, $8::text)
RETURNING id

-- name: mediaAttach
UPDATE post_media SET post_id = $1::uuid, position = $4::smallint
WHERE id = $2::uuid AND user_id = $3::uuid AND post_id IS NULL
RETURNING id

-- name: mediaByKey
SELECT m.key, m.mime, m.post_id, p.status FROM post_media m LEFT JOIN posts p ON p.id = m.post_id WHERE m.key = $1::text

-- name: mediaOrphans
SELECT m.id, m.key FROM post_media m WHERE m.post_id IS NULL AND m.created_at < $1::timestamptz LIMIT 200

-- name: mediaDelete
DELETE FROM post_media WHERE id = $1::uuid

-- name: previewByHash
SELECT * FROM link_previews WHERE hash = $1::text

-- name: previewUpsert
INSERT INTO link_previews (hash, url, title, description, image, site_name, ok, fetched_at)
VALUES ($1::text, $2::text, $3::text, $4::text, $5::text, $6::text, $7::boolean, now())
ON CONFLICT (hash) DO UPDATE SET url = excluded.url, title = excluded.title, description = excluded.description,
  image = excluded.image, site_name = excluded.site_name, ok = excluded.ok, fetched_at = excluded.fetched_at
