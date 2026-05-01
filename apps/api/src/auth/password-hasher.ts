type BunPasswordApi = {
  hash(password: string, options?: { algorithm?: 'argon2id' }): Promise<string>;
  verify(password: string, digest: string): Promise<boolean>;
};

function getBunPasswordApi(): BunPasswordApi | undefined {
  const runtime = globalThis as typeof globalThis & {
    Bun?: {
      password?: BunPasswordApi;
    };
  };

  return runtime.Bun?.password;
}

function loadArgon2(): typeof import('argon2') {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('argon2') as typeof import('argon2');
}

export async function hashPassword(password: string): Promise<string> {
  const bunPassword = getBunPasswordApi();
  if (bunPassword) {
    return bunPassword.hash(password, { algorithm: 'argon2id' });
  }

  const argon2 = loadArgon2();
  return argon2.hash(password);
}

export async function verifyPassword(
  digest: string,
  password: string,
): Promise<boolean> {
  const bunPassword = getBunPasswordApi();
  if (bunPassword) {
    return bunPassword.verify(password, digest);
  }

  const argon2 = loadArgon2();
  return argon2.verify(digest, password);
}
