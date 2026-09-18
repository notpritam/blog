const LONG = new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' });

export function formatDate(iso: string): string {
  return LONG.format(new Date(iso));
}

export function isoDate(iso: string): string {
  return new Date(iso).toISOString().slice(0, 10);
}
