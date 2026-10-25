import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Süreçler arası basit kilit: `mkdir` atomiktir, dizin varsa başka bir build koşuyordur.
 * İçindeki `pid` dosyası ölü bir sahibi (çökmüş build) tanımak içindir; ölü kilit devralınır.
 */

const POLL_MS = 1000;

function isAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    // EPERM: süreç var ama bize ait değil — yine de yaşıyor.
    return (error as NodeJS.ErrnoException).code === 'EPERM';
  }
}

function ownerOf(lockDir: string): number | null {
  try {
    const pid = Number(readFileSync(join(lockDir, 'pid'), 'utf8'));
    return Number.isInteger(pid) && pid > 0 ? pid : null;
  } catch {
    return null;
  }
}

/** Kilidi alana dek bekler ve bırakma fonksiyonu döner. `timeoutMs` aşılırsa hata fırlatır. */
export async function acquireLock(lockDir: string, timeoutMs = 30 * 60 * 1000): Promise<() => void> {
  const deadline = Date.now() + timeoutMs;
  let announced = false;

  for (;;) {
    try {
      mkdirSync(lockDir);
      writeFileSync(join(lockDir, 'pid'), String(process.pid));
      return () => rmSync(lockDir, { recursive: true, force: true });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
    }

    const owner = ownerOf(lockDir);
    // `pid` dosyası henüz yazılmamış olabilir (sahip mkdir ile writeFile arasında); o durumda
    // ölü saymak yerine bir tur daha beklenir.
    if (owner !== null && !isAlive(owner)) {
      rmSync(lockDir, { recursive: true, force: true });
      continue;
    }
    if (Date.now() > deadline)
      throw new Error(`Build kilidi ${timeoutMs / 1000} sn içinde alınamadı: ${lockDir}`);
    if (!announced) {
      console.log(`… başka bir build koşuyor (pid ${owner ?? '?'}), sıra bekleniyor.`);
      announced = true;
    }
    await new Promise((done) => setTimeout(done, POLL_MS));
  }
}
