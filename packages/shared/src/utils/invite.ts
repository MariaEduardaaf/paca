import {
  INVITE_CODE_PREFIX,
  INVITE_CODE_MIN_LENGTH,
  INVITE_CODE_MAX_LENGTH,
} from "../constants/categories";

// Codes are generated server-side by the create_couple RPC (migration 00024).
// Legacy couples may still hold 4-char codes, so validation accepts 4–10.
export function isValidInviteCode(code: string): boolean {
  const pattern = new RegExp(
    `^${INVITE_CODE_PREFIX}-[A-HJ-NP-Z2-9]{${INVITE_CODE_MIN_LENGTH},${INVITE_CODE_MAX_LENGTH}}$`
  );
  return pattern.test(code.toUpperCase());
}

export function normalizeInviteCode(code: string): string {
  return code.toUpperCase().trim();
}
