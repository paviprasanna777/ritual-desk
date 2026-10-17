import { HttpError } from '../middleware/error.middleware';
import type { createDevoteesRepository, DevoteeInput } from '../repositories/devotees.repository';

export function createDevoteesService(repository: ReturnType<typeof createDevoteesRepository>) {
  return {
    list(search: string) {
      return repository.list(search);
    },

    get(id: number) {
      const devotee = repository.findById(id);
      if (!devotee) throw new HttpError(404, 'Devotee not found');
      return {
        ...devotee,
        bookings: repository.bookings(id),
        total_balance_due: repository.totalBalanceDue(id),
      };
    },

    create(input: DevoteeInput) {
      return repository.create(input);
    },

    update(id: number, input: DevoteeInput) {
      const devotee = repository.update(id, input);
      if (!devotee) throw new HttpError(404, 'Devotee not found');
      return devotee;
    },

    delete(id: number) {
      if (!repository.findById(id)) throw new HttpError(404, 'Devotee not found');
      if (repository.hasBookings(id)) {
        throw new HttpError(409, 'Cannot delete a devotee with bookings');
      }
      repository.delete(id);
    },
  };
}
