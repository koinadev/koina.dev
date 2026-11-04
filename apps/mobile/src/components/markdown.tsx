import { Fragment, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { siteUrl } from '@/lib/blog';
import { openUrl } from '@/lib/open';
import { colors, font, radius } from '@/lib/theme';
import { Text } from './text';

// Blog yazıları için küçük bir markdown okuyucu. Yazılar bizim içerik klasörümüzden geliyor ve
// kısa bir alt küme kullanıyor (başlık, paragraf, liste, alıntı, kod, kalın/italik, bağlantı);
// koca bir ayrıştırıcı paketi ve WebView eklemek yerine yalnız bu alt küme çiziliyor.

type Block =
  | { kind: 'h'; level: number; text: string }
  | { kind: 'p'; text: string }
  | { kind: 'ul' | 'ol'; items: string[] }
  | { kind: 'quote'; text: string }
  | { kind: 'code'; text: string }
  | { kind: 'hr' };

export function parseBlocks(md: string): Block[] {
  const lines = md.replace(/\r\n/g, '\n').split('\n');
  const blocks: Block[] = [];
  let para: string[] = [];
  const flush = () => {
    if (para.length) blocks.push({ kind: 'p', text: para.join(' ') });
    para = [];
  };
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    if (line.startsWith('```')) {
      flush();
      const code: string[] = [];
      for (i += 1; i < lines.length && !lines[i].startsWith('```'); i += 1) code.push(lines[i]);
      blocks.push({ kind: 'code', text: code.join('\n') });
      continue;
    }
    const heading = /^(#{1,4})\s+(.*)$/.exec(line);
    const bullet = /^\s*[-*]\s+(.*)$/.exec(line);
    const numbered = /^\s*\d+[.)]\s+(.*)$/.exec(line);
    if (heading) {
      flush();
      blocks.push({ kind: 'h', level: heading[1].length, text: heading[2] });
    } else if (bullet || numbered) {
      flush();
      const kind = bullet ? 'ul' : 'ol';
      const last = blocks[blocks.length - 1];
      const item = (bullet ?? numbered)![1];
      if (last?.kind === kind) last.items.push(item);
      else blocks.push({ kind, items: [item] });
    } else if (line.startsWith('>')) {
      flush();
      const last = blocks[blocks.length - 1];
      const text = line.replace(/^>\s?/, '');
      if (last?.kind === 'quote') last.text += ` ${text}`;
      else blocks.push({ kind: 'quote', text });
    } else if (/^(-{3,}|\*{3,})$/.test(line.trim())) {
      flush();
      blocks.push({ kind: 'hr' });
    } else if (line.trim() === '') {
      flush();
    } else if (/^\s{2,}\S/.test(line) && blocks[blocks.length - 1]?.kind.match(/^[uo]l$/) && para.length === 0) {
      // Liste maddesinin alt satırı.
      const last = blocks[blocks.length - 1] as { items: string[] };
      last.items[last.items.length - 1] += ` ${line.trim()}`;
    } else {
      para.push(line.trim());
    }
  }
  flush();
  return blocks;
}

/** Satır içi biçim: **kalın**, *italik* / _italik_, `kod`, [bağlantı](adres). */
function Inline({ text }: { text: string }) {
  const parts: ReactNode[] = [];
  const re = /(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\([^)]+\)|\*[^*\s][^*]*\*|_[^_\s][^_]*_)/g;
  let last = 0;
  for (const m of text.matchAll(re)) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    const token = m[0];
    const key = `${m.index}`;
    if (token.startsWith('**')) parts.push(<Text key={key} style={styles.bold}>{token.slice(2, -2)}</Text>);
    else if (token.startsWith('`')) parts.push(<Text key={key} style={styles.inlineCode}>{token.slice(1, -1)}</Text>);
    else if (token.startsWith('[')) {
      const [, label, href] = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(token)!;
      parts.push(
        <Text key={key} style={styles.link} accessibilityRole="link" onPress={() => openUrl(siteUrl(href))}>
          {label}
        </Text>,
      );
    } else parts.push(<Text key={key} style={styles.italic}>{token.slice(1, -1)}</Text>);
    last = m.index + token.length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return <>{parts.map((p, i) => <Fragment key={i}>{p}</Fragment>)}</>;
}

export function Markdown({ source }: { source: string }) {
  return (
    <View style={{ gap: 16 }}>
      {parseBlocks(source).map((b, i) => {
        switch (b.kind) {
          case 'h':
            return (
              <Text key={i} accessibilityRole="header" style={b.level <= 2 ? styles.h2 : styles.h3}>
                <Inline text={b.text} />
              </Text>
            );
          case 'p':
            return (
              <Text key={i} style={styles.p}>
                <Inline text={b.text} />
              </Text>
            );
          case 'ul':
          case 'ol':
            return (
              <View key={i} style={{ gap: 8 }}>
                {b.items.map((item, j) => (
                  <View key={j} style={styles.li}>
                    <Text style={styles.bullet}>{b.kind === 'ul' ? '•' : `${j + 1}.`}</Text>
                    <Text style={[styles.p, { flex: 1 }]}>
                      <Inline text={item} />
                    </Text>
                  </View>
                ))}
              </View>
            );
          case 'quote':
            return (
              <View key={i} style={styles.quote}>
                <Text style={[styles.p, { fontFamily: font.medium }]}>
                  <Inline text={b.text} />
                </Text>
              </View>
            );
          case 'code':
            return (
              <View key={i} style={styles.code}>
                <Text style={styles.codeText}>{b.text}</Text>
              </View>
            );
          case 'hr':
            return <View key={i} style={{ height: 1, backgroundColor: colors.line }} />;
        }
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  h2: { fontFamily: font.bold, fontSize: 23, lineHeight: 29, letterSpacing: -0.4, color: colors.fg, marginTop: 8 },
  h3: { fontFamily: font.bold, fontSize: 19, lineHeight: 25, color: colors.fg, marginTop: 4 },
  p: { fontFamily: font.regular, fontSize: 17, lineHeight: 27, color: colors.fg },
  bold: { fontFamily: font.bold },
  italic: { fontStyle: 'italic' },
  link: { color: colors.primaryText, fontFamily: font.medium, textDecorationLine: 'underline' },
  inlineCode: { fontFamily: 'Menlo', fontSize: 15, backgroundColor: colors.tint },
  li: { flexDirection: 'row', gap: 10, paddingLeft: 4 },
  bullet: { fontFamily: font.bold, fontSize: 17, lineHeight: 27, color: colors.primaryText, minWidth: 14 },
  quote: { borderLeftWidth: 4, borderLeftColor: colors.primary, paddingLeft: 14 },
  code: { backgroundColor: colors.ink, borderRadius: radius.sm, padding: 14 },
  codeText: { fontFamily: 'Menlo', fontSize: 13.5, lineHeight: 20, color: '#E8E9F5' },
});
