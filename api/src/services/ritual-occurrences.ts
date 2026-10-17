export interface ScheduledRitual {
  id: number;
  title: string;
  type: 'daily' | 'weekly' | 'monthly' | 'festival' | 'special';
  time: string | null;
  days_of_week: string | null;
  day_of_month: number | null;
  date: string | null;
}

export interface RitualOccurrence {
  id: number;
  title: string;
  date: string;
  time: string;
}

function utcDate(date: string): Date {
  return new Date(`${date}T00:00:00.000Z`);
}

function dateString(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function generateRitualOccurrences(
  rituals: readonly ScheduledRitual[],
  from: string,
  to: string,
): RitualOccurrence[] {
  const start = utcDate(from);
  const end = utcDate(to);
  if (
    Number.isNaN(start.valueOf())
    || Number.isNaN(end.valueOf())
    || start > end
  ) {
    throw new RangeError('Invalid ritual occurrence date range');
  }

  const occurrences: RitualOccurrence[] = [];
  for (const ritual of rituals) {
    if (ritual.type === 'festival' || ritual.type === 'special') {
      if (ritual.date && ritual.date >= from && ritual.date <= to) {
        occurrences.push({
          id: ritual.id,
          title: ritual.title,
          date: ritual.date,
          time: ritual.time ?? '00:00',
        });
      }
      continue;
    }

    for (let cursor = new Date(start); cursor <= end; cursor.setUTCDate(cursor.getUTCDate() + 1)) {
      const occurrenceDate = dateString(cursor);
      let occurs = ritual.type === 'daily';
      if (ritual.type === 'weekly') {
        occurs = (ritual.days_of_week ?? '')
          .split(',')
          .includes(String(cursor.getUTCDay()));
      } else if (ritual.type === 'monthly' && ritual.day_of_month !== null) {
        const lastDay = new Date(Date.UTC(
          cursor.getUTCFullYear(),
          cursor.getUTCMonth() + 1,
          0,
        )).getUTCDate();
        occurs = cursor.getUTCDate() === Math.min(ritual.day_of_month, lastDay);
      }
      if (occurs) {
        occurrences.push({
          id: ritual.id,
          title: ritual.title,
          date: occurrenceDate,
          time: ritual.time ?? '00:00',
        });
      }
    }
  }
  return occurrences;
}
