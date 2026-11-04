import { describe, expect, it } from 'vitest';

import { toCsv } from '../presignups-csv';

describe('toCsv', () => {
  it('kayıtları tarihe göre sıralar, metadata yoksa adresi anahtardan alır', () => {
    const csv = toCsv([
      { name: 'email:b@x.co', metadata: { email: 'b@x.co', at: '2026-11-05T10:00:00Z', consent: 'v1', locale: 'en' } },
      { name: 'email:a@x.co' },
      { name: 'baska:anahtar' },
    ]);
    expect(csv).toBe('email,kayit_tarihi,onay_surumu,dil\na@x.co,,,\nb@x.co,2026-11-05T10:00:00Z,v1,en\n');
  });

  it('formül gibi başlayan ve virgül içeren hücreleri etkisizleştirir', () => {
    expect(toCsv([{ name: 'email:=cmd@x.co', metadata: { email: '=cmd,1@x.co' } }])).toBe(
      'email,kayit_tarihi,onay_surumu,dil\n"\'=cmd,1@x.co",,,\n',
    );
  });
});
