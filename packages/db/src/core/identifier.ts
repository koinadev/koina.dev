/** Schema ve identifier doğrulaması: SQL'e giren her ad buradan geçer; identifier hiçbir zaman değer parametresi değildir. */
import { AppError } from "./errors";

/** Uygulama tabloları `createDb`'ye schema verilmezse burada durur. */
export const DEFAULT_SCHEMA = "public";
/** Küçük harf, rakam ve `_`; harf ya da `_` ile başlar, en çok 63 bayt. `pg_*` ve `information_schema` sistemindir. */
const SCHEMA = /^[a-z_][a-z0-9_]{0,62}$/;

export function validateSchema(value: string): string {
  if (typeof value !== "string" || !SCHEMA.test(value) || value.startsWith("pg_") || value === "information_schema") throw new AppError("INVALID_SCHEMA", "invalid schema name");
  return value;
}

const encoder = new TextEncoder();
/** 21 UTF-16 birimi en çok 63 bayt eder; kısa adlarda kodlama yapılmaz. */
const tooLong = (value: string) => value.length > 21 && encoder.encode(value).length > 63;

export function quoteIdentifier(value: string): string {
  if (!value || value.includes("\0") || tooLong(value)) throw new AppError("INVALID_IDENTIFIER", "Invalid PostgreSQL identifier");
  return `"${value.replaceAll('"', '""')}"`;
}

/** `"schema"."ad"`: schema doğrulanır, ikisi de tırnaklanır. */
export const qualified = (schema: string, name: string) => `${quoteIdentifier(validateSchema(schema))}.${quoteIdentifier(name)}`;
