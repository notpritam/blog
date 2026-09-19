import { CodeCopy } from './code-copy';
import { MermaidBlocks } from './mermaid-blocks';

export function ArticleBody({ html }: { html: string }) {
  return (
    <>
      <div className="prose mt-12" dangerouslySetInnerHTML={{ __html: html }} />
      <CodeCopy />
      <MermaidBlocks />
    </>
  );
}
