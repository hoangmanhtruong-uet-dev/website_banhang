import bcrypt from 'bcryptjs';

const BCRYPT_ROUNDS = 12;

export class PasswordService {
  static async hash(password: string): Promise<string> {
    return bcrypt.hash(password, BCRYPT_ROUNDS);
  }

  static async verify(password: string, hash: string): Promise<boolean> {
    if (!hash.startsWith('$2a$') && !hash.startsWith('$2b$') && !hash.startsWith('$2y$')) {
      return false;
    }
    return bcrypt.compare(password, hash);
  }
}