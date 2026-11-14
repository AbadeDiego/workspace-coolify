import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const derive = promisify(scrypt);
const cost = { N: 32768, r: 8, p: 3, maxmem: 64 * 1024 * 1024 };
const dummySalt = Buffer.alloc(16);
export const normalizeEmail = value => String(value ?? "").trim().toLowerCase();
export const validEmail = value => value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

export function validPassword(value) {
  return typeof value === "string" && value.length >= 12 && Buffer.byteLength(value) <= 256;
}

export async function hashPassword(password) {
  const salt = randomBytes(16);
  const digest = await derive(password, salt, 64, cost);
  return { salt: salt.toString("hex"), digest: digest.toString("hex") };
}

export async function verifyPassword(password, credential) {
  const salt = credential ? Buffer.from(credential.salt, "hex") : dummySalt;
  const expected = credential ? Buffer.from(credential.digest, "hex") : Buffer.alloc(64);
  const digest = await derive(password, salt, 64, cost);
  return timingSafeEqual(digest, expected) && Boolean(credential);
}
