import bcrypt from 'bcrypt';
import { getSessionUser } from '@/src/lib/session';
import { adminEmailSet } from '@/src/lib/env';

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export async function getCurrentUser() {
  return getSessionUser();
}

export function isAdminEmail(email: string | null | undefined) {
  if (!email) return false;
  return adminEmailSet().has(email.toLowerCase());
}
