import type { createScheduleRepository } from '../repositories/schedule.repository';
import { generateRitualOccurrences } from './ritual-occurrences';
import { HttpError } from '../middleware/error.middleware';

type ScheduleRepository = ReturnType<typeof createScheduleRepository>;

export function createScheduleService(repository: ScheduleRepository) {
  return {
    list(from: string, to: string) {
      const start = new Date(`${from}T00:00:00.000Z`);
      const end = new Date(`${to}T00:00:00.000Z`);
      const dayCount = (end.valueOf() - start.valueOf()) / 86_400_000 + 1;
      if (dayCount < 1 || dayCount > 62) {
        throw new HttpError(400, 'Schedule range must contain between 1 and 62 days');
      }
      const toExclusive = new Date(end.valueOf() + 86_400_000)
        .toISOString()
        .slice(0, 10);
      const bookings = repository.bookings(
        `${from}T00:00:00`,
        `${toExclusive}T00:00:00`,
      ).map((booking) => ({
        type: 'booking' as const,
        id: Number(booking.id),
        title: String(booking.homam_name),
        time: String(booking.scheduled_at),
        status: String(booking.status),
      }));

      const done = new Set(repository.ritualLogs(from, to)
        .map((log) => `${log.ritual_id}:${log.date}`));
      const rituals = generateRitualOccurrences(repository.rituals(), from, to)
        .map((occurrence) => {
          const isDone = done.has(`${occurrence.id}:${occurrence.date}`);
          return {
            type: 'ritual' as const,
            id: occurrence.id,
            title: occurrence.title,
            time: `${occurrence.date}T${occurrence.time}`,
            status: isDone ? 'done' : 'pending',
            done: isDone,
          };
        });

      return [...bookings, ...rituals].sort((left, right) =>
        left.time.localeCompare(right.time)
        || left.type.localeCompare(right.type)
        || left.id - right.id,
      );
    },
  };
}
