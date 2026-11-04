-- name: linksByIds
SELECT l.id, l.url, l.title, l.description, l.image, l.site_name, l.category, l.tags, l.status, l.created_at, l.user_id,
  u.handle AS author_handle, u.name AS author_name, u.roles AS author_roles,
  (SELECT count(*) FROM link_votes v WHERE v.link_id = l.id)::int AS votes,
  EXISTS (SELECT 1 FROM link_votes v WHERE v.link_id = l.id AND v.user_id = $2::uuid) AS voted
FROM links l JOIN users u ON u.id = l.user_id
WHERE l.id IN (SELECT jsonb_array_elements_text($1::text::jsonb)::uuid)

-- `$1` imleç, `$2` kategori, `$3` sadeleştirilmiş arama, `$4` etiket, `$5` sayfa boyu.
-- name: linksNew
SELECT l.id, l.created_at FROM links l JOIN users u ON u.id = l.user_id
WHERE l.status = 'visible' AND u.banned_at IS NULL AND l.created_at < $1::timestamptz
  AND ($2::text IS NULL OR l.category = $2::text)
  AND ($3::text IS NULL
       OR lower(replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(l.title || ' ' || l.description || ' ' || l.url, 'İ', 'i'), 'I', 'i'), 'ı', 'i'), 'Ş', 's'), 'ş', 's'), 'Ğ', 'g'), 'ğ', 'g'), 'Ü', 'u'), 'ü', 'u'), 'Ö', 'o'), 'ö', 'o'), 'Ç', 'c'), 'ç', 'c')) LIKE '%' || $3::text || '%')
  AND ($4::text IS NULL OR l.tags ? $4::text)
ORDER BY l.created_at DESC
LIMIT $5::int

-- Öne çıkan bağlantılar için aday küme (oy ve yaşla uygulamada sıralanır).
-- name: linkCandidates
SELECT l.id, l.created_at, l.user_id,
  (SELECT count(*) FROM link_votes v WHERE v.link_id = l.id AND v.user_id <> l.user_id)::int AS votes,
  (SELECT count(*) FROM reports rr WHERE rr.target_kind = 'link' AND rr.target_id = l.id AND rr.resolved_at IS NULL)::int AS reports
FROM links l JOIN users u ON u.id = l.user_id
WHERE l.status = 'visible' AND u.banned_at IS NULL
  AND ($1::text IS NULL OR l.category = $1::text)
  AND ($2::text IS NULL
       OR lower(replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(l.title || ' ' || l.description || ' ' || l.url, 'İ', 'i'), 'I', 'i'), 'ı', 'i'), 'Ş', 's'), 'ş', 's'), 'Ğ', 'g'), 'ğ', 'g'), 'Ü', 'u'), 'ü', 'u'), 'Ö', 'o'), 'ö', 'o'), 'Ç', 'c'), 'ç', 'c')) LIKE '%' || $2::text || '%')
  AND ($3::text IS NULL OR l.tags ? $3::text)
ORDER BY l.created_at DESC
LIMIT $4::int

-- name: linkByHash
SELECT id FROM links WHERE url_hash = $1::text

-- name: linkMeta
SELECT id, user_id, status FROM links WHERE id = $1::uuid

-- name: linkInsert
INSERT INTO links (id, user_id, url, url_hash, title, description, image, site_name, category, tags)
VALUES ($1::uuid, $2::uuid, $3::text, $4::text, $5::text, $6::text, $7::text, $8::text, $9::text, $10::text::jsonb)
RETURNING id

-- name: linkDelete
DELETE FROM links WHERE id = $1::uuid RETURNING id

-- name: linkSetStatus
UPDATE links SET status = $2::text WHERE id = $1::uuid RETURNING id

-- name: linkVote
INSERT INTO link_votes (link_id, user_id) VALUES ($1::uuid, $2::uuid) ON CONFLICT DO NOTHING RETURNING link_id

-- name: linkUnvote
DELETE FROM link_votes WHERE link_id = $1::uuid AND user_id = $2::uuid

-- name: linkTags
SELECT tag, count(*)::int AS links FROM links l, jsonb_array_elements_text(l.tags) AS tag
WHERE l.status = 'visible'
GROUP BY tag ORDER BY links DESC, tag LIMIT $1::int
