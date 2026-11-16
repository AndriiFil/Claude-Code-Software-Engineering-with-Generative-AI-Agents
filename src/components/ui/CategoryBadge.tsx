import { CATEGORY_META } from '@/lib/categories';
import type { Category } from '@/lib/types';

export function CategoryBadge({ category }: { category: Category }) {
  const { badge, icon: Icon } = CATEGORY_META[category];
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${badge}`}>
      <Icon className="h-3 w-3" aria-hidden />
      {category}
    </span>
  );
}

export function CategoryIcon({ category, size = 'md' }: { category: Category; size?: 'sm' | 'md' }) {
  const { chip, icon: Icon } = CATEGORY_META[category];
  const box = size === 'sm' ? 'h-8 w-8' : 'h-10 w-10';
  return (
    <span className={`flex ${box} shrink-0 items-center justify-center rounded-xl ${chip}`} aria-hidden>
      <Icon className={size === 'sm' ? 'h-4 w-4' : 'h-5 w-5'} />
    </span>
  );
}
