import type { Role } from '@batchops/shared';

/** The signed-in user, derived from the JWT and a fresh DB lookup — never from the request body. */
export interface AuthUser {
  id: string;
  role: Role;
  name: string;
  email: string;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}
