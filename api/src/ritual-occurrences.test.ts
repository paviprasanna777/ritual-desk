import { describe, expect, it } from 'vitest';
import {
  generateRitualOccurrences,
  type ScheduledRitual,
} from './services/ritual-occurrences';

const ritual = (
  values: Partial<ScheduledRitual> & Pick<ScheduledRitual, 'id' | 'title' | 'type'>,
): ScheduledRitual => ({
  time: null,
  days_of_week: null,
  day_of_month: null,
  date: null,
  ...values,
});

describe('generateRitualOccurrences', () => {
  it('generates daily occurrences including both date boundaries', () => {
    expect(generateRitualOccurrences([
      ritual({ id: 1, title: 'Daily puja', type: 'daily', time: '06:30' }),
    ], '2026-03-01', '2026-03-03')).toEqual([
      { id: 1, title: 'Daily puja', date: '2026-03-01', time: '06:30' },
      { id: 1, title: 'Daily puja', date: '2026-03-02', time: '06:30' },
      { id: 1, title: 'Daily puja', date: '2026-03-03', time: '06:30' },
    ]);
  });

  it('uses Sunday-zero weekdays for weekly occurrences', () => {
    expect(generateRitualOccurrences([
      ritual({ id: 2, title: 'Weekend puja', type: 'weekly', days_of_week: '0,6' }),
    ], '2026-10-16', '2026-10-19').map(({ date }) => date))
      .toEqual(['2026-10-17', '2026-10-18']);
  });

  it('clamps monthly days to each month end, including leap years', () => {
    expect(generateRitualOccurrences([
      ritual({ id: 3, title: 'Month end', type: 'monthly', day_of_month: 31 }),
    ], '2024-02-27', '2024-04-30').map(({ date }) => date))
      .toEqual(['2024-02-29', '2024-03-31', '2024-04-30']);
  });

  it('includes single-date rituals only when their date is in range', () => {
    const special = ritual({
      id: 4,
      title: 'Festival',
      type: 'festival',
      date: '2026-12-25',
    });
    expect(generateRitualOccurrences([special], '2026-12-25', '2026-12-25'))
      .toEqual([{ id: 4, title: 'Festival', date: '2026-12-25', time: '00:00' }]);
    expect(generateRitualOccurrences([special], '2026-12-24', '2026-12-24')).toEqual([]);
  });
});
