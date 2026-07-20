import { cookies } from 'next/headers';
import { AuthorizationError } from './errors';
import { AuthService } from './services/auth.service';

export interface JWTPayload {
  userId: string;
  email: string;
  role: string;
  isSeller: boolean;
  name: string;
}

export async function getSession(): Promise<JWTPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth-token')?.value;
  if (!token) return null;
  return AuthService.verifyAccessToken(token);
}

export function canAccessSeller(session: JWTPayload | null): session is JWTPayload {
  return !!session && (session.isSeller || session.role === 'admin');
}

export function canAccessShipper(session: JWTPayload | null): session is JWTPayload {
  return !!session && (session.role === 'shipper' || session.role === 'admin');
}

export async function requireAdmin(): Promise<JWTPayload> {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    throw new AuthorizationError('Admin access required');
  }
  return session;
}