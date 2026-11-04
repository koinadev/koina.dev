import { BubbleChatIcon } from '@hugeicons/core-free-icons';
import type { Post } from '@koina/shared/api';
import { useSuspenseQuery } from '@tanstack/react-query';
import { createFileRoute, notFound } from '@tanstack/react-router';
import { Composer } from '@/components/Composer';
import { PageHeader } from '@/components/PageHeader';
import { PostItem, PostLarge } from '@/components/PostItem';
import { SignInStrip } from '@/components/SignInStrip';
import { EmptyState } from '@/components/ui';
import { excerpt } from '@/lib/format';
import { isMissing } from '@/lib/guards';
import { t } from '@/lib/i18n';
import { threadQuery } from '@/lib/queries';
import { absolute, breadcrumbs, seo } from '@/lib/seo';
import { useMe } from '@/lib/session';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const Route = createFileRoute('/akis/$id')({
  loader: async ({ context, params }) => {
    if (!UUID.test(params.id)) throw notFound({ data: { text: t.feed.notFound } });
    try {
      return await context.queryClient.ensureQueryData(threadQuery(params.id));
    } catch (err) {
      if (isMissing(err)) throw notFound({ data: { text: t.feed.notFound } });
      throw err;
    }
  },
  head: ({ match, loaderData }) => {
    const appUrl = match.context.config.appUrl;
    if (!loaderData) return seo({ appUrl, title: t.feed.thread, description: t.feed.notFound, path: `/akis/${match.params.id}`, noindex: true });
    const post = loaderData.post;
    const path = `/akis/${post.id}`;
    const title = `${post.author.name}: “${excerpt(post.body || t.feed.thread, 70)}”`;
    const image = post.media[0];
    return seo({
      appUrl,
      title,
      description: excerpt(post.body || `${post.author.name} (@${post.author.handle})`),
      path,
      type: 'article',
      image: image?.url ?? post.preview?.image ?? null,
      imageAlt: image?.alt,
      // Gizlenmiş gönderi yalnız yazarına ve moderatöre açılır; dizine girmemeli.
      noindex: !!post.hidden,
      jsonLd: [postingLd(appUrl, post, loaderData.replies.length), breadcrumbs(appUrl, [{ name: t.feed.thread, path }])],
    });
  },
  component: ThreadPage,
});

function postingLd(appUrl: string, post: Post, replyCount: number) {
  return {
    '@type': 'SocialMediaPosting',
    '@id': absolute(appUrl, `/akis/${post.id}`),
    url: absolute(appUrl, `/akis/${post.id}`),
    headline: excerpt(post.body || post.author.name, 110),
    articleBody: post.body,
    datePublished: post.createdAt,
    inLanguage: 'tr',
    author: { '@type': 'Person', name: post.author.name, alternateName: `@${post.author.handle}` },
    ...(post.media.length ? { image: post.media.map((m) => m.url) } : {}),
    ...(post.preview ? { sharedContent: { '@type': 'WebPage', url: post.preview.url, headline: post.preview.title } } : {}),
    ...(post.parentId ? { isPartOf: absolute(appUrl, `/akis/${post.rootId ?? post.parentId}`) } : {}),
    commentCount: Math.max(post.replies, replyCount),
    interactionStatistic: [
      { '@type': 'InteractionCounter', interactionType: 'https://schema.org/LikeAction', userInteractionCount: post.claps },
      { '@type': 'InteractionCounter', interactionType: 'https://schema.org/CommentAction', userInteractionCount: post.replies },
      { '@type': 'InteractionCounter', interactionType: 'https://schema.org/ShareAction', userInteractionCount: post.reposts + post.quotes },
    ],
  };
}

function ThreadPage() {
  const { id } = Route.useParams();
  const me = useMe();
  const { data } = useSuspenseQuery(threadQuery(id));

  return (
    <>
      <PageHeader title={t.feed.thread} back="/home" />
      {data.ancestors.map((p) => (
        <PostItem key={p.id} post={p} connector />
      ))}
      <PostLarge post={data.post} />
      {me ? (
        <div id="reply-box" className="border-b border-line">
          <Composer key={data.post.id} parent={data.post} />
        </div>
      ) : (
        <SignInStrip text={t.feed.signInToPost} />
      )}
      {data.replies.length === 0 ? (
        <EmptyState icon={BubbleChatIcon} text={t.feed.emptyReplies} />
      ) : (
        <section aria-labelledby="replies-title">
          <h2 id="replies-title" className="sr-only">
            {t.feed.replies}
          </h2>
          {data.replies.map((r) => (
            <PostItem key={r.id} post={r} />
          ))}
        </section>
      )}
    </>
  );
}
