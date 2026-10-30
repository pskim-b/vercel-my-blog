import { Children, isValidElement, type ReactNode } from 'react';
import { highlightCode } from '@/lib/code-highlight.mjs';

interface CodeBlockProps {
  children: ReactNode;
  className?: string;
}

function codeText(node: ReactNode): string {
  return Children.toArray(node).map(child => {
    if (typeof child === 'string' || typeof child === 'number') return String(child);
    if (isValidElement<{ children?: ReactNode }>(child)) return codeText(child.props.children);
    return '';
  }).join('');
}

export default async function CodeBlock({ children, className = '' }: CodeBlockProps) {
  const code = Children.toArray(children).find(isValidElement);
  const codeClass = isValidElement<{ className?: string }>(code) ? code.props.className ?? '' : '';
  const language = /(?:^|\s)lang(?:uage)?-([^\s]+)/.exec(`${className} ${codeClass}`)?.[1] ?? '';
  const html = await highlightCode(codeText(children), language);

  return (
    <figure className="code-block">
      {language && <figcaption className="code-block-language">{language}</figcaption>}
      {/* Only Shiki's escaped, server-generated markup is inserted here. */}
      <div dangerouslySetInnerHTML={{ __html: html }} />
    </figure>
  );
}
