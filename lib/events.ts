import type { StoreEvent } from '@/lib/cms';

const DAY_MS = 24 * 60 * 60 * 1000;
const zone = 'America/New_York';
export const formatEventDate = (iso: string) => new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', timeZone: zone }).format(new Date(iso));
export const formatEventTime = (iso: string) => new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', timeZone: zone }).format(new Date(iso));

function addDays(iso: string, days: number) { return new Date(new Date(iso).getTime() + days * DAY_MS).toISOString(); }
export function upcomingOccurrences(events: StoreEvent[], now = new Date()): StoreEvent[] {
  const result: StoreEvent[] = [];
  for (const event of events) {
    if (!event.published) continue;
    if (event.recurrence !== 'weekly') { if (new Date(event.ends_at || event.starts_at) >= now) result.push(event); continue; }
    const first = new Date(event.starts_at);
    const end = new Date(event.ends_at || event.starts_at);
    const targetDay = event.recurrence_day ?? first.getUTCDay();
    let cursor = first;
    while (cursor < now) cursor = new Date(addDays(cursor.toISOString(), 1));
    while (cursor.getTime() - first.getTime() < 370 * DAY_MS && result.length < 12) {
      if (cursor.getUTCDay() === targetDay) {
        const weeks = Math.floor((cursor.getTime() - first.getTime()) / (7 * DAY_MS));
        if (!event.max_occurrences || weeks < event.max_occurrences) result.push({ ...event, id: `${event.id}-${cursor.toISOString().slice(0, 10)}`, starts_at: cursor.toISOString(), ends_at: event.ends_at ? addDays(cursor.toISOString(), (end.getTime() - first.getTime()) / DAY_MS) : null });
      }
      cursor = new Date(addDays(cursor.toISOString(), 1));
    }
  }
  return result.sort((a, b) => a.sort_order - b.sort_order || new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime()).slice(0, 12);
}
