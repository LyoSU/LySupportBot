import { randomBytes } from "crypto";

/**
 * Generates a cryptographically secure random token for webhook authentication.
 * Uses crypto.randomBytes for secure random generation.
 *
 * Telegram's secret_token must be 1-256 characters, using A-Za-z0-9_-
 * We generate 32 bytes (256 bits) and encode as hex (64 characters).
 *
 * @returns A 64-character hex string suitable for use as webhook secret_token
 */
export function generateWebhookSecret(): string {
  return randomBytes(32).toString("hex");
}

export default generateWebhookSecret;
