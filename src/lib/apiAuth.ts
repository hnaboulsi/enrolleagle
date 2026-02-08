import { requireSessionUser } from '@/src/lib/session';

export async function requireApiUser() {
  return requireSessionUser();
}
