import { CodeCopy } from './code-copy';

export function ArticleBody({ html }: { html: string }) {
  return (
    <>
      <div className="prose mt-12" dangerouslySetInnerHTML={{ __html: html }} />
      <CodeCopy />
    </>
  );
}
