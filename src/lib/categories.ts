import {
  Car,
  Film,
  MoreHorizontal,
  Receipt,
  ShoppingBag,
  Utensils,
  type LucideIcon,
} from 'lucide-react';
import type { Category } from './types';

interface CategoryMeta {
  icon: LucideIcon;
  /** Hex color used for chart marks. */
  color: string;
  /** Tailwind classes for badges / icon chips (must be literal strings for JIT). */
  badge: string;
  chip: string;
}

/**
 * Chart colors follow a fixed categorical order that has been validated for
 * colorblind separation between adjacent slots (category order = slot order,
 * and charts draw segments in this same order).
 */
export const CATEGORY_META: Record<Category, CategoryMeta> = {
  Food: {
    icon: Utensils,
    color: '#2a78d6',
    badge: 'bg-blue-50 text-blue-700 ring-blue-600/20',
    chip: 'bg-blue-100 text-blue-700',
  },
  Transportation: {
    icon: Car,
    color: '#eb6834',
    badge: 'bg-orange-50 text-orange-700 ring-orange-600/20',
    chip: 'bg-orange-100 text-orange-700',
  },
  Entertainment: {
    icon: Film,
    color: '#1baf7a',
    badge: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
    chip: 'bg-emerald-100 text-emerald-700',
  },
  Shopping: {
    icon: ShoppingBag,
    color: '#eda100',
    badge: 'bg-amber-50 text-amber-700 ring-amber-600/20',
    chip: 'bg-amber-100 text-amber-700',
  },
  Bills: {
    icon: Receipt,
    color: '#e87ba4',
    badge: 'bg-pink-50 text-pink-700 ring-pink-600/20',
    chip: 'bg-pink-100 text-pink-700',
  },
  Other: {
    icon: MoreHorizontal,
    color: '#008300',
    badge: 'bg-green-50 text-green-800 ring-green-700/20',
    chip: 'bg-green-100 text-green-800',
  },
};
