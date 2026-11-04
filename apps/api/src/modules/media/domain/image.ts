// Görselin türü dosya adından ya da istemcinin bildirdiği türden değil, ilk baytlarından anlaşılır. Konum ve cihaz bilgisi
// taşıyabilen meta veri (EXIF, XMP) saklanmadan önce çıkarılır.

export type ImageType = 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif';

export const EXTENSIONS: Record<ImageType, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif' };

const startsWith = (bytes: Uint8Array, signature: number[], offset = 0) => signature.every((b, i) => bytes[offset + i] === b);

export function sniffImage(bytes: Uint8Array): ImageType | null {
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) return 'image/jpeg';
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return 'image/png';
  if (startsWith(bytes, [0x47, 0x49, 0x46, 0x38])) return 'image/gif';
  if (startsWith(bytes, [0x52, 0x49, 0x46, 0x46]) && startsWith(bytes, [0x57, 0x45, 0x42, 0x50], 8)) return 'image/webp';
  return null;
}

/** EXIF bölümündeki yön değeri (1–8); okunamazsa 1. Telefon fotoğrafları çoğu zaman pikselleri döndürmeden bu alanla saklar. */
function exifOrientation(segment: Uint8Array): number {
  const exif = [0x45, 0x78, 0x69, 0x66, 0, 0];
  if (!startsWith(segment, exif, 4)) return 1;
  const tiff = segment.subarray(10);
  if (tiff.length < 8) return 1;
  const view = new DataView(tiff.buffer, tiff.byteOffset, tiff.byteLength);
  const little = tiff[0] === 0x49;
  const ifd = view.getUint32(4, little);
  if (ifd + 2 > tiff.length) return 1;
  const count = view.getUint16(ifd, little);
  for (let n = 0; n < count; n++) {
    const entry = ifd + 2 + n * 12;
    if (entry + 12 > tiff.length) return 1;
    if (view.getUint16(entry, little) === 0x0112) {
      const value = view.getUint16(entry + 8, little);
      return value >= 1 && value <= 8 ? value : 1;
    }
  }
  return 1;
}

/** Yalnız yön alanını taşıyan en küçük EXIF bölümü (APP1, büyük-endian TIFF, tek girdili IFD). */
function orientationSegment(orientation: number): Uint8Array {
  return new Uint8Array([
    0xff, 0xe1, 0x00, 0x22, // APP1, uzunluk 34
    0x45, 0x78, 0x69, 0x66, 0x00, 0x00, // "Exif\0\0"
    0x4d, 0x4d, 0x00, 0x2a, 0x00, 0x00, 0x00, 0x08, // TIFF başlığı, IFD 8'de
    0x00, 0x01, // tek girdi
    0x01, 0x12, 0x00, 0x03, 0x00, 0x00, 0x00, 0x01, 0x00, orientation, 0x00, 0x00, // Orientation, SHORT, 1 adet
    0x00, 0x00, 0x00, 0x00, // sonraki IFD yok
  ]);
}

/**
 * JPEG: APP1 (EXIF, XMP) ve APP13 (IPTC) bölümleri atılır; görüntü verisi (SOS sonrası) olduğu gibi kalır.
 * Yön bilgisi konum taşımaz, fotoğraf yan durmasın diye tek başına geri yazılır.
 */
function stripJpeg(bytes: Uint8Array): Uint8Array {
  const out: Uint8Array[] = [bytes.subarray(0, 2)];
  let orientation = 1;
  let i = 2;
  while (i + 4 <= bytes.length && bytes[i] === 0xff) {
    const marker = bytes[i + 1]!;
    if (marker === 0xda) break; // SOS: buradan sonrası sıkıştırılmış veri
    const length = (bytes[i + 2]! << 8) | bytes[i + 3]!;
    const end = i + 2 + length;
    if (length < 2 || end > bytes.length) return bytes;
    if (marker === 0xe1) {
      if (orientation === 1) orientation = exifOrientation(bytes.subarray(i, end));
    } else if (marker !== 0xed) out.push(bytes.subarray(i, end));
    i = end;
  }
  if (orientation !== 1) out.splice(1, 0, orientationSegment(orientation));
  out.push(bytes.subarray(i));
  return concat(out);
}

/** PNG: `eXIf`, `tEXt`, `zTXt`, `iTXt`, `tIME` parçaları atılır. */
function stripPng(bytes: Uint8Array): Uint8Array {
  const drop = new Set(['eXIf', 'tEXt', 'zTXt', 'iTXt', 'tIME']);
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const out: Uint8Array[] = [bytes.subarray(0, 8)];
  let i = 8;
  while (i + 12 <= bytes.length) {
    const length = view.getUint32(i);
    const type = String.fromCharCode(...bytes.subarray(i + 4, i + 8));
    const end = i + 12 + length;
    if (end > bytes.length) return bytes;
    if (!drop.has(type)) out.push(bytes.subarray(i, end));
    i = end;
    if (type === 'IEND') break;
  }
  return concat(out);
}

/** WebP: `EXIF` ve `XMP ` parçaları atılır; RIFF boyutu ve VP8X bayrakları güncellenir. */
function stripWebp(bytes: Uint8Array): Uint8Array {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const chunks: Uint8Array[] = [];
  let i = 12;
  while (i + 8 <= bytes.length) {
    const type = String.fromCharCode(...bytes.subarray(i, i + 4));
    const size = view.getUint32(i + 4, true);
    const end = i + 8 + size + (size % 2);
    if (end > bytes.length + 1) return bytes;
    if (type !== 'EXIF' && type !== 'XMP ') {
      const chunk = bytes.slice(i, Math.min(end, bytes.length));
      if (type === 'VP8X' && chunk.length > 8) chunk[8] = chunk[8]! & ~0x0c; // EXIF (0x08) ve XMP (0x04) bayrakları
      chunks.push(chunk);
    }
    i = end;
  }
  const body = concat(chunks);
  const header = new Uint8Array(12);
  header.set(bytes.subarray(0, 12));
  new DataView(header.buffer).setUint32(4, body.length + 4, true);
  return concat([header, body]);
}

export function stripMetadata(bytes: Uint8Array, type: ImageType): Uint8Array {
  if (type === 'image/jpeg') return stripJpeg(bytes);
  if (type === 'image/png') return stripPng(bytes);
  if (type === 'image/webp') return stripWebp(bytes);
  return bytes;
}

function concat(parts: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}
