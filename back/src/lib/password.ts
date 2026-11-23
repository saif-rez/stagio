// Argon2id via @node-rs/argon2 (prebuilt binaries, no native toolchain needed).
import { hash, verify } from "@node-rs/argon2";

// OWASP-recommended Argon2id parameters (19 MiB, 2 iterations, 1 lane).
const options = { memoryCost: 19456, timeCost: 2, parallelism: 1 } as const;

export const hashPassword = (password: string) => hash(password, options);

export async function verifyPassword(passwordHash: string, password: string) {
  try {
    return await verify(passwordHash, password);
  } catch {
    return false;
  }
}

/** Hash used to keep login timing identical when the email does not exist. */
let dummyHash: Promise<string> | null = null;
export function getDummyHash() {
  dummyHash ??= hashPassword("stagio-dummy-password");
  return dummyHash;
}
