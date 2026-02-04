import { env } from '@/src/lib/env';
import { log } from '@/src/lib/logger';

export async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs = 15000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'User-Agent': env.PROVIDER_USER_AGENT,
        Accept: 'text/html,application/json',
        ...options.headers
      },
      signal: controller.signal
    });
    return response;
  } finally {
    clearTimeout(timer);
  }
}

export function normalizeText(input: string) {
  return input.replace(/\s+/g, ' ').trim();
}

export function safeNumber(value: string | null | undefined) {
  if (!value) return null;
  const num = Number(value.replace(/[^0-9.-]/g, ''));
  return Number.isFinite(num) ? num : null;
}

export function logProviderError(message: string, meta?: Record<string, unknown>) {
  log('error', message, meta);
}
