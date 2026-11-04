-- name: reportInsert
INSERT INTO reports (id, reporter_id, target_kind, target_id, reason, note)
VALUES ($1::uuid, $2::uuid, $3::text, $4::uuid, $5::text, $6::text)
ON CONFLICT DO NOTHING
RETURNING id

-- Kendiliğinden gizleme eşiği için: çözülmemiş şikâyetlerde farklı şikâyetçi sayısı ve güvenilir olanlar.
-- name: reportTally
SELECT count(*)::int AS reporters, count(*) FILTER (WHERE u.trust >= 1 OR u.role <> 'member')::int AS trusted
FROM reports r JOIN users u ON u.id = r.reporter_id
WHERE r.target_kind = $1::text AND r.target_id = $2::uuid AND r.resolved_at IS NULL

-- Moderatör kuyruğu: içerik başına bir satır, en çok şikâyet alan önce.
-- name: reportQueue
SELECT r.target_kind, r.target_id, count(*)::int AS reports, min(r.created_at) AS first_at, max(r.created_at) AS last_at,
  jsonb_agg(DISTINCT r.reason) AS reasons
FROM reports r
WHERE r.resolved_at IS NULL
GROUP BY r.target_kind, r.target_id
ORDER BY reports DESC, last_at DESC
LIMIT $1::int

-- name: reportResolve
UPDATE reports SET resolved_at = now(), resolution = $3::text
WHERE target_kind = $1::text AND target_id = $2::uuid AND resolved_at IS NULL

-- name: moderationLogInsert
INSERT INTO moderation_log (id, actor_id, target_kind, target_id, action, reason)
VALUES ($1::uuid, $2::uuid, $3::text, $4::uuid, $5::text, $6::text)

-- name: moderationLogList
SELECT l.id, l.target_kind, l.target_id, l.action, l.reason, l.created_at, a.handle AS actor_handle
FROM moderation_log l LEFT JOIN users a ON a.id = l.actor_id
ORDER BY l.created_at DESC
LIMIT $1::int
