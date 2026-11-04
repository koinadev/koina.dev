import type { BlogPost } from '@koina/shared/api';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { formatDay, t } from '@/lib/i18n';
import { colors, font, radius } from '@/lib/theme';
import { Card } from './card';
import { Text } from './text';

/** Yazı kartı; `large` listenin başındaki son yazı için kapaklı geniş hâl. */
export function BlogCard({ post, large }: { post: BlogPost; large?: boolean }) {
  const open = () => router.push({ pathname: '/blog/[slug]', params: { slug: post.slug } });
  return (
    <Card onPress={open} style={[{ gap: 10 }, large && { padding: 0, overflow: 'hidden' }]}>
      {large && post.cover && (
        <Image source={post.cover} accessibilityLabel={post.coverAlt} style={styles.cover} contentFit="cover" transition={150} />
      )}
      <View style={[{ gap: 6 }, large && { padding: 18, paddingTop: 4 }]}>
        <Text variant="small" style={{ fontSize: 13 }}>
          {formatDay(post.date)} · {t.blog.minutes(post.minutes)}
        </Text>
        <Text style={large ? styles.titleLarge : styles.title}>{post.title}</Text>
        <Text variant="small" numberOfLines={large ? 3 : 2} style={{ fontSize: 14.5, lineHeight: 21 }}>
          {post.description}
        </Text>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  cover: { width: '100%', aspectRatio: 1200 / 630, backgroundColor: colors.tint, borderTopLeftRadius: radius.md, borderTopRightRadius: radius.md },
  title: { fontFamily: font.bold, fontSize: 17, lineHeight: 22, color: colors.fg },
  titleLarge: { fontFamily: font.bold, fontSize: 21, lineHeight: 27, letterSpacing: -0.3, color: colors.fg },
});
