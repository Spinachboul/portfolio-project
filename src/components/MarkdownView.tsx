import { useEffect, useRef } from 'react';
import { renderMarkdown } from '../lib/markdown';

type Props = {
  content: string;
  className?: string;
};

export default function MarkdownView({ content, className }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  // Render the sanitized HTML.
  useEffect(() => {
    if (!ref.current) return;
    ref.current.innerHTML = renderMarkdown(content);
  }, [content]);

  // Wire up copy buttons + external link targets.
  useEffect(() => {
    const root = ref.current;
    if (!root) return;

    const onClick = (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest('.code-block__copy') as HTMLButtonElement | null;
      if (!target) return;
      e.preventDefault();
      const raw = target.getAttribute('data-code') || '';
      const code = decodeURIComponent(raw);
      navigator.clipboard.writeText(code).then(() => {
        const label = target.querySelector('span');
        const prev = label?.textContent;
        target.classList.add('copied');
        if (label) label.textContent = 'Copied!';
        setTimeout(() => {
          target.classList.remove('copied');
          if (label && prev) label.textContent = prev;
        }, 1600);
      });
    };

    const onLinkClick = (e: MouseEvent) => {
      const a = (e.target as HTMLElement).closest('a') as HTMLAnchorElement | null;
      if (!a) return;
      const href = a.getAttribute('href') || '';
      if (/^https?:\/\//i.test(href)) {
        a.setAttribute('target', '_blank');
        a.setAttribute('rel', 'noopener noreferrer');
      }
    };

    root.addEventListener('click', onClick);
    root.addEventListener('click', onLinkClick);
    return () => {
      root.removeEventListener('click', onClick);
      root.removeEventListener('click', onLinkClick);
    };
  }, [content]);

  return <div ref={ref} className={`prose-blog ${className ?? ''}`} />;
}
