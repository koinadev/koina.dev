/** `import m from "./x.sql" with { type: "text" }` (üretilmiş migration listesi): dosya içeriği metindir. */
declare module "*.sql" {
  const source: string;
  export default source;
}
