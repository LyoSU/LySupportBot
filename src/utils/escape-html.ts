/**
 * Escapes HTML special characters to prevent XSS attacks
 * @param s - The string to escape
 * @returns The escaped string safe for HTML interpolation
 */
export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
