import { User } from './model';
import { canCreateUser } from './permissions';
import { ok } from '../shared';

export const createUser = (id: string) => {
  canCreateUser();
  return ok(new User(id));
};
