import { Stack } from 'expo-router';
import { BlogCard } from '@/components/blog-card';
import { Empty, ErrorNote, Loading } from '@/components/misc';
import { Screen } from '@/components/screen';
import { errorText, t } from '@/lib/i18n';
import { useBlog } from '@/lib/queries';

export default function Blog() {
  const blog = useBlog();
  return (
    <Screen inset={false} refreshing={blog.isRefetching} onRefresh={() => blog.refetch()}>
      <Stack.Screen options={{ title: t.blog.title }} />
      {blog.isPending ? (
        <Loading />
      ) : blog.isError ? (
        <ErrorNote text={errorText(blog.error)} retryLabel={t.common.retry} onRetry={() => blog.refetch()} />
      ) : blog.data.posts.length === 0 ? (
        <Empty icon="News01Icon" text={t.blog.empty} />
      ) : (
        blog.data.posts.map((post, i) => <BlogCard key={post.slug} post={post} large={i === 0} />)
      )}
    </Screen>
  );
}
