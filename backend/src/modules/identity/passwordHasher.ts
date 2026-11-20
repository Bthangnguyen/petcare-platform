import crypto from 'node:crypto';

/** Hashes and verifies passwords with scrypt; passwords are never stored in clear text (NFR-08). */
export class PasswordHasher {
  hash(password: string): string {
    const salt = crypto.randomBytes(16);
    const key = crypto.scryptSync(password, salt, 32);
    return `scrypt$${salt.toString('hex')}$${key.toString('hex')}`;
  }

  verify(password: string, stored: string): boolean {
    const [scheme, saltHex, keyHex] = stored.split('$');
    if (scheme !== 'scrypt' || !saltHex || !keyHex) return false;
    const expected = Buffer.from(keyHex, 'hex');
    const actual = crypto.scryptSync(password, Buffer.from(saltHex, 'hex'), expected.length);
    return crypto.timingSafeEqual(expected, actual);
  }
}
