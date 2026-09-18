import type { Metadata } from 'next';
import Image from 'next/image';
import { JsonLd } from '@/components/seo/json-ld';
import { getDb } from '@/lib/db/client';
import { personJsonLd } from '@/lib/seo/jsonld';
import { getSettings } from '@/lib/settings';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'About', alternates: { canonical: '/about' } };

export default function AboutPage() {
  const s = getSettings(getDb());
  const links = [[s.social_github, 'GitHub'], [s.social_linkedin, 'LinkedIn'], [s.social_x, 'X'], [s.social_youtube, 'YouTube'], [s.author_url, 'Portfolio']].filter(([h]) => h) as [string, string][];
  return (
    <div className="page">
      <JsonLd data={{ '@context': 'https://schema.org', ...personJsonLd(s) }} />
      <section className="py-16">
        <Image src={s.author_avatar} alt={s.author_name} width={96} height={96} className="rounded-full" priority />
        <h1 className="h-display mt-6 text-[36px] font-semibold">{s.author_name}</h1>
        <p className="mt-4 max-w-[60ch] text-[18px] leading-[30px] text-text-soft">{s.author_bio}</p>
        <ul className="mt-8 flex flex-wrap gap-4 text-[15px]">
          {links.map(([href, label]) => <li key={href}><a href={href} rel="me noopener" target="_blank" className="link-hover underline decoration-line underline-offset-4">{label}</a></li>)}
        </ul>
      </section>
    </div>
  );
}
