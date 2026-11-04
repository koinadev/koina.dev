// Sunucunun kullanıcı adına istek attığı adresler (bağlantı önizlemesi) için SSRF koruması. Workers iç ağa zaten erişemez; yine de
// yerel adlar, IP adresleri ve standart dışı portlar hiç denenmez, böylece kural çalışma ortamından bağımsızdır.

const LOCAL_SUFFIXES = ['.local', '.localhost', '.internal', '.lan', '.home', '.corp', '.intranet', '.test', '.invalid', '.example'];

const isIpLiteral = (host: string) => /^\d{1,3}(?:\.\d{1,3}){3}$/.test(host) || host.startsWith('[') || /^0x[0-9a-f]+$/i.test(host) || /^\d+$/.test(host);

/** Herkese açık bir http(s) adresi mi: kullanıcı bilgisi yok, port standart, ad gerçek bir alan adı. */
export function isPublicHttpUrl(raw: string): boolean {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return false;
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return false;
  if (url.username || url.password) return false;
  if (url.port && url.port !== '80' && url.port !== '443') return false;
  const host = url.hostname.toLowerCase().replace(/\.$/, '');
  if (!host.includes('.') || isIpLiteral(host) || host === 'localhost') return false;
  return !LOCAL_SUFFIXES.some((suffix) => host.endsWith(suffix));
}
