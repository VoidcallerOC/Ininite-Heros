'use client';

import { useEffect } from 'react';

const key = 'ih_analytics_session';

function sessionId() {
  try {
    const existing = sessionStorage.getItem(key);
    if (existing) return existing;
    const value = crypto.randomUUID();
    sessionStorage.setItem(key, value);
    return value;
  } catch {
    return null;
  }
}

export function AnalyticsTracker() {
  useEffect(() => {
    const controller = new AbortController();
    void fetch('/api/analytics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: window.location.pathname, referrer: document.referrer || null, sessionId: sessionId() }),
      signal: controller.signal,
      keepalive: true,
    }).catch(() => undefined);
    return () => controller.abort();
  }, []);

  return null;
}
