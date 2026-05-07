export function createAbortSignal(timeoutMs) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs || 60000);

  return {
    signal: controller.signal,
    clear: () => clearTimeout(timeoutId)
  };
}

export async function postJson(url, payload, timeoutMs) {
  const timeout = createAbortSignal(timeoutMs);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: timeout.signal
    });

    const data = await response.json().catch(async () => ({ error: await response.text() }));

    if (!response.ok) {
      const detail = data?.error?.message || data?.error || response.statusText;
      throw new Error(`HTTP ${response.status}: ${detail}`);
    }

    return data;
  } finally {
    timeout.clear();
  }
}
