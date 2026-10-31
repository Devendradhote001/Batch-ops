import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import relativeTime from 'dayjs/plugin/relativeTime';
import { APP_TIMEZONE } from '@batchops/shared';

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(relativeTime);

export { dayjs };

/** The current moment in IST — all "today" logic in the UI uses this, never the browser's zone. */
export function nowIST() {
  return dayjs().tz(APP_TIMEZONE);
}

export function formatDateTime(value: string | Date) {
  return dayjs(value).tz(APP_TIMEZONE).format('D MMM YYYY, h:mm A');
}

export function greetingIST() {
  const hour = nowIST().hour();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}
