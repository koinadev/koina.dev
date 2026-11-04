import { Stack, useLocalSearchParams } from 'expo-router';
import { PostList } from '@/components/post-list';
import { t } from '@/lib/i18n';
import { useFeed } from '@/lib/queries';

/** Etiket sayfası: `#etiket` geçen gönderiler, en yeniden eskiye. */
export default function TagScreen() {
  const { tag } = useLocalSearchParams<{ tag: string }>();
  const feed = useFeed({ tag });
  return (
    <>
      <Stack.Screen options={{ title: `#${tag}` }} />
      <PostList query={feed} empty={t.feed.tagEmpty} emptyIcon="HashtagIcon" />
    </>
  );
}
