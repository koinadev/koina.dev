// Koina API sözleşmesi. API (`apps/api`) gelen gövdeyi bu şemalarla doğrular; mobil uygulama ve
// site aynı tipleri kullanır. Bir alanı değiştirmek üç tarafı birden değiştirir — derleyici
// eksik kalan yeri gösterir.
import { z } from 'zod';

export const locales = ['tr', 'en'] as const;
export type Locale = (typeof locales)[number];

/** Topluluktaki roller: siteyle aynı üç kapı. */
export const roles = ['learner', 'mentor', 'founder'] as const;
export type Role = (typeof roles)[number];

const email = z.email().max(254).transform((v) => v.trim().toLowerCase());
const handle = z
  .string()
  .regex(/^[a-z0-9](?:[a-z0-9-]{1,28}[a-z0-9])$/, 'handle: 3-30 karakter, küçük harf, rakam, tire');

// ─── Formlar (site) ─────────────────────────────────────────────────────────

/** Sitenin "custom" form sağlayıcısının gönderdiği gövde (bkz. contact.service.ts). */
export const formSubmission = z.object({
  name: z.string().trim().min(1).max(120),
  email,
  message: z.string().trim().min(1).max(5000),
  // Bal küpü: insan doldurmaz, dolu gelirse gönderim reddedilir.
  website: z.string().max(0).optional().default(''),
  'cf-turnstile-response': z.string().min(1),
});
export type FormSubmission = z.infer<typeof formSubmission>;
export const formNames = ['contact', 'signup'] as const;
export type FormName = (typeof formNames)[number];

// ─── Bülten ─────────────────────────────────────────────────────────────────

export const newsletterSubscribe = z.object({
  email,
  locale: z.enum(locales).default('tr'),
  website: z.string().max(0).optional().default(''),
});

// ─── Analitik ───────────────────────────────────────────────────────────────

/** Çerezsiz sayfa görüntüleme: kişi değil sayfa sayılır, IP saklanmaz. */
export const analyticsHit = z.object({
  path: z.string().startsWith('/').max(300),
  referrer: z.string().max(500).optional(),
  event: z.string().regex(/^[a-z0-9_]{1,40}$/).optional(),
});

// ─── Giriş ──────────────────────────────────────────────────────────────────

/**
 * Giriş Better Auth'un e-posta kodu akışıdır; uçlar `/v1/auth` altında Better Auth'undur. Hesap yoksa ilk doğrulamada açılır.
 * Web çerezle, mobil `set-auth-token` başlığındaki belirteçle (`Authorization: Bearer`) devam eder.
 */
export const AUTH_PATHS = {
  sendCode: '/v1/auth/email-otp/send-verification-otp',
  verify: '/v1/auth/sign-in/email-otp',
  signOut: '/v1/auth/sign-out',
  /** Yalnız geliştirme: e-posta servisi yokken son gönderilen kod. */
  devCode: '/v1/dev/otp',
} as const;

export const authSendCode = z.object({ email, type: z.literal('sign-in').default('sign-in') });
export const authVerify = z.object({ email, otp: z.string().regex(/^\d{6}$/) });

/** Turnstile belirtecinin web'den geldiği başlık. */
export const CAPTCHA_HEADER = 'x-captcha-response';

// ─── Üyeler ─────────────────────────────────────────────────────────────────

export interface Member {
  id: string;
  handle: string;
  name: string;
  bio: string;
  roles: Role[];
  interests: string[];
  github: string | null;
  website: string | null;
  location: string | null;
  createdAt: string;
}

export const memberRoles = ['member', 'moderator', 'admin'] as const;
export type MemberRole = (typeof memberRoles)[number];

/** `GET /v1/me`: girişli üyenin kendisi. Yetki ve okunmamış bildirim sayısı yalnız burada. */
export interface Me extends Member {
  email: string;
  role: MemberRole;
  unread: number;
}

/** Bir üyenin kısa künyesi: gönderi, proje ve ekip listelerinde. */
export type MemberRef = Pick<Member, 'handle' | 'name' | 'roles'>;

/** Profil sayfası: üye + topluluktaki izi. Üye ve takipçi listeleri herkese açık değil; yalnız sayılar. */
export interface MemberProfile extends Member {
  stats: { posts: number; projects: number; claps: number; events: number; followers: number; following: number };
  /** Yalnız giriş yapılmışsa: izleyen bu üyeyi takip ediyor mu. */
  followed?: boolean;
  projects: Project[];
}

export const updateProfile = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  handle: handle.optional(),
  bio: z.string().trim().max(280).optional(),
  roles: z.array(z.enum(roles)).max(3).optional(),
  interests: z.array(z.string().trim().min(1).max(30)).max(10).optional(),
  github: z
    .string()
    .regex(/^[A-Za-z0-9-]{1,39}$/)
    .nullable()
    .optional(),
  website: z.url().startsWith('https://').max(200).nullable().optional(),
  location: z.string().trim().max(60).nullable().optional(),
});
export type UpdateProfile = z.infer<typeof updateProfile>;

// ─── Etkinlikler ────────────────────────────────────────────────────────────

export const eventKinds = ['stream', 'meetup', 'demo', 'workshop'] as const;
export type EventKind = (typeof eventKinds)[number];

export interface KoinaEvent {
  id: string;
  kind: EventKind;
  title: string;
  description: string;
  startsAt: string;
  endsAt: string;
  url: string | null;
  going: number;
  /** Yalnız giriş yapılmışsa: bu üye katılıyor mu. */
  me?: boolean;
}

// ─── Projeler ───────────────────────────────────────────────────────────────

export const projectStatuses = ['idea', 'building', 'shipped'] as const;
export type ProjectStatus = (typeof projectStatuses)[number];

export const createProject = z.object({
  name: z.string().trim().min(2).max(60),
  summary: z.string().trim().min(10).max(280),
  repoUrl: z.url().startsWith('https://github.com/').nullable().optional(),
  lookingFor: z.array(z.enum(roles)).max(3).default([]),
});
export type CreateProject = z.infer<typeof createProject>;

export interface Project {
  id: string;
  slug: string;
  name: string;
  summary: string;
  status: ProjectStatus;
  repoUrl: string | null;
  lookingFor: Role[];
  owner: MemberRef;
  members: number;
  posts: number;
  createdAt: string;
  me?: boolean;
  /** Yalnız ayrıntı ucunda: ekip. */
  team?: MemberRef[];
}

/** `GET /v1/projects` süzgeçleri; keşfet ekranı ve web uygulaması aynı adları kullanır. */
export interface ProjectFilters {
  q?: string;
  status?: ProjectStatus;
  role?: Role;
  member?: string;
}

// ─── Akış ───────────────────────────────────────────────────────────────────

export const POST_MAX = 500;
export const MEDIA_MAX = 4;
/** Yüklenebilen görsel türleri ve en büyük boyut (bayt). SVG bilerek yok: içinde betik taşıyabilir. */
export const MEDIA_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'] as const;
export const MEDIA_BYTES = 5 * 1024 * 1024;
export const ALT_MAX = 400;

export const createPost = z
  .object({
    body: z.string().trim().max(POST_MAX).default(''),
    projectSlug: z.string().max(80).optional(),
    /** Yanıtsa yanıtlanan gönderi; yanıtın yanıtı olabilir. */
    parentId: z.uuid().optional(),
    /** Alıntıysa alıntılanan gönderi. */
    quoteId: z.uuid().optional(),
    /** Önceden yüklenmiş görsellerin kimlikleri (`POST /v1/media`). */
    media: z.array(z.uuid()).max(MEDIA_MAX).default([]),
  })
  .refine((p) => p.body.length > 0 || p.media.length > 0, { message: 'body or media required', path: ['body'] });
export type CreatePost = z.input<typeof createPost>;

export interface PostMedia {
  id: string;
  /** Mutlak adres (API'nin `/media/<anahtar>` ucu). */
  url: string;
  width: number;
  height: number;
  alt: string;
}

export interface LinkPreview {
  url: string;
  title: string;
  description: string;
  image: string | null;
  siteName: string;
}

export interface QuotedPost {
  id: string;
  body: string;
  author: MemberRef;
  createdAt: string;
  media: PostMedia[];
  /** Alıntılanan gönderi gizlendi ya da kaldırıldı: içerik boş gelir. */
  unavailable?: boolean;
}

export interface Post {
  id: string;
  body: string;
  author: MemberRef;
  project: Pick<Project, 'slug' | 'name'> | null;
  parentId: string | null;
  rootId: string | null;
  /** Yanıtsa yanıtlanan gönderinin yazarı. */
  replyTo: string | null;
  media: PostMedia[];
  preview: LinkPreview | null;
  quote: QuotedPost | null;
  claps: number;
  replies: number;
  reposts: number;
  quotes: number;
  createdAt: string;
  /** Yalnız giriş yapılmışsa. */
  clapped?: boolean;
  reposted?: boolean;
  bookmarked?: boolean;
  /** Yalnız yazara ve moderatöre: gönderi gizlenmişse. */
  hidden?: boolean;
  /** Takip akışında: bu gönderiyi yeniden paylaşan takip edilen üye. */
  repostedBy?: Pick<Member, 'handle' | 'name'>;
}

export const feedTabs = ['top', 'following', 'latest'] as const;
export type FeedTab = (typeof feedTabs)[number];

/** `GET /v1/feed` süzgeçleri. `tag`, `project`, `author`, `q` ya da `scope` verilirse sıralama zaman sırasıdır. */
export interface FeedQuery {
  tab?: FeedTab;
  tag?: string;
  project?: string;
  author?: string;
  q?: string;
  scope?: 'projects';
}

/** `GET /v1/feed/:id`: üst zincir (kökten yakına), gönderi ve yanıtları (eskiden yeniye). */
export interface Thread {
  ancestors: Post[];
  post: Post;
  replies: Post[];
}

/** `GET /v1/tags/trending`: son 7 günde en çok farklı kişinin kullandığı etiketler. */
export interface Trend {
  tag: string;
  people: number;
  posts: number;
}

/** Etiket biçimi: harf, rakam, alt çizgi; Türkçe harfler dahil. Gönderide `#` ile yazılır. */
export const TAG_PATTERN = /(^|[^\p{L}\p{N}_&/])#([\p{L}\p{N}_]{2,40})/gu;
export const MENTION_PATTERN = /(^|[^\p{L}\p{N}_/@])@([a-z0-9](?:[a-z0-9-]{1,28}[a-z0-9]))/gu;
export const URL_PATTERN = /\bhttps?:\/\/[^\s<>"'`]+[^\s<>"'`.,;:!?)\]}]/gi;

/** Etiketi karşılaştırma biçimine indirir: Türkçe küçük harf. */
export const normalizeTag = (tag: string) => tag.toLocaleLowerCase('tr');

// ─── Görseller ──────────────────────────────────────────────────────────────

/**
 * `POST /v1/media`: `multipart/form-data` ile `file`, `width`, `height`, isteğe bağlı `alt`. Görsel bir gönderiye bağlanana
 * kadar yalnız yükleyene aittir; bir gün içinde bağlanmazsa silinir.
 */
export const mediaMeta = z.object({
  width: z.coerce.number().int().min(1).max(10_000),
  height: z.coerce.number().int().min(1).max(10_000),
  alt: z.string().trim().max(ALT_MAX).default(''),
});

// ─── Bildirimler ────────────────────────────────────────────────────────────

export const notificationKinds = ['reply', 'mention', 'quote', 'repost', 'clap', 'follow'] as const;
export type NotificationKind = (typeof notificationKinds)[number];

export interface Notification {
  id: string;
  kind: NotificationKind;
  actor: MemberRef;
  post: { id: string; body: string } | null;
  createdAt: string;
  read: boolean;
}

// ─── Faydalı bağlantılar ────────────────────────────────────────────────────

export const linkCategories = ['tool', 'library', 'learning', 'design', 'ai', 'other'] as const;
export type LinkCategory = (typeof linkCategories)[number];
export const linkSorts = ['top', 'new'] as const;
export type LinkSort = (typeof linkSorts)[number];

const linkTag = z
  .string()
  .trim()
  .min(2)
  .max(30)
  .regex(/^[\p{L}\p{N}][\p{L}\p{N} .+#-]*$/u)
  .transform((t) => t.toLocaleLowerCase('tr'));

export const linkPreviewInput = z.object({ url: z.url().max(2000) });

export const createLink = z.object({
  url: z.url().max(2000),
  title: z.string().trim().min(3).max(120),
  description: z.string().trim().max(400).default(''),
  category: z.enum(linkCategories),
  tags: z.array(linkTag).max(3).default([]),
});
export type CreateLink = z.input<typeof createLink>;

export interface Link {
  id: string;
  url: string;
  /** Adresin alan adı (`www.` olmadan); listede kaynak olarak gösterilir. */
  host: string;
  title: string;
  description: string;
  image: string | null;
  siteName: string;
  category: LinkCategory;
  tags: string[];
  author: MemberRef;
  votes: number;
  voted?: boolean;
  createdAt: string;
  hidden?: boolean;
}

/** `POST /v1/links/preview`: sunucunun sayfadan okuduğu önbilgi; form bununla dolar. Aynı adres varsa `existing`. */
export interface LinkDraft {
  url: string;
  title: string;
  description: string;
  image: string | null;
  siteName: string;
  existing: string | null;
}

// ─── Şikâyet ve moderasyon ──────────────────────────────────────────────────

export const reportReasons = ['spam', 'abuse', 'hate', 'sexual', 'illegal', 'other'] as const;
export type ReportReason = (typeof reportReasons)[number];

export const reportInput = z.object({
  reason: z.enum(reportReasons),
  note: z.string().trim().max(500).default(''),
});

export const modTargets = ['post', 'link', 'user'] as const;
export type ModTarget = (typeof modTargets)[number];
export const modActions = ['hide', 'restore', 'remove', 'ban', 'unban', 'dismiss'] as const;
export type ModAction = (typeof modActions)[number];

export const modActionInput = z.object({
  targetKind: z.enum(modTargets),
  targetId: z.uuid(),
  action: z.enum(modActions),
  reason: z.string().trim().max(300).default(''),
});

export interface ModQueueItem {
  targetKind: ModTarget;
  targetId: string;
  reports: number;
  reasons: ReportReason[];
  firstAt: string;
  lastAt: string;
  post?: Post;
  link?: Link;
  member?: MemberRef;
}

/** `GET /v1/mod/log`: moderatör kararlarının kaydı. Silinen moderatörün satırında `actorHandle` boş kalır. */
export interface ModLogEntry {
  id: string;
  targetKind: ModTarget;
  targetId: string;
  action: ModAction;
  reason: string;
  createdAt: string;
  actorHandle: string | null;
}

// ─── Site haritası ──────────────────────────────────────────────────────────

/** `GET /v1/sitemap`: web uygulamasının `/sitemap.xml`'i için dizine girecek içerik. Profiller bilerek yok. */
export interface SitemapData {
  posts: { id: string; updatedAt: string }[];
  projects: { slug: string; updatedAt: string }[];
  links: { id: string; updatedAt: string }[];
  tags: { tag: string; updatedAt: string }[];
}

// ─── Ortak zarf ─────────────────────────────────────────────────────────────

/** Liste uçları: imleçli sayfalama. `next` yoksa son sayfa. */
export interface Page<T> {
  items: T[];
  next: string | null;
}

/** Hata gövdesi. `code` makine için, kullanıcıya gösterilen metin istemcide çevrilir. */
export interface ApiErrorBody {
  success: false;
  code: ApiErrorCode;
}
export type ApiErrorCode =
  | 'INVALID_INPUT'
  | 'INVALID_SUBMISSION'
  | 'TURNSTILE_FAILED'
  | 'RATE_LIMITED'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'FEATURE_LOCKED'
  | 'BANNED'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'CODE_INVALID'
  | 'MAIL_UNAVAILABLE'
  | 'CONTENT_REJECTED'
  | 'DUPLICATE'
  | 'TOO_MANY_LINKS'
  | 'MEDIA_INVALID'
  | 'PAYLOAD_TOO_LARGE'
  | 'INTERNAL';

// ─── Blog (site) ────────────────────────────────────────────────────────────

/**
 * Sitenin ürettiği `/blog/<dil>.json` beslemesi. Yazılar API'de değil sitenin içerik klasöründe
 * durur; uygulamalar yeni bir sürüm çıkmadan yeni yazıları buradan okur.
 */
export interface BlogPost {
  slug: string;
  title: string;
  description: string;
  date: string;
  updated: string | null;
  author: string | null;
  url: string;
  cover: string | null;
  coverAlt: string;
  minutes: number;
  /** Ön madde (frontmatter) çıkarılmış ham markdown. */
  body: string;
}

export interface BlogFeed {
  locale: Locale;
  posts: BlogPost[];
}
