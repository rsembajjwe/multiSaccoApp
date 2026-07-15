import { pbkdf2Sync, randomBytes, randomUUID, timingSafeEqual, createHash } from "node:crypto";

const iterations = 210000;
const keyLength = 32;
const digest = "sha256";

export function hashPassword(password, salt = randomBytes(16).toString("hex")) {
  const hash = pbkdf2Sync(password, salt, iterations, keyLength, digest).toString("hex");
  return { hash, salt };
}

export function verifyPassword(password, salt, expectedHash) {
  const { hash } = hashPassword(password, salt);
  const actual = Buffer.from(hash, "hex");
  const expected = Buffer.from(expectedHash, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export function createToken() {
  return `${randomUUID()}.${randomBytes(32).toString("base64url")}`;
}

export function hashToken(token) {
  return createHash("sha256").update(token).digest("hex");
}

export function newId(prefix) {
  return `${prefix}_${randomUUID()}`;
}
