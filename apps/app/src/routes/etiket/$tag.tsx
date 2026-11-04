import { createFileRoute, notFound } from '@tanstack/react-router';
import { normalizeTag } from '@koina/shared/api';
import { ComposeFab } from '@/components/Layout';
import { PageHeader } from '@/components/PageHeader';
import { PostList } from '@/components/PostList';
import { t } from '@/lib/i18n';
import { feedQuery } from '@/lib/queries';
import { breadcrumbs, seo, webPage } from '@/lib/seo';
import { useMe } from '@/lib/session';

const TAG = /^[\p{L}\p{N}_]{2,40}$/u;

export const Route = createFileRoute('/etiket/$tag')({
  // Etiket karşılaştırması Türkçe küçük harfle; `/etiket/AçıkVeri` ile `/etiket/açıkveri` aynı sayfa.
  params: {
    parse: (p) => ({ tag: normalizeTag(p.tag.replace(/^#/, '')) }),
    stringify: (p) => ({ tag: p.tag }),
  },
  loader: async ({ context, params }) => {
    if (!TAG.test(params.tag)) throw notFound();
    await context.queryClient.ensureInfiniteQueryData(feedQuery({ tag: params.tag }));
  },
  head: ({ match, params }) => {
    const appUrl = match.context.config.appUrl;
    const path = `/etiket/${encodeURIComponent(params.tag)}`;
    return seo({
      appUrl,
      title: t.tags.title(params.tag),
      description: t.tags.description(params.tag),
      path,
      jsonLd: [webPage(appUrl, t.tags.title(params.tag), t.tags.description(params.tag), path), breadcrumbs(appUrl, [{ name: t.tags.title(params.tag), path }])],
    });
  },
  component: TagPage,
});

function TagPage() {
  const { tag } = Route.useParams();
  const me = useMe();
  return (
    <>
      <PageHeader title={t.tags.title(tag)} back="/home" />
      <PostList key={tag} params={{ tag }} empty={t.feed.emptyTag} />
      {me && <ComposeFab />}
    </>
  );
}
