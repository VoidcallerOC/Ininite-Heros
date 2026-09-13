import test from 'node:test';
import assert from 'node:assert/strict';
import { fallbackPublicSiteData } from '@/lib/fallback-content';

test('fallback business hours use the Sunday=0 convention', () => {
  assert.deepEqual(
    fallbackPublicSiteData.hours.map((hour) => [hour.day_of_week, hour.label, hour.open_time, hour.close_time, hour.is_closed]),
    [
      [0, 'Sunday', '12:00', '17:00', false],
      [1, 'Monday', null, null, true],
      [2, 'Tuesday', '11:00', '16:00', false],
      [3, 'Wednesday', '11:00', '19:00', false],
      [4, 'Thursday', '11:00', '19:00', false],
      [5, 'Friday', '11:00', '19:00', false],
      [6, 'Saturday', '11:00', '19:00', false],
    ],
  );
});
