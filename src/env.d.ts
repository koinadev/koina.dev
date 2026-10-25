// Turnstile widget script'i global `turnstile` nesnesini enjekte eder; `render()`/`remove()`
// view transition döngüsü için gerekli (bkz. ContactForm.astro).
interface Window {
  /* @feature:analytics */
  // Sağlayıcı script'lerinin enjekte ettiği global'ler (bkz. src/components/Analytics.astro).
  // OPSİYONEL olmaları sözleşmenin parçası: `src/lib/analytics.ts` varlık kontrolüyle
  // yönlendirme yapıyor, yani "tanımsız" geçerli bir durum.
  plausible?: PlausibleFunction;
  gtag?: (...args: unknown[]) => void;
  /**
   * Oturum başına tek-sefer bayrakları. Üçü de `window`'da durur, DOM'da DEĞİL: view transition
   * `<head>`/`<main>`i değiştirir, DOM'a dayanan bir guard her geçişte "kurulmamış" derdi.
   * `__analyticsInjected`/`__analyticsListenersBound` Analytics.astro'nun `is:inline` script'ine,
   * `__analyticsEventsBound` olay katmanına aittir; hepsi burada çünkü tip tek yerde tanımlanır.
   */
  __analyticsInjected?: boolean;
  __analyticsListenersBound?: boolean;
  __analyticsEventsBound?: boolean;
  /** GA4'ün kendi kuyruğu; `gtag()` yüklenmeden önceki çağrılar buraya birikir. */
  dataLayer?: unknown[];
  /* @/feature:analytics */
  /* @feature:forms */
  turnstile?: {
    reset: () => void;
    render: (el: HTMLElement, options: { sitekey: string; action: string }) => string | undefined;
    remove: (widgetId: string) => void;
  };
  /* @/feature:forms */
}

interface PlausibleFunction {
  (event: string, options?: { props?: Record<string, string | number | boolean> }): void;
  q?: IArguments[];
  init?: (options?: Record<string, unknown>) => void;
  o?: Record<string, unknown>;
}
