// Sitenin fotoğraf modülleri (apps/web/src/lib/photos.ts) tip denetiminde içerik üzerinden
// görünür; Metro bu dosyaları varlık olarak paketler.
declare module '*.jpg' {
  const asset: number;
  export default asset;
}
