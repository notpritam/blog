'use client';

import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

/** Keep navigation server-rendered; only its placement depends on the route. */
export function HeaderFrame({ children }: { children: ReactNode }) {
  const home = usePathname() === '/';
  return <header className={`site-header${home ? ' site-header-home' : ''}`}>{children}</header>;
}
