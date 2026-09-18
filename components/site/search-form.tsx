export function SearchForm({ defaultValue = '', autoFocus = false }: { defaultValue?: string; autoFocus?: boolean }) {
  return (
    <form action="/search" method="get" role="search" className="flex w-full items-center gap-2 border border-dashed border-line px-3 py-2">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
      <input type="search" name="q" defaultValue={defaultValue} placeholder="Search writing…" aria-label="Search" autoFocus={autoFocus} className="w-full bg-transparent text-[15px] outline-none placeholder:text-meta" />
    </form>
  );
}
