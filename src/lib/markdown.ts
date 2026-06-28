import { marked } from 'marked';
import DOMPurify from 'dompurify';
import hljs from 'highlight.js';

// Configure marked with a custom code block renderer that adds a language
// label and a copy button. Highlighting is applied via highlight.js.
const renderer = new marked.Renderer();

renderer.code = (token: { text: string; lang?: string }) => {
  const code = token.text ?? '';
  const lang = (token.lang || '').trim().split(/\s+/)[0] || '';
  let highlighted = '';
  let displayLang = lang || 'text';
  try {
    if (lang && hljs.getLanguage(lang)) {
      highlighted = hljs.highlight(code, { language: lang }).value;
    } else {
      highlighted = hljs.highlightAuto(code).value;
      const detected = hljs.highlightAuto(code).language;
      if (detected) displayLang = detected;
    }
  } catch {
    highlighted = escapeHtml(code);
  }
  // Encode the raw code for the copy button via data attribute.
  const encoded = encodeURIComponent(code);
  return `<div class="code-block group">
    <div class="code-block__bar">
      <span class="code-block__lang">${escapeHtml(displayLang)}</span>
      <button type="button" class="code-block__copy" data-code="${encoded}" aria-label="Copy code">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
        <span>Copy</span>
      </button>
    </div>
    <pre><code class="hljs language-${escapeHtml(displayLang)}">${highlighted}</code></pre>
  </div>`;
};

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

marked.setOptions({
  renderer,
  gfm: true,
  breaks: false,
});

export function renderMarkdown(md: string): string {
  const raw = marked.parse(md, { async: false }) as string;
  return DOMPurify.sanitize(raw, {
    ADD_ATTR: ['data-code', 'target', 'rel'],
  });
}

/** Estimate reading time in minutes from markdown text. */
export function estimateReadingTime(md: string): number {
  const words = md.trim().split(/\s+/).length;
  return Math.max(1, Math.round(words / 220));
}

/** Generate a URL slug from a title. */
export function slugify(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
