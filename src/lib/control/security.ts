import { timingSafeEqual } from "node:crypto";

/** Compare secrets without leaking their contents or length-dependent timing. */
export function secretEquals(candidate: string, expected: string) {
  const left = Buffer.from(candidate, "utf8");
  const right = Buffer.from(expected, "utf8");
  return left.length === right.length && timingSafeEqual(left, right);
}
