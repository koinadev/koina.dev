/** Telemetri girişi (`@koina/db/telemetry`): `onSpan` olaylarını OpenTelemetry ya da Sentry span'lerine çevirir. Bağımlılığı yoktur;
 * tracer'ı ya da Sentry nesnesini uygulama verir. Span iş bittiğinde o anki aktif context'e (ör. HTTP isteğinin span'i) bağlanır.
 *
 *   import { trace } from "@opentelemetry/api";
 *   createDb({ driver: bunDriver, onSpan: openTelemetry(trace.getTracer("app")) });
 *
 *   import * as Sentry from "@sentry/bun";
 *   createDb({ driver: bunDriver, onSpan: sentry(Sentry) });
 *
 * Sentry'de `db.query` span'i Sentry'nin sorgu görünümüyle eşleşir: op düz `db`, ad bağlı SQL metnidir (parametre
 * değerleri değil — sorgu her zaman `$1`, `$2` gibi yer tutucularla bildirilir), trace görünümünde `db - select …`
 * şeklinde görünür ve HTTP isteğinin span'i altında iç içe listelenir.
 */
import type { Span, SpanHandler } from "./core/database";

export type { Span, SpanHandler };

type Attributes = Record<string, string | number>;
/** OpenTelemetry ve Sentry span'lerinin ortak kullanılan kısmı. */
interface TelemetrySpan {
  setStatus(status: { code: number; message?: string }): unknown;
  end(endTime: Date): void;
}
/** `@opentelemetry/api` `Tracer` ile uyumlu en küçük arayüz. */
export interface OpenTelemetryTracer {
  startSpan(name: string, options: { startTime: Date; attributes: Attributes }): TelemetrySpan;
}
/** `@sentry/*` (v8+) `startInactiveSpan` ile uyumlu en küçük arayüz. */
export interface SentryClient {
  startInactiveSpan(options: { name: string; op: string; startTime: Date; attributes: Attributes }): TelemetrySpan;
}

/** OpenTelemetry `SpanStatusCode.ERROR` (Sentry'de de 2). */
const STATUS_ERROR = 2;

/** OpenTelemetry anlamsal adlarıyla öznitelikler: `db.system.name`, `error.type` ve pakete özgü `repo_db.*`. */
export function spanAttributes(span: Span): Attributes {
  const attributes: Attributes = { "db.system.name": "postgresql", "repo_db.duration_ms": span.ms };
  if (span.detail) attributes["repo_db.detail"] = span.detail;
  if (span.error) attributes["error.type"] = span.error;
  return attributes;
}

function finish(target: TelemetrySpan, span: Span) {
  if (span.error) target.setStatus({ code: STATUS_ERROR, message: span.error });
  target.end(new Date(span.startTime + span.ms));
}

export function openTelemetry(tracer: OpenTelemetryTracer): SpanHandler {
  return (span) => finish(tracer.startSpan(span.name, { startTime: new Date(span.startTime), attributes: spanAttributes(span) }), span);
}

/** Sorgu span'inde Sentry'nin sorgu görünümüyle eşleşen ad: SQL metni (`span.detail`); yoksa span adı. */
const sentryName = (span: Span) => (span.name === "db.query" && span.detail ? span.detail : span.name);

/** Sentry `op`: sorgu span'i düz `db` (Sentry'nin SQL görünümü bunu bekler, ad zaten sorgu metnidir), diğerleri
 * `db.<grup>` (`migration` → `db.migration`). */
const sentryOp = (name: string) => (name === "db.query" ? "db" : name.startsWith("db.") ? name : `db.${name.split(".")[0]}`);

export function sentry(client: SentryClient): SpanHandler {
  return (span) =>
    finish(client.startInactiveSpan({ name: sentryName(span), op: sentryOp(span.name), startTime: new Date(span.startTime), attributes: spanAttributes(span) }), span);
}
