import type { Category, ExpenseInput } from './types';
import { toISODate } from './format';

const SAMPLES: Record<Category, { items: string[]; min: number; max: number; weight: number }> = {
  Food: {
    items: ['Grocery run', 'Coffee shop', 'Lunch with team', 'Pizza night', 'Farmers market', 'Sushi dinner', 'Bakery'],
    min: 4,
    max: 95,
    weight: 10,
  },
  Transportation: {
    items: ['Gas station', 'Uber ride', 'Monthly transit pass', 'Parking', 'Car wash', 'Train ticket'],
    min: 3,
    max: 70,
    weight: 5,
  },
  Entertainment: {
    items: ['Movie tickets', 'Concert', 'Streaming subscription', 'Bowling', 'Video game', 'Museum entry'],
    min: 8,
    max: 120,
    weight: 3,
  },
  Shopping: {
    items: ['New sneakers', 'Books', 'Home decor', 'Electronics accessory', 'Clothing', 'Gift for a friend'],
    min: 12,
    max: 180,
    weight: 3,
  },
  Bills: {
    items: ['Electricity bill', 'Internet', 'Phone plan', 'Water bill', 'Gym membership', 'Insurance'],
    min: 25,
    max: 160,
    weight: 2,
  },
  Other: {
    items: ['Haircut', 'Charity donation', 'Pharmacy', 'Dry cleaning', 'Pet supplies'],
    min: 5,
    max: 60,
    weight: 2,
  },
};

/** Generates ~6 months of realistic-looking demo expenses ending today. */
export function generateSampleExpenses(count = 75): ExpenseInput[] {
  const pool = (Object.keys(SAMPLES) as Category[]).flatMap((c) => Array<Category>(SAMPLES[c].weight).fill(c));
  const today = new Date();
  const result: ExpenseInput[] = [];

  for (let i = 0; i < count; i++) {
    const category = pool[Math.floor(Math.random() * pool.length)];
    const { items, min, max } = SAMPLES[category];
    const daysAgo = Math.floor(Math.random() * 180);
    const date = new Date(today.getFullYear(), today.getMonth(), today.getDate() - daysAgo);
    result.push({
      date: toISODate(date),
      category,
      description: items[Math.floor(Math.random() * items.length)],
      amount: Math.round((min + Math.random() * (max - min)) * 100) / 100,
    });
  }
  return result;
}
