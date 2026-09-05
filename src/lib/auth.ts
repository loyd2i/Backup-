import { db } from './db';
import { cookies } from 'next/headers';

// Hash simple pour les mots de passe (en production, utiliser bcrypt)
// Updated: force cache invalidation
export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + 'studiolib_salt_2024');
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  const hash = await hashPassword(password);
  return hash === hashedPassword;
}

// Session management
export async function createSession(userId: string): Promise<string> {
  const token = crypto.randomUUID();
  return token;
}

export async function getCurrentUser(): Promise<{
  id: string; email: string; name: string; role: string; phone?: string | null; avatar?: string | null;
  bio?: string | null; city?: string | null; genre?: string | null;
  instagram?: string | null; spotify?: string | null; soundcloud?: string | null; youtube?: string | null; website?: string | null;
} | null> {
  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get('user_id')?.value;

    if (!userId) return null;

    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        id: true, email: true, name: true, role: true, phone: true, avatar: true,
        bio: true, city: true, genre: true,
        instagram: true, spotify: true, soundcloud: true, youtube: true, website: true,
      }
    });

    return user;
  } catch {
    return null;
  }
}

export async function requireAuth(): Promise<{ id: string; email: string; name: string; role: string }> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error('Non autorisé');
  }
  return user;
}
