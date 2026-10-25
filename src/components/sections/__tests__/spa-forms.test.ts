import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// Kaynak metin sınayan REGRESYON KİLİDİ; gerekçe ve ayrı-dosya kuralı için bkz.
// src/components/__tests__/spa-analytics.test.ts. Bu dosya `forms` özelliğine ait dosyaları
// okuduğu için manifest'te `forms` ile birlikte siliniyor (bkz. features.manifest.ts).
describe('turnstile render cycle (no duplicate widget across client-side navigations)', () => {
  const markup = readFileSync('src/components/sections/ContactForm.astro', 'utf8');
  // Çizim/kaldırma ve gönderim mantığı src/lib/contact-form.ts'te (bkz. ContactForm.astro'daki
  // dinamik import) — bu iki dosya birlikte değişir, o yüzden test de ikisini birden okur.
  const logic = readFileSync('src/lib/contact-form.ts', 'utf8');

  it('api.js explicit render ile yüklenmeli', () => {
    // Implicit render yalnızca script ÇALIŞIRKEN bir kez tarar; Astro swap'tan sonra script'i
    // yeniden çalıştırmaz (data-astro-exec), dolayısıyla kutu boş kalırdı.
    expect(markup).toContain('render=explicit');
  });

  it('kutu her geçişte ELLE çizilip ELLE kaldırılmalı', () => {
    expect(logic).toContain("addEventListener('astro:page-load', renderTurnstile)");
    expect(logic).toContain("addEventListener('astro:before-swap', removeTurnstile)");
  });

  it('Turnstile action explicit render seçeneklerine aktarılmalı', () => {
    expect(markup).toContain('data-action={siteConfig.forms.turnstileAction}');
    expect(logic).toContain("action: el.dataset.action ?? 'contact'");
  });

  it('honeypot markup`ta bulunmalı, `formStartedAt` sözleşmeden çıkmış olmalı', () => {
    expect(markup).toContain('name="website"');
    // REGRESYON KİLİDİ: gateway `website` DIŞINDA ek alan kabul etmez ve `formStartedAt`
    // API sözleşmesinden kaldırıldı (bkz. nafru-form/README.md "API behavior").
    // Geri eklenirse gövde gereksiz alan taşır ve sözleşme yeniden ayrışır.
    expect(markup).not.toContain('name="formStartedAt"');
    expect(logic).not.toContain('formStartedAt');
  });

  it('provider bilgisi ve access key DOM`da veri olarak taşınmalı', () => {
    expect(markup).toContain('data-provider={siteConfig.forms.provider}');
    expect(markup).toContain('data-access-key={siteConfig.forms.accessKey}');
    expect(markup).not.toContain('name="access_key"');
  });

  it('api.js yüklenemezse sessiz kalmamalı', () => {
    expect(logic).toContain('console.warn');
  });
});

// Dil seçimi sabit değil: `i18n` çıkarılınca `src/messages/en/` silinir, yalnızca `tr` kalır.
// Test bu yüzden VAR OLAN dil klasörlerini keşfeder; statik `['en','tr']` listesi, i18n
// çıkarılan matris adımında ENOENT ile suite'i kırardı.
const existingLangs = (['en', 'tr'] as const).filter((lang) => existsSync(`src/messages/${lang}`));

// Kritik: CTA verisi `#contact` çapasına bağlı. `forms` çıkarıldığında `nav.ts` ve `cta.ts`
// marker'ları birlikte silinmelidir — yoksa üretilen HTML'de `href="#contact"` kalır, hedef yok.
describe('forms çıkarma sözleşmesi — CTA anchor (kritik)', () => {
  it('nav.ts: contact rotası `forms` markerlı olmalı', () => {
    for (const lang of existingLangs) {
      const nav = readFileSync(`src/messages/${lang}/nav.ts`, 'utf8');
      expect(nav, `${lang}/nav.ts`).toMatch(/route: 'contact'[\s\S]*\/\/ @feature:forms/);
    }
  });

  // Koina: CTA `#contact` yerine başvuru sayfasına gider; o sayfa da formu taşıdığı için buton
  // yine `forms` özelliğine bağlı. Sözleşme aynı: href satırı marker bloğunun içinde olmalı.
  it('cta.ts: buton href bloğu `forms` markerlı olmalı', () => {
    for (const lang of existingLangs) {
      const cta = readFileSync(`src/messages/${lang}/cta.ts`, 'utf8');
      // Marker bloğu href satırını SARMALI: marker dışında kalan href çıkarmada silinmez.
      expect(cta, `${lang}/cta.ts`).toMatch(/@feature:forms[\s\S]*href: '[^']+'[\s\S]*@\/feature:forms/);
    }
  });
});
