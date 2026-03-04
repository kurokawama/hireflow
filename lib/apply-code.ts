import { randomBytes } from "crypto";

// Generate a unique short code for apply links
export function generateApplyCode(): string {
  return randomBytes(4).toString("hex"); // 8 chars, e.g. "a1b2c3d4"
}

// Build apply link URL
export function buildApplyUrl(code: string): string {
  const baseUrl = process.env.APP_BASE_URL || "http://localhost:3000";
  return `${baseUrl}/a/${code}`;
}
