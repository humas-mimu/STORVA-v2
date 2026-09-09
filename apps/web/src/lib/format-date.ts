/**
 * Hydration-safe date formatting.
 *
 * Do not rely on the browser/server default locale or timezone here: SSR and
 * the browser can have different locale/timezone settings, which can make
 * the initial HTML differ and trigger a React hydration error.
 */
const DATE_LOCALE = 'en-US'
const DATE_TIMEZONE = 'UTC'

export function formatDate(dateStr: string | Date | null | undefined) {
  if (!dateStr) return '-'
  const date = dateStr instanceof Date ? dateStr : new Date(dateStr)
  if (Number.isNaN(date.getTime())) return '-'

  return new Intl.DateTimeFormat(DATE_LOCALE, {
    timeZone: DATE_TIMEZONE,
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date)
}

export function formatDateTime(dateStr: string | Date | null | undefined) {
  if (!dateStr) return '-'
  const date = dateStr instanceof Date ? dateStr : new Date(dateStr)
  if (Number.isNaN(date.getTime())) return '-'

  return new Intl.DateTimeFormat(DATE_LOCALE, {
    timeZone: DATE_TIMEZONE,
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date)
}

export function formatTime(dateStr: string | Date | null | undefined) {
  if (!dateStr) return '-'
  const date = dateStr instanceof Date ? dateStr : new Date(dateStr)
  if (Number.isNaN(date.getTime())) return '-'

  return new Intl.DateTimeFormat(DATE_LOCALE, {
    timeZone: DATE_TIMEZONE,
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
  }).format(date)
}
