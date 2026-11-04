import { CheckmarkCircle02Icon, SquareLock02Icon } from '@hugeicons/core-free-icons';
import { MEMBER_GOALS, FEATURES } from '@koina/shared/features';
import { useFeatures } from '@/lib/features';
import { t } from '@/lib/i18n';
import { Icon } from './Icon';

/** Topluluk büyüdükçe ne açılacak. Güncel üye sayısı bilerek yok: topluluk sayıları gösterilmiyor. */
export function FeatureLadder() {
  const features = useFeatures();
  return (
    <section aria-labelledby="ladder-title" className="rounded-3xl border border-line p-5">
      <h2 id="ladder-title" className="text-lg font-bold">
        {t.ladder.title}
      </h2>
      <p className="mt-1 text-[0.9375rem] text-muted">{t.ladder.lead}</p>
      <ul className="mt-4 space-y-3">
        {FEATURES.map((f) => (
          <li key={f} className="flex items-start gap-3">
            <Icon icon={features[f] ? CheckmarkCircle02Icon : SquareLock02Icon} size={20} className={`mt-0.5 shrink-0 ${features[f] ? 'text-primary-text' : 'text-muted'}`} />
            <span className="min-w-0">
              <span className="block font-semibold">{t.ladder.items[f]}</span>
              <span className="block text-sm text-muted">{features[f] ? t.ladder.open : t.ladder.goal(MEMBER_GOALS[f])}</span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
