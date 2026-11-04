--up
-- Koina tabloları. Better Auth'un `users` tablosu profil sütunlarıyla genişler; diziler (roller, ilgi alanları, aranan roller,
-- etiketler) jsonb'dir çünkü sorgulara dizi değil JSON parametresi verilir.
ALTER TABLE users ADD COLUMN handle text;
ALTER TABLE users ADD COLUMN bio text NOT NULL DEFAULT '';
ALTER TABLE users ADD COLUMN roles jsonb NOT NULL DEFAULT '[]';
ALTER TABLE users ADD COLUMN interests jsonb NOT NULL DEFAULT '[]';
ALTER TABLE users ADD COLUMN github text;
ALTER TABLE users ADD COLUMN website text;
ALTER TABLE users ADD COLUMN location text;
ALTER TABLE users ADD COLUMN locale text NOT NULL DEFAULT 'tr';
-- Yetki: member (herkes), moderator (şikâyet kuyruğu), admin. Güven: 0 yeni hesap, 1 olağan, 2 güvenilir.
ALTER TABLE users ADD COLUMN role text NOT NULL DEFAULT 'member' CHECK (role IN ('member', 'moderator', 'admin'));
ALTER TABLE users ADD COLUMN trust smallint NOT NULL DEFAULT 0 CHECK (trust BETWEEN 0 AND 2);
ALTER TABLE users ADD COLUMN banned_at timestamptz;
CREATE UNIQUE INDEX users_handle_unique ON users (handle);

CREATE TABLE projects (
  id uuid PRIMARY KEY,
  slug text NOT NULL,
  name text NOT NULL,
  summary text NOT NULL,
  status text NOT NULL DEFAULT 'idea' CHECK (status IN ('idea', 'building', 'shipped')),
  repo_url text,
  looking_for jsonb NOT NULL DEFAULT '[]',
  owner_id uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT projects_slug_unique UNIQUE (slug)
);
CREATE INDEX projects_created ON projects (created_at);
CREATE INDEX projects_owner ON projects (owner_id);

CREATE TABLE project_members (
  project_id uuid NOT NULL REFERENCES projects (id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (project_id, user_id)
);
CREATE INDEX project_members_user ON project_members (user_id);

-- Gönderi: `parent_id` yanıtlanan, `root_id` konunun ilk gönderisi, `quote_id` alıntılanan. `link_url` gövdedeki ilk bağlantı,
-- `link_hash` onun önizleme kartının anahtarı. `status`: visible, hidden (şikâyet ya da denetim), removed (moderatör).
CREATE TABLE posts (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  project_id uuid REFERENCES projects (id) ON DELETE SET NULL,
  parent_id uuid REFERENCES posts (id) ON DELETE CASCADE,
  root_id uuid REFERENCES posts (id) ON DELETE CASCADE,
  quote_id uuid REFERENCES posts (id) ON DELETE SET NULL,
  body text NOT NULL,
  link_url text,
  link_hash text,
  status text NOT NULL DEFAULT 'visible' CHECK (status IN ('visible', 'hidden', 'removed')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX posts_created ON posts (created_at);
CREATE INDEX posts_user ON posts (user_id, created_at);
CREATE INDEX posts_parent ON posts (parent_id, created_at);
CREATE INDEX posts_root ON posts (root_id);
CREATE INDEX posts_quote ON posts (quote_id);
CREATE INDEX posts_project ON posts (project_id, created_at);

-- Görsel: önce yüklenir (`post_id` boş), gönderi oluşunca bağlanır. Bağlanmayanlar temizlik işinde silinir.
CREATE TABLE post_media (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  post_id uuid REFERENCES posts (id) ON DELETE CASCADE,
  key text NOT NULL,
  mime text NOT NULL,
  bytes integer NOT NULL,
  width integer NOT NULL,
  height integer NOT NULL,
  alt text NOT NULL DEFAULT '',
  position smallint NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT post_media_key_unique UNIQUE (key)
);
CREATE INDEX post_media_post ON post_media (post_id, position);
CREATE INDEX post_media_user ON post_media (user_id, created_at);

CREATE TABLE post_tags (
  post_id uuid NOT NULL REFERENCES posts (id) ON DELETE CASCADE,
  tag text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (post_id, tag)
);
CREATE INDEX post_tags_tag ON post_tags (tag, created_at);
CREATE INDEX post_tags_created ON post_tags (created_at);

CREATE TABLE post_mentions (
  post_id uuid NOT NULL REFERENCES posts (id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  PRIMARY KEY (post_id, user_id)
);

-- "Alkış": imece dilinde beğeni.
CREATE TABLE claps (
  post_id uuid NOT NULL REFERENCES posts (id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (post_id, user_id)
);
CREATE INDEX claps_user ON claps (user_id);

CREATE TABLE reposts (
  post_id uuid NOT NULL REFERENCES posts (id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (post_id, user_id)
);
CREATE INDEX reposts_user ON reposts (user_id, created_at);

CREATE TABLE bookmarks (
  user_id uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  post_id uuid NOT NULL REFERENCES posts (id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, post_id)
);
CREATE INDEX bookmarks_post ON bookmarks (post_id);
CREATE INDEX bookmarks_user_created ON bookmarks (user_id, created_at);

-- Takip: sayılar herkese açık, liste değil.
CREATE TABLE follows (
  follower_id uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  followee_id uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (follower_id, followee_id),
  CHECK (follower_id <> followee_id)
);
CREATE INDEX follows_followee ON follows (followee_id);

CREATE TABLE notifications (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  actor_id uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('reply', 'mention', 'quote', 'repost', 'clap', 'follow')),
  post_id uuid REFERENCES posts (id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  read_at timestamptz
);
CREATE INDEX notifications_user ON notifications (user_id, created_at);

-- Bağlantı kartı önbelleği. `ok` yanlışsa sayfa okunamadı; kart gösterilmez ama yeniden de denenmez (tekrar süresi dolana kadar).
CREATE TABLE link_previews (
  hash text PRIMARY KEY,
  url text NOT NULL,
  title text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  image text,
  site_name text NOT NULL DEFAULT '',
  ok boolean NOT NULL DEFAULT false,
  fetched_at timestamptz NOT NULL DEFAULT now()
);

-- Faydalı bağlantılar. `url_hash` sadeleştirilmiş adresin özeti: aynı kaynak iki kez eklenmez.
CREATE TABLE links (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  url text NOT NULL,
  url_hash text NOT NULL,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  image text,
  site_name text NOT NULL DEFAULT '',
  category text NOT NULL CHECK (category IN ('tool', 'library', 'learning', 'design', 'ai', 'other')),
  tags jsonb NOT NULL DEFAULT '[]',
  status text NOT NULL DEFAULT 'visible' CHECK (status IN ('visible', 'hidden', 'removed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT links_url_hash_unique UNIQUE (url_hash)
);
CREATE INDEX links_created ON links (created_at);
CREATE INDEX links_category ON links (category, created_at);
CREATE INDEX links_user ON links (user_id, created_at);

CREATE TABLE link_votes (
  link_id uuid NOT NULL REFERENCES links (id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (link_id, user_id)
);
CREATE INDEX link_votes_user ON link_votes (user_id);

-- Şikâyet: bir üye aynı içeriği bir kez şikâyet eder. `target_id` gönderi, bağlantı ya da üye kimliği.
CREATE TABLE reports (
  id uuid PRIMARY KEY,
  reporter_id uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  target_kind text NOT NULL CHECK (target_kind IN ('post', 'link', 'user')),
  target_id uuid NOT NULL,
  reason text NOT NULL CHECK (reason IN ('spam', 'abuse', 'hate', 'sexual', 'illegal', 'other')),
  note text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  resolution text,
  CONSTRAINT reports_once UNIQUE (reporter_id, target_kind, target_id)
);
CREATE INDEX reports_target ON reports (target_kind, target_id);
CREATE INDEX reports_open ON reports (resolved_at, created_at);

CREATE TABLE moderation_log (
  id uuid PRIMARY KEY,
  actor_id uuid REFERENCES users (id) ON DELETE SET NULL,
  target_kind text NOT NULL,
  target_id uuid NOT NULL,
  action text NOT NULL,
  reason text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX moderation_log_target ON moderation_log (target_kind, target_id);
CREATE INDEX moderation_log_created ON moderation_log (created_at);

-- Elle eklenen etkinlikler. Haftalık canlı yayınlar tabloda değil, @koina/shared/schedule'dan üretilir (`stream-YYYY-MM-DD`);
-- bu yüzden katılım tablosundaki `event_id` metindir ve yabancı anahtar taşımaz.
CREATE TABLE events (
  id text PRIMARY KEY,
  kind text NOT NULL,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  url text
);
CREATE INDEX events_starts ON events (starts_at);

CREATE TABLE rsvps (
  event_id text NOT NULL,
  user_id uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (event_id, user_id)
);
CREATE INDEX rsvps_user ON rsvps (user_id);

CREATE TABLE submissions (
  id uuid PRIMARY KEY,
  form text NOT NULL,
  name text NOT NULL,
  email text NOT NULL,
  message text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX submissions_form ON submissions (form, created_at);

CREATE TABLE subscribers (
  email text PRIMARY KEY,
  locale text NOT NULL,
  token text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  confirmed_at timestamptz,
  unsubscribed_at timestamptz,
  CONSTRAINT subscribers_token_unique UNIQUE (token)
);

-- Çerezsiz analitik: kişi değil gün + yol + olay sayılır.
CREATE TABLE hits (
  day date NOT NULL,
  path text NOT NULL,
  event text NOT NULL DEFAULT 'pageview',
  referrer text NOT NULL DEFAULT '',
  count integer NOT NULL DEFAULT 0,
  PRIMARY KEY (day, path, event, referrer)
);

-- Sabit pencereli hız sınırı (Better Auth'un `rate_limit` tablosundan ayrı). Anahtar özetlenmiş IP ya da üye kimliği içerir.
CREATE TABLE api_rate_limits (
  key text NOT NULL,
  window_start bigint NOT NULL,
  count integer NOT NULL DEFAULT 0,
  PRIMARY KEY (key, window_start)
);

-- Yalnız geliştirme: e-posta servisi yokken giriş kodları buraya yazılır (`GET /v1/dev/otp`). Canlıda boş kalır.
CREATE TABLE dev_mailbox (
  id uuid PRIMARY KEY,
  email text NOT NULL,
  subject text NOT NULL,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX dev_mailbox_email ON dev_mailbox (email, created_at);
--down
DROP TABLE dev_mailbox;
DROP TABLE api_rate_limits;
DROP TABLE hits;
DROP TABLE subscribers;
DROP TABLE submissions;
DROP TABLE rsvps;
DROP TABLE events;
DROP TABLE moderation_log;
DROP TABLE reports;
DROP TABLE link_votes;
DROP TABLE links;
DROP TABLE link_previews;
DROP TABLE notifications;
DROP TABLE follows;
DROP TABLE bookmarks;
DROP TABLE reposts;
DROP TABLE claps;
DROP TABLE post_mentions;
DROP TABLE post_tags;
DROP TABLE post_media;
DROP TABLE posts;
DROP TABLE project_members;
DROP TABLE projects;
DROP INDEX users_handle_unique;
ALTER TABLE users DROP COLUMN banned_at;
ALTER TABLE users DROP COLUMN trust;
ALTER TABLE users DROP COLUMN role;
ALTER TABLE users DROP COLUMN locale;
ALTER TABLE users DROP COLUMN location;
ALTER TABLE users DROP COLUMN website;
ALTER TABLE users DROP COLUMN github;
ALTER TABLE users DROP COLUMN interests;
ALTER TABLE users DROP COLUMN roles;
ALTER TABLE users DROP COLUMN bio;
ALTER TABLE users DROP COLUMN handle;
