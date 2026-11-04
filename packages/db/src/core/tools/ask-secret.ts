/** Parola taşıyan URL'ler komut satırı seçeneğiyle değil, gizli girişle sorulur: argv'yi makinedeki her kullanıcı `ps` ile okur,
 * seçenek ayrıca shell geçmişine düşer. `doctor --pgbouncer-url`/`--pooled-url`, `--from-replica` ve Neon API anahtarı aynı soruyu kullanır. */
import { AppError, errorCode } from "../errors";

const usage = (message: string) => new AppError("USAGE", message);
/** Terminal kontrol karakterleri: Ctrl+C, Ctrl+D ve geri silme (kaynakta ham bayt yerine kaçış). */
const [CTRL_C, CTRL_D, BACKSPACE] = ["\u0003", "\u0004", "\u007f"];
/** Soru açıkken gelen sinyal de bir çıkış yoludur: raw mod geri verilmezse kullanıcının kabuğu echo'suz kalır. */
const CANCEL_SIGNALS = ["SIGINT", "SIGTERM"] as const;

export type SecretInput = NodeJS.ReadableStream & { isTTY?: boolean; setRawMode?(raw: boolean): unknown };
/** Sinyal kaynağı; testler gerçek `process` yerine kendi yayıcısını verir. */
export type SignalSource = Pick<NodeJS.EventEmitter, "once" | "removeListener">;

/** Soruyu `output`'a yazar ve bir satır okur. Terminalde yazılan gösterilmez (her karakter için `*`, geri silme çalışır); Ctrl+C ve
 * Ctrl+D iptal eder (`USAGE`). Terminal olmayan girişte (yönlendirme) ilk satır okunur. Raw mod her çıkış yolunda geri verilir:
 * satır sonu, Ctrl+C/Ctrl+D, akışın sonu, akış hatası ve SIGINT/SIGTERM. */
export function askSecret(
  question: string,
  input: SecretInput = process.stdin,
  output: NodeJS.WritableStream = process.stderr,
  signals: SignalSource = process,
): Promise<string> {
  output.write(question);
  const raw = Boolean(input.isTTY && input.setRawMode);
  if (raw) input.setRawMode?.(true);
  return new Promise((resolve, reject) => {
    let value = "";
    const finish = (error?: AppError) => {
      input.removeListener("data", onData);
      input.removeListener("end", onEnd);
      input.removeListener("error", onError);
      for (const signal of CANCEL_SIGNALS) signals.removeListener(signal, onCancel);
      if (raw) input.setRawMode?.(false);
      input.pause();
      output.write("\n");
      if (error) reject(error);
      else resolve(value.trim());
    };
    const onEnd = () => finish(value ? undefined : usage("Nothing was entered at the hidden prompt"));
    /** Akış hatası: soru asla yanıtlanamaz, terminal geri verilir. */
    const onError = (error: unknown) => finish(usage(`Hidden input could not be read (${errorCode(error)})`));
    const onCancel = () => finish(usage("Hidden input cancelled"));
    const onData = (chunk: Buffer | string) => {
      for (const char of chunk.toString()) {
        if (char === "\r" || char === "\n") return finish();
        if (char === CTRL_C || char === CTRL_D) return finish(usage("Hidden input cancelled"));
        if (char === BACKSPACE || char === "\b") {
          if (value && raw) output.write("\b \b");
          value = value.slice(0, -1);
          continue;
        }
        value += char;
        if (raw) output.write("*");
      }
    };
    input.on("data", onData);
    input.on("end", onEnd);
    input.on("error", onError);
    for (const signal of CANCEL_SIGNALS) signals.once(signal, onCancel);
    input.resume();
  });
}

/** Gizli girişten gelen postgres:// URL'si. Hata metinleri değeri içermez: mesaj log'a ve terminale düşer. */
export function postgresUrl(value: string | undefined, subject: string): URL {
  if (!value) throw usage(`${subject} was not entered`);
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw usage(`${subject} is not a valid postgres:// URL`);
  }
  if (!["postgres:", "postgresql:"].includes(url.protocol)) throw usage(`${subject} must start with postgres:// or postgresql://`);
  return url;
}
