import GithubSlugger from 'github-slugger';

export function slugify(input: string, maxLength = 80): string {
  const s = new GithubSlugger().slug(input.trim()).replace(/-+/g, '-').replace(/^-|-$/g, '');
  if (s.length <= maxLength) return s;
  const cut = s.slice(0, maxLength);
  const boundary = s[maxLength];
  // The cut already lands on a word boundary (next char is a separator, or
  // there's nothing left) — keep it whole instead of trimming a complete
  // trailing word.
  if (boundary === '-' || boundary === undefined) return cut;
  // Mid-word cut: back up to the last full word. If `cut` has no hyphen at
  // all (a single word longer than maxLength), there's no boundary to
  // respect, so `replace` no-ops and returns `cut` unchanged.
  return cut.replace(/-[^-]*$/, '');
}
