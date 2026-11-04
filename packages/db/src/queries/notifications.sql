-- name: notificationInsert
INSERT INTO notifications (id, user_id, actor_id, kind, post_id)
SELECT $1::uuid, $2::uuid, $3::uuid, $4::text, $5::uuid
WHERE NOT EXISTS (
  SELECT 1 FROM notifications n
  WHERE n.user_id = $2::uuid AND n.actor_id = $3::uuid AND n.kind = $4::text
    AND (n.post_id = $5::uuid OR (n.post_id IS NULL AND $5::uuid IS NULL))
)

-- name: notificationList
SELECT n.id, n.kind, n.post_id, n.created_at, n.read_at,
  a.handle AS actor_handle, a.name AS actor_name, a.roles AS actor_roles,
  p.body AS post_body
FROM notifications n
JOIN users a ON a.id = n.actor_id
LEFT JOIN posts p ON p.id = n.post_id
WHERE n.user_id = $1::uuid AND n.created_at < $2::timestamptz AND a.banned_at IS NULL
  AND (p.id IS NULL OR p.status = 'visible')
ORDER BY n.created_at DESC
LIMIT $3::int

-- name: notificationUnread
SELECT count(*)::int AS unread FROM notifications n JOIN users a ON a.id = n.actor_id
WHERE n.user_id = $1::uuid AND n.read_at IS NULL AND a.banned_at IS NULL

-- name: notificationReadAll
UPDATE notifications SET read_at = now() WHERE user_id = $1::uuid AND read_at IS NULL
