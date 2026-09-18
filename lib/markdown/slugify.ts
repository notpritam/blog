import GithubSlugger from 'github-slugger';

export function slugify(input: string, maxLength = 80): string {
  const s = new GithubSlugger().slug(input.trim()).replace(/-+/g, '-').replace(/^-|-$/g, '');
  if (s.length <= maxLength) return s;
  return s.slice(0, maxLength).replace(/-[^-]*$/, '');
}
