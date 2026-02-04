import { cookies } from 'next/headers';
import { getSessionUser } from '@/src/lib/auth';

export async function requireApiUser() {
  const token = cookies().get('cs_session')?.value;
  const user = await getSessionUser(token);
  if (!user) {
    throw new Error('Unauthorized');
  }
  return user;
}
