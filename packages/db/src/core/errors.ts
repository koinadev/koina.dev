/** Kararlı hata kodu ve mesajı taşır; HTTP durumuna eşlemek tüketen uygulamanın işidir. */
export class AppError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "AppError";
  }
}

/** Sürücüden bağımsız kod: AppError kodu, SQLSTATE veya bağlantı kodu. Bun SQLSTATE'i `errno`'da taşır; pg kopmalarda kod vermez. */
export function errorCode(error: unknown): string {
  if (error instanceof AppError) return error.code;
  if (typeof error !== "object" || error === null) return "OPERATION_FAILED";
  const { errno, code, message } = error as Record<string, unknown>;
  if (typeof errno === "string" && /^[0-9A-Z]{5}$/.test(errno)) return errno;
  if (typeof code === "string" && /^[A-Z0-9_]{1,64}$/.test(code)) return code;
  if (typeof message === "string" && /^Connection terminated|not queryable/.test(message)) return "CONNECTION_CLOSED";
  return "OPERATION_FAILED";
}

/** Sürücü hatasının güvenli hâli: kod ham hatadan alınır; mesaj yalnızca kodu taşır (sürücü mesajı host, kullanıcı, DB adı ya da satır
 * değeri içerebilir). `detail` ve ham hata (`cause`) taşınmaz; kısıt adı (tanımlayıcı, sır değil) taşınır: pg/Bun/Neon `constraint`,
 * postgres.js `constraint_name`. */
export class DriverError extends AppError {
  readonly constraint?: string;
  constructor(raw: unknown) {
    const code = errorCode(raw);
    super(code, `Database operation failed (${code})`);
    const fields = raw as { constraint?: unknown; constraint_name?: unknown } | null;
    const constraint = fields?.constraint ?? fields?.constraint_name;
    if (typeof constraint === "string") this.constraint = constraint;
  }
}
/** `AppError` (motorun kendi hatası) olduğu gibi kalır; diğer her sürücü hatası `DriverError` olur. */
export const driverError = (raw: unknown) => (raw instanceof AppError ? raw : new DriverError(raw));

/** SQLSTATE bağlantı/kaynak/kapanış sınıfları veya sürücü/soket bağlantı hatası. */
const UNAVAILABLE =
  /^(08|53|57P0)|^((ERR_POSTGRES_)?CONNECTION_(CLOSED|DESTROYED|ENDED|TIMEOUT)|CONNECT_TIMEOUT|ECONNREFUSED|ECONNRESET|ETIMEDOUT|ENOTFOUND)$/;
export const databaseUnavailable = (error: unknown) => UNAVAILABLE.test(errorCode(error));
