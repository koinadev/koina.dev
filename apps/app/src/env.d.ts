// Worker ortam değişkenleri ve bağlantıları (wrangler.jsonc, yerelde .dev.vars). `@cloudflare/workers-types` DOM tipleriyle
// çakıştığı için yalnız kullandığımız kadarı burada.
interface ServiceBinding {
  fetch(request: Request): Promise<Response>;
}

interface AppEnv {
  /** `koina-api` servis bağlantısı (canlı). */
  API?: ServiceBinding;
  /** `koina-site` servis bağlantısı (canlı): uygulamanın olmayan yollar buraya gider. */
  SITE?: ServiceBinding;
  /** Tanımlıysa vekil bağlantı yerine bu adrese gider (yerel geliştirme). */
  API_URL?: string;
  APP_URL?: string;
  SITE_URL?: string;
  TURNSTILE_SITE_KEY?: string;
  ENVIRONMENT?: string;
}

declare module 'cloudflare:workers' {
  export const env: AppEnv;
}
