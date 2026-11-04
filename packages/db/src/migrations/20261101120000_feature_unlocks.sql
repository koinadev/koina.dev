--up
-- Eşiğe ulaşınca açılan özellikler. Kayıt kalıcıdır: üye sayısı sonradan düşse de özellik ve içindeki içerik kapanmaz.
CREATE TABLE feature_unlocks (
  feature text PRIMARY KEY,
  unlocked_at timestamptz NOT NULL DEFAULT now()
);

--down
DROP TABLE feature_unlocks;
