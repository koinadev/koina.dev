import { MENTION_PATTERN, TAG_PATTERN, URL_PATTERN } from '@koina/shared/api';
import { router } from 'expo-router';
import type { StyleProp, TextStyle } from 'react-native';
import { openUrl } from '@/lib/open';
import { colors } from '@/lib/theme';
import { Text } from './text';

type Part = { kind: 'text'; value: string } | { kind: 'url' | 'tag' | 'mention'; value: string; raw: string };

/**
 * Metni bağlantı, `#etiket` ve `@anma` parçalarına ayırır. Desenler sözleşmeden gelir (sunucu etiketleri aynı desenle
 * çıkarır). Adresin içindeki `#` etiket sayılmasın diye önce adresler ayrılır; çakışan eşleşme atlanır.
 */
export function parseBody(body: string): Part[] {
  const hits: { start: number; end: number; part: Part }[] = [];
  for (const m of body.matchAll(URL_PATTERN)) {
    hits.push({ start: m.index, end: m.index + m[0].length, part: { kind: 'url', value: m[0], raw: m[0] } });
  }
  const overlaps = (start: number, end: number) => hits.some((h) => start < h.end && end > h.start);
  for (const [pattern, kind] of [[TAG_PATTERN, 'tag'], [MENTION_PATTERN, 'mention']] as const) {
    for (const m of body.matchAll(pattern)) {
      const start = m.index + m[1]!.length;
      const end = m.index + m[0].length;
      if (!overlaps(start, end)) hits.push({ start, end, part: { kind, value: m[2]!, raw: body.slice(start, end) } });
    }
  }
  hits.sort((a, b) => a.start - b.start);
  const parts: Part[] = [];
  let at = 0;
  for (const h of hits) {
    if (h.start > at) parts.push({ kind: 'text', value: body.slice(at, h.start) });
    parts.push(h.part);
    at = h.end;
  }
  if (at < body.length) parts.push({ kind: 'text', value: body.slice(at) });
  return parts;
}

/** Uzun adresi kısaltır: protokol ve `www.` atılır, 32 karakterden sonrası "…" olur. */
const shortUrl = (url: string) => {
  const bare = url.replace(/^https?:\/\/(www\.)?/, '');
  return bare.length > 32 ? `${bare.slice(0, 31)}…` : bare;
};

/** Gönderi metni: bağlantılar tarayıcıda, etiketler etiket sayfasında, anmalar üye profilinde açılır. */
export function RichText({ body, style, numberOfLines }: { body: string; style?: StyleProp<TextStyle>; numberOfLines?: number }) {
  const parts = parseBody(body);
  return (
    <Text style={style} numberOfLines={numberOfLines}>
      {parts.map((p, i) =>
        p.kind === 'text' ? (
          p.value
        ) : (
          <Text
            key={i}
            style={[style, { color: colors.primaryText }]}
            accessibilityRole="link"
            suppressHighlighting={false}
            onPress={() => {
              if (p.kind === 'url') openUrl(p.value);
              else if (p.kind === 'tag') router.push({ pathname: '/tag/[tag]', params: { tag: p.value } });
              else router.push({ pathname: '/member/[handle]', params: { handle: p.value } });
            }}>
            {p.kind === 'url' ? shortUrl(p.value) : p.raw}
          </Text>
        ),
      )}
    </Text>
  );
}
