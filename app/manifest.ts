import type { MetadataRoute } from 'next';
import { getSettings } from '@/lib/settings';

export const dynamic = 'force-dynamic';

export default function manifest(): MetadataRoute.Manifest {
  const settings = getSettings();
  return {
    name: settings.site_title + ' · Blog',
    short_name: settings.site_title,
    start_url: '/',
    display: 'browser',
    background_color: '#ffffff',
    theme_color: '#b64326',
    icons: [
      { src: '/icon.png', sizes: '64x64', type: 'image/png' },
      { src: '/apple-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  };
}
