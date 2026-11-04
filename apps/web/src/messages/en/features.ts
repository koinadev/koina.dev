// Marker'lı: JSON olamaz — kaldırılan özelliğe ait madde burada satır bazında sökülür.
export const features = {
  eyebrow: 'Features',
  title: 'Everything you need, nothing more',
  description: 'From performance to SEO, animations to accessibility — every landing page building block is ready.',
  items: [
    { icon: 'zap', title: 'Blazing fast', description: 'Zero JS hydration, static output and optimized assets for a 95+ Lighthouse score.' },
    { icon: 'shield', title: 'Secure forms', description: 'Spam-free contact with Turnstile bot protection and server-side validation.' }, // @feature:forms
    { icon: 'globe', title: 'Multilingual', description: 'TR/EN i18n out of the box; hreflang and locale routing handled automatically.' }, // @feature:i18n
    { icon: 'chart', title: 'SEO ready', description: 'Meta tags, OG images, sitemap and JSON-LD structured data included.' },
    { icon: 'sparkles', title: 'Living animations', description: 'GSAP scroll reveals and micro-interactions; respects reduced motion.' },
    { icon: 'code', title: 'Clean architecture', description: 'Content lives in data files, components stay pure; remove any feature with one command.' },
  ],
};
