import { getDb, type Db } from '@/lib/db/client';
import { settings } from '@/lib/db/schema';

export const SETTING_DEFAULTS = {
  site_title: 'Pritam Sharma',
  site_tagline: 'Notes on building products, developer tools and AI agents.',
  site_description:
    'Writing by Pritam Sharma on building products, developer tools and AI agents, with the code and the reasoning behind it.',
  author_name: 'Pritam Sharma',
  author_bio:
    'Software engineer and founding engineer at Emergent. I build developer tools, browser extensions and agent workflows, and write down what I learn.',
  author_avatar: '/avatar.jpg',
  author_url: 'https://notpritam.in',
  social_github: 'https://github.com/notpritam',
  social_linkedin: 'https://www.linkedin.com/in/notpritamsharma/',
  social_x: '',
  social_youtube: '',
  accent: '#b64326',
  google_site_verification: '',
  indexnow_key: '',
  posts_per_page: '10',
} as const;

export type SettingKey = keyof typeof SETTING_DEFAULTS;
export type Settings = Record<SettingKey, string>;

export function getSettings(db: Db = getDb()): Settings {
  const out = { ...SETTING_DEFAULTS } as Settings;
  for (const row of db.select().from(settings).all()) {
    if (row.key in out) out[row.key as SettingKey] = row.value;
  }
  return out;
}

export function setSetting(db: Db, key: SettingKey, value: string): void {
  db.insert(settings).values({ key, value }).onConflictDoUpdate({ target: settings.key, set: { value } }).run();
}

export function siteUrl(): string {
  return (process.env.SITE_URL ?? 'https://blog.notpritam.in').replace(/\/$/, '');
}
