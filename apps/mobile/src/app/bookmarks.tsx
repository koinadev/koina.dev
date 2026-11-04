import { PostList } from '@/components/post-list';
import { t } from '@/lib/i18n';
import { useBookmarks } from '@/lib/queries';

/** Kaydedilenler: yalnız üyenin kendisi görür. */
export default function Bookmarks() {
  const list = useBookmarks();
  return <PostList query={list} empty={t.bookmarks.empty} emptyIcon="Bookmark02Icon" />;
}
