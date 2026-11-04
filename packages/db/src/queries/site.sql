-- Site formları, bülten ve çerezsiz analitik.

-- name: submissionInsert
INSERT INTO submissions (id, form, name, email, message) VALUES ($1::uuid, $2::text, $3::text, $4::text, $5::text)

-- name: submissionList
SELECT * FROM submissions WHERE ($1::text IS NULL OR form = $1::text) ORDER BY created_at DESC LIMIT 200

-- name: subscriberUpsert
INSERT INTO subscribers (email, locale, token) VALUES ($1::text, $2::text, $3::text)
ON CONFLICT (email) DO UPDATE SET locale = excluded.locale, unsubscribed_at = NULL
RETURNING token, confirmed_at

-- name: subscriberConfirm
UPDATE subscribers SET confirmed_at = coalesce(confirmed_at, now()), unsubscribed_at = NULL WHERE token = $1::text RETURNING locale

-- name: subscriberUnsubscribe
UPDATE subscribers SET unsubscribed_at = now() WHERE token = $1::text RETURNING locale

-- name: subscriberList
SELECT email, locale, created_at, confirmed_at FROM subscribers
WHERE confirmed_at IS NOT NULL AND unsubscribed_at IS NULL ORDER BY created_at

-- name: hitInsert
INSERT INTO hits (day, path, event, referrer, count) VALUES ($1::date, $2::text, $3::text, $4::text, 1)
ON CONFLICT (day, path, event, referrer) DO UPDATE SET count = hits.count + 1

-- name: hitsDaily
SELECT day::text AS day, sum(count)::int AS views FROM hits WHERE day >= $1::date AND event = 'pageview' GROUP BY day ORDER BY day

-- name: hitsPages
SELECT path, sum(count)::int AS views FROM hits WHERE day >= $1::date AND event = 'pageview' GROUP BY path ORDER BY views DESC LIMIT 50

-- name: hitsEvents
SELECT event, sum(count)::int AS count FROM hits WHERE day >= $1::date AND event <> 'pageview' GROUP BY event ORDER BY count DESC

-- name: hitsReferrers
SELECT referrer, sum(count)::int AS views FROM hits WHERE day >= $1::date AND referrer <> '' GROUP BY referrer ORDER BY views DESC LIMIT 30

-- Sabit pencereli sayaç; dönen sayı sınırı aşarsa istek reddedilir.
-- name: rateHit
INSERT INTO api_rate_limits (key, window_start, count) VALUES ($1::text, $2::bigint, 1)
ON CONFLICT (key, window_start) DO UPDATE SET count = api_rate_limits.count + 1
RETURNING count

-- name: ratePrune
DELETE FROM api_rate_limits WHERE window_start < $1::bigint

-- name: devMailInsert
INSERT INTO dev_mailbox (id, email, subject, body) VALUES ($1::uuid, $2::text, $3::text, $4::text)

-- name: devMailLatest
SELECT body, created_at FROM dev_mailbox WHERE email = $1::text ORDER BY created_at DESC LIMIT 1

-- Site haritası: herkese açık, dizine girmesi istenen içerik.
-- name: sitemapPosts
SELECT p.id, p.created_at FROM posts p JOIN users u ON u.id = p.user_id
WHERE p.parent_id IS NULL AND p.status = 'visible' AND u.banned_at IS NULL
ORDER BY p.created_at DESC LIMIT $1::int

-- name: sitemapProjects
SELECT p.slug, p.created_at FROM projects p JOIN users u ON u.id = p.owner_id WHERE u.banned_at IS NULL ORDER BY p.created_at DESC LIMIT $1::int

-- name: sitemapLinks
SELECT l.id, l.created_at FROM links l JOIN users u ON u.id = l.user_id
WHERE l.status = 'visible' AND u.banned_at IS NULL ORDER BY l.created_at DESC LIMIT $1::int

-- name: sitemapTags
SELECT t.tag, max(t.created_at) AS created_at FROM post_tags t JOIN posts p ON p.id = t.post_id
WHERE p.status = 'visible' GROUP BY t.tag ORDER BY created_at DESC LIMIT $1::int

-- Özellik eşiklerinin saydığı üyeler: e-postası doğrulanmış, uzaklaştırılmamış hesaplar.

-- name: memberCount
SELECT count(*)::int AS members FROM users WHERE email_verified AND banned_at IS NULL

-- name: featureUnlockList
SELECT feature FROM feature_unlocks

-- name: featureUnlockInsert
INSERT INTO feature_unlocks (feature) VALUES ($1::text) ON CONFLICT (feature) DO NOTHING
