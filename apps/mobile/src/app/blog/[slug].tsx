import { Image } from 'expo-image';
import { Stack, useLocalSearchParams } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { Button } from '@/components/button';
import { Markdown } from '@/components/markdown';
import { ErrorNote, Loading } from '@/components/misc';
import { Screen } from '@/components/screen';
import { Text } from '@/components/text';
import { errorText, formatDay, t } from '@/lib/i18n';
import { openUrl } from '@/lib/open';
import { useBlog } from '@/lib/queries';
import { colors, radius } from '@/lib/theme';

/** Yazı uygulamanın içinde okunur; site yalnız "Sitede aç" ile açılır. */
export default function BlogPostScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const blog = useBlog();
  if (blog.isPending) return <Loading />;
  const post = blog.data?.posts.find((p) => p.slug === slug);
  if (blog.isError || !post)
    return (
      <Screen inset={false}>
        <ErrorNote text={errorText(blog.error ?? { code: 'NOT_FOUND' })} retryLabel={t.common.retry} onRetry={() => blog.refetch()} />
      </Screen>
    );

  return (
    <Screen inset={false}>
      <Stack.Screen options={{ title: '' }} />
      <Text variant="small">
        {formatDay(post.date)} · {t.blog.minutes(post.minutes)}
      </Text>
      <Text variant="display" style={{ fontSize: 30, lineHeight: 35 }}>{post.title}</Text>
      <Text style={styles.lead}>{post.description}</Text>
      {post.cover && (
        <Image source={post.cover} accessibilityLabel={post.coverAlt} style={styles.cover} contentFit="cover" transition={150} />
      )}
      <View style={{ marginTop: 8 }}>
        <Markdown source={post.body} />
      </View>
      <View style={styles.foot}>
        <Button variant="outline" small icon="Globe02Icon" label={t.blog.openSite} onPress={() => openUrl(post.url)} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  lead: { fontSize: 18, lineHeight: 27, color: colors.muted },
  cover: { width: '100%', aspectRatio: 1200 / 630, borderRadius: radius.lg, backgroundColor: colors.tint },
  foot: { marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: colors.line, alignItems: 'flex-start' },
});
