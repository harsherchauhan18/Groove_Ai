/**
 * groove-ai — Shared Utilities
 * Small, framework-agnostic helpers used across packages.
 */

/**
 * Sleep for `ms` milliseconds.
 */
export const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Truncate a string to `maxLen` characters, appending `…` if trimmed.
 */
export const truncate = (str: string, maxLen = 100): string =>
  str.length <= maxLen ? str : `${str.slice(0, maxLen - 1)}…`;

/**
 * Convert a GitHub HTTPS URL to a short "owner/repo" slug.
 * e.g. "https://github.com/torvalds/linux.git" → "torvalds/linux"
 */
export const repoUrlToSlug = (url: string): string => {
  const match = url.match(/github\.com[/:]([\w.-]+)\/([\w.-]+?)(?:\.git)?$/);
  if (!match) throw new Error(`Cannot parse repo URL: ${url}`);
  return `${match[1]}/${match[2]}`;
};

/**
 * Safely parse JSON, returning `null` on failure.
 */
export const safeJsonParse = <T = unknown>(raw: string): T | null => {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
};

/**
 * Format a date string into a human-readable relative time label.
 * e.g. "2 hours ago", "3 days ago"
 */
export const timeAgo = (dateStr: string): string => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
};

/**
 * Pick a subset of keys from an object.
 */
export const pick = <T extends object, K extends keyof T>(
  obj: T,
  keys: K[]
): Pick<T, K> =>
  keys.reduce((acc, key) => {
    acc[key] = obj[key];
    return acc;
  }, {} as Pick<T, K>);
