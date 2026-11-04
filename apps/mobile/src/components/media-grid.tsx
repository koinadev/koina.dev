import type { PostMedia } from '@koina/shared/api';
import { Image } from 'expo-image';
import { useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { t } from '@/lib/i18n';
import { colors, font, radius } from '@/lib/theme';
import { Icon } from './icon';
import { Text } from './text';

/** Tam ekran görüntüleyici: yana kaydırılarak görseller arasında gezilir, alt metin altta yazılır. */
export function ImageViewer({ media, index, onClose }: { media: PostMedia[]; index: number | null; onClose: () => void }) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [current, setCurrent] = useState(index ?? 0);
  const item = media[current];
  return (
    <Modal visible={index !== null} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.viewer}>
        {index !== null && (
          <FlatList
            data={media}
            horizontal
            pagingEnabled
            initialScrollIndex={index}
            getItemLayout={(_d, i) => ({ length: width, offset: width * i, index: i })}
            showsHorizontalScrollIndicator={false}
            keyExtractor={(m) => m.id}
            onMomentumScrollEnd={(e) => setCurrent(Math.round(e.nativeEvent.contentOffset.x / width))}
            renderItem={({ item: m }) => (
              <Pressable onPress={onClose} style={{ width, height, justifyContent: 'center' }} accessibilityLabel={m.alt || undefined}>
                <Image source={{ uri: m.url }} style={{ width, height: height * 0.8 }} contentFit="contain" transition={150} />
              </Pressable>
            )}
          />
        )}
        <Pressable
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel={t.feed.close}
          hitSlop={10}
          style={[styles.close, { top: insets.top + 8 }]}>
          <Icon name="Cancel01Icon" size={22} color="#fff" />
        </Pressable>
        {media.length > 1 && (
          <Text style={[styles.counter, { top: insets.top + 16 }]}>{t.feed.image(current + 1, media.length)}</Text>
        )}
        {!!item?.alt && (
          <View style={[styles.alt, { paddingBottom: insets.bottom + 16 }]}>
            <Text style={styles.altText}>{item.alt}</Text>
          </View>
        )}
      </View>
    </Modal>
  );
}

function Tile({ media, onPress, style }: { media: PostMedia; onPress: () => void; style?: object }) {
  return (
    <Pressable onPress={onPress} style={[styles.tile, style]} accessibilityRole="imagebutton" accessibilityLabel={media.alt || undefined}>
      <Image source={{ uri: media.url }} style={StyleSheet.absoluteFill} contentFit="cover" transition={150} />
      {!!media.alt && (
        <View style={styles.altBadge}>
          <Text style={styles.altBadgeText}>ALT</Text>
        </View>
      )}
    </Pressable>
  );
}

/**
 * Gönderi görselleri (1-4): tek görsel kendi oranında, fazlası X'teki gibi ızgarada. Dokununca tam ekran açılır.
 * `compact`: alıntı içinde alçak bir şerit; alıntılanan gönderi asıl gönderiyi gölgelemesin.
 */
export function MediaGrid({ media, compact }: { media: PostMedia[]; compact?: boolean }) {
  const [open, setOpen] = useState<number | null>(null);
  if (media.length === 0) return null;
  const tile = (i: number, style?: object) => <Tile key={media[i]!.id} media={media[i]!} onPress={() => setOpen(i)} style={style} />;
  const ratio = compact ? 2.4 : media.length === 1 ? Math.min(Math.max(media[0]!.width / media[0]!.height, 0.75), 1.9) : 16 / 9;

  return (
    <>
      <View style={[styles.grid, { aspectRatio: ratio }]}>
        {media.length === 1 && tile(0, { flex: 1 })}
        {media.length === 2 && [tile(0, { flex: 1 }), tile(1, { flex: 1 })]}
        {media.length === 3 && (
          <>
            {tile(0, { flex: 1 })}
            <View style={styles.column}>{[tile(1, { flex: 1 }), tile(2, { flex: 1 })]}</View>
          </>
        )}
        {media.length >= 4 && (
          <>
            <View style={styles.column}>{[tile(0, { flex: 1 }), tile(2, { flex: 1 })]}</View>
            <View style={styles.column}>{[tile(1, { flex: 1 }), tile(3, { flex: 1 })]}</View>
          </>
        )}
      </View>
      {open !== null && <ImageViewer media={media} index={open} onClose={() => setOpen(null)} />}
    </>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    gap: 2,
    width: '100%',
    borderRadius: radius.md,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#D9D7E0',
    backgroundColor: colors.tint,
  },
  column: { flex: 1, gap: 2 },
  tile: { overflow: 'hidden', backgroundColor: colors.tint },
  altBadge: { position: 'absolute', left: 8, bottom: 8, paddingHorizontal: 6, height: 20, borderRadius: 4, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center' },
  altBadgeText: { fontFamily: font.bold, fontSize: 11, lineHeight: 14, color: '#fff' },
  viewer: { flex: 1, backgroundColor: 'rgba(0,0,0,0.96)' },
  close: { position: 'absolute', left: 16, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  counter: { position: 'absolute', alignSelf: 'center', fontFamily: font.semibold, fontSize: 14, lineHeight: 18, color: '#fff' },
  alt: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 20, paddingTop: 16, backgroundColor: 'rgba(0,0,0,0.6)' },
  altText: { fontFamily: font.regular, fontSize: 15, lineHeight: 21, color: '#fff' },
});
