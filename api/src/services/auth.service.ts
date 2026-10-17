import bcrypt from 'bcrypt';
import { createToken } from './jwt.service';
import { createAuthRepository } from '../repositories/auth.repository';
import { HttpError } from '../middleware/error.middleware';

export function createAuthService(repository: ReturnType<typeof createAuthRepository>) {
  return {
    async login(username: string, password: string) {
      const user = repository.findByUsername(username);
      const validPassword = user
        ? await bcrypt.compare(password, user.password_hash)
        : false;
      if (!user || !validPassword) {
        throw new HttpError(401, 'Invalid credentials');
      }

      return {
        token: createToken({ id: user.id, username: user.username }),
        user: { id: user.id, username: user.username, name: user.name },
      };
    },

    getCurrentUser(id: number) {
      const user = repository.findById(id);
      if (!user) throw new HttpError(401, 'Invalid credentials');
      return user;
    },
  };
}
