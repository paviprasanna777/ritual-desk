import { HttpError } from '../middleware/error.middleware';
import type { createHomamsRepository, HomamInput } from '../repositories/homams.repository';

export function createHomamsService(repository: ReturnType<typeof createHomamsRepository>) {
  return {
    list(all: boolean) {
      return repository.list(all);
    },

    create(input: HomamInput) {
      return repository.create(input);
    },

    update(id: number, input: HomamInput) {
      const homam = repository.update(id, input);
      if (!homam) throw new HttpError(404, 'Homam type not found');
      return homam;
    },

    delete(id: number) {
      if (!repository.softDelete(id)) {
        throw new HttpError(404, 'Homam type not found');
      }
    },
  };
}
