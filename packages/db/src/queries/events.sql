-- name: eventsBetween
SELECT * FROM events WHERE ends_at > $1::timestamptz AND starts_at <= $2::timestamptz ORDER BY starts_at

-- name: eventExists
SELECT 1 AS found FROM events WHERE id = $1::text

-- name: eventInsert
INSERT INTO events (id, kind, title, description, starts_at, ends_at, url)
VALUES ($1::text, $2::text, $3::text, $4::text, $5::timestamptz, $6::timestamptz, $7::text)

-- name: eventDelete
DELETE FROM events WHERE id = $1::text

-- name: rsvpCounts
SELECT r.event_id, count(*)::int AS going, (count(*) FILTER (WHERE r.user_id = $2::uuid) > 0) AS me
FROM rsvps r
WHERE r.event_id IN (SELECT jsonb_array_elements_text($1::text::jsonb))
GROUP BY r.event_id

-- name: rsvpAdd
INSERT INTO rsvps (event_id, user_id) VALUES ($1::text, $2::uuid) ON CONFLICT DO NOTHING

-- name: rsvpRemove
DELETE FROM rsvps WHERE event_id = $1::text AND user_id = $2::uuid

-- name: rsvpCount
SELECT count(*)::int AS events FROM rsvps WHERE user_id = $1::uuid
