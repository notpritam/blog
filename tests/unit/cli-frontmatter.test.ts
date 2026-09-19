import { describe, it, expect } from 'vitest';
import { parseFrontMatter, parseTags } from '@/scripts/cli';

describe('post import front matter', () => {
  it('parses key: value lines and returns the body after the fence', () => {
    const { meta, body } = parseFrontMatter('---\ntitle: "Hello: world"\nsubtitle: Sub\ntags: [a, b]\n---\n# Hello: world\n\nBody');
    expect(meta).toEqual({ title: 'Hello: world', subtitle: 'Sub', tags: '[a, b]' });
    expect(body).toBe('# Hello: world\n\nBody');
  });
  it('returns the whole text when there is no front matter', () => {
    expect(parseFrontMatter('# T\n\nx')).toEqual({ meta: {}, body: '# T\n\nx' });
  });
  it('parses tags in list or comma form', () => {
    expect(parseTags('[tools, "agents", bb ]')).toEqual(['tools', 'agents', 'bb']);
    expect(parseTags('tools,agents')).toEqual(['tools', 'agents']);
    expect(parseTags(undefined)).toEqual([]);
  });
});
