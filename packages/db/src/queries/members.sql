-- name: memberById
SELECT * FROM users WHERE id = $1::uuid

-- name: memberByHandle
SELECT * FROM users WHERE handle = $1::text

-- name: memberHandleTaken
SELECT 1 AS taken FROM users WHERE handle = $1::text AND id <> $2::uuid

-- name: memberSetHandle
UPDATE users SET handle = $2::text, locale = $3::text, updated_at = now() WHERE id = $1::uuid AND handle IS NULL RETURNING id

-- name: memberUpdate
UPDATE users SET
  name = $2::text,
  handle = $3::text,
  bio = $4::text,
  roles = $5::text::jsonb,
  interests = $6::text::jsonb,
  github = $7::text,
  website = $8::text,
  location = $9::text,
  updated_at = now()
WHERE id = $1::uuid
RETURNING *

-- name: memberStats
SELECT
  (SELECT count(*) FROM posts p WHERE p.user_id = $1::uuid AND p.parent_id IS NULL AND p.status = 'visible')::int AS posts,
  (SELECT count(*) FROM project_members m WHERE m.user_id = $1::uuid)::int AS projects,
  (SELECT count(*) FROM claps c JOIN posts p ON p.id = c.post_id WHERE p.user_id = $1::uuid)::int AS claps,
  (SELECT count(*) FROM follows f WHERE f.followee_id = $1::uuid)::int AS followers,
  (SELECT count(*) FROM follows f WHERE f.follower_id = $1::uuid)::int AS following,
  EXISTS (SELECT 1 FROM follows f WHERE f.follower_id = $2::uuid AND f.followee_id = $1::uuid) AS followed

-- name: memberRaiseTrust
UPDATE users SET trust = 1
WHERE id = $1::uuid AND trust = 0 AND created_at < $2::timestamptz
  AND (SELECT count(*) FROM posts p WHERE p.user_id = $1::uuid AND p.status = 'visible') >= 3
RETURNING trust

-- name: memberSetRole
UPDATE users SET role = $2::text, trust = greatest(trust, $3::smallint), updated_at = now() WHERE id = $1::uuid RETURNING id

-- name: memberBan
UPDATE users SET banned_at = now(), updated_at = now() WHERE id = $1::uuid RETURNING id

-- name: memberUnban
UPDATE users SET banned_at = NULL, updated_at = now() WHERE id = $1::uuid RETURNING id

-- name: memberDeleteSessions
DELETE FROM session WHERE user_id = $1::uuid

-- name: memberHidePosts
UPDATE posts SET status = 'hidden' WHERE user_id = $1::uuid AND status = 'visible'

-- name: memberHideLinks
UPDATE links SET status = 'hidden' WHERE user_id = $1::uuid AND status = 'visible'

-- name: memberRestorePosts
UPDATE posts SET status = 'visible' WHERE user_id = $1::uuid AND status = 'hidden'

-- name: memberRestoreLinks
UPDATE links SET status = 'visible' WHERE user_id = $1::uuid AND status = 'hidden'

-- name: memberMediaKeys
SELECT key FROM post_media WHERE user_id = $1::uuid

-- name: memberDelete
DELETE FROM users WHERE id = $1::uuid RETURNING id

-- name: follow
INSERT INTO follows (follower_id, followee_id) VALUES ($1::uuid, $2::uuid) ON CONFLICT DO NOTHING RETURNING follower_id

-- name: unfollow
DELETE FROM follows WHERE follower_id = $1::uuid AND followee_id = $2::uuid
