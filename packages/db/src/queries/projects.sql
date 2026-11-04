-- Proje listesi: süzgeçler isteğe bağlı parametrelerdir. `$1` izleyen üye, `$2` imleç, `$3` durum, `$4` aranan rol (jsonb dizide),
-- `$5` sadeleştirilmiş arama metni, `$6` ekipte olması gereken üyenin kullanıcı adı, `$7` sayfa boyu.
-- name: projectList
SELECT p.id, p.slug, p.name, p.summary, p.status, p.repo_url, p.looking_for, p.created_at,
  u.handle AS owner_handle, u.name AS owner_name, u.roles AS owner_roles,
  (SELECT count(*) FROM project_members m WHERE m.project_id = p.id)::int AS members,
  (SELECT count(*) FROM posts po WHERE po.project_id = p.id AND po.status = 'visible')::int AS posts,
  EXISTS (SELECT 1 FROM project_members m WHERE m.project_id = p.id AND m.user_id = $1::uuid) AS me
FROM projects p JOIN users u ON u.id = p.owner_id
WHERE u.banned_at IS NULL
  AND p.created_at < $2::timestamptz
  AND ($3::text IS NULL OR p.status = $3::text)
  AND ($4::text IS NULL OR p.looking_for ? $4::text)
  AND ($5::text IS NULL
       OR lower(replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(p.name, 'İ', 'i'), 'I', 'i'), 'ı', 'i'), 'Ş', 's'), 'ş', 's'), 'Ğ', 'g'), 'ğ', 'g'), 'Ü', 'u'), 'ü', 'u'), 'Ö', 'o'), 'ö', 'o'), 'Ç', 'c'), 'ç', 'c')) LIKE '%' || $5::text || '%'
       OR lower(replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(p.summary, 'İ', 'i'), 'I', 'i'), 'ı', 'i'), 'Ş', 's'), 'ş', 's'), 'Ğ', 'g'), 'ğ', 'g'), 'Ü', 'u'), 'ü', 'u'), 'Ö', 'o'), 'ö', 'o'), 'Ç', 'c'), 'ç', 'c')) LIKE '%' || $5::text || '%')
  AND ($6::text IS NULL OR EXISTS (SELECT 1 FROM project_members m JOIN users mu ON mu.id = m.user_id
                                   WHERE m.project_id = p.id AND mu.handle = $6::text))
ORDER BY p.created_at DESC
LIMIT $7::int

-- name: projectBySlug
SELECT p.id, p.slug, p.name, p.summary, p.status, p.repo_url, p.looking_for, p.created_at, p.owner_id,
  u.handle AS owner_handle, u.name AS owner_name, u.roles AS owner_roles,
  (SELECT count(*) FROM project_members m WHERE m.project_id = p.id)::int AS members,
  (SELECT count(*) FROM posts po WHERE po.project_id = p.id AND po.status = 'visible')::int AS posts,
  EXISTS (SELECT 1 FROM project_members m WHERE m.project_id = p.id AND m.user_id = $2::uuid) AS me
FROM projects p JOIN users u ON u.id = p.owner_id
WHERE p.slug = $1::text

-- name: projectTeam
SELECT u.handle, u.name, u.roles FROM project_members m JOIN users u ON u.id = m.user_id
WHERE m.project_id = $1::uuid AND u.banned_at IS NULL
ORDER BY m.created_at

-- name: projectSlugTaken
SELECT 1 AS taken FROM projects WHERE slug = $1::text

-- name: projectInsert
INSERT INTO projects (id, slug, name, summary, repo_url, looking_for, owner_id)
VALUES ($1::uuid, $2::text, $3::text, $4::text, $5::text, $6::text::jsonb, $7::uuid)
RETURNING id

-- name: projectMemberAdd
INSERT INTO project_members (project_id, user_id) VALUES ($1::uuid, $2::uuid) ON CONFLICT DO NOTHING

-- name: projectMemberRemove
DELETE FROM project_members WHERE project_id = $1::uuid AND user_id = $2::uuid

-- name: projectIdBySlug
SELECT id, owner_id FROM projects WHERE slug = $1::text
