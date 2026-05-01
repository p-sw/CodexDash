import * as argon2 from 'argon2';
import { hashPassword, verifyPassword } from './password-hasher';

describe('password-hasher', () => {
  it('hashes passwords into an argon2id digest that can be verified', async () => {
    const digest = await hashPassword('correct horse battery staple');

    expect(digest.startsWith('$argon2id$')).toBe(true);
    await expect(
      verifyPassword(digest, 'correct horse battery staple'),
    ).resolves.toBe(true);
    await expect(verifyPassword(digest, 'wrong password')).resolves.toBe(false);
  });

  it('verifies legacy node-argon2 digests', async () => {
    const legacyDigest = await argon2.hash('legacy secret');

    await expect(verifyPassword(legacyDigest, 'legacy secret')).resolves.toBe(
      true,
    );
    await expect(verifyPassword(legacyDigest, 'wrong password')).resolves.toBe(
      false,
    );
  });
});
