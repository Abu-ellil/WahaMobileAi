// src/utils/code.ts
// Parses fenced code blocks out of assistant messages and composes a full
// runnable HTML document from html/css/js blocks for the WebView preview.

export type Segment =
  | { type: 'text'; text: string }
  | { type: 'code'; lang: string; code: string };

/** Splits markdown-ish text into plain-text and fenced ``` code segments. */
export function parseSegments(text: string): Segment[] {
  const out: Segment[] = [];
  const lines = text.split('\n');
  let buffer: string[] = [];
  let inCode = false;
  let lang = '';

  const flushText = () => {
    if (buffer.join('').trim().length > 0) out.push({ type: 'text', text: buffer.join('\n') });
    buffer = [];
  };
  const flushCode = () => {
    if (buffer.join('').trim().length > 0) out.push({ type: 'code', lang, code: buffer.join('\n') });
    buffer = [];
  };

  for (const line of lines) {
    const trimmed = line.trim();
    if (!inCode && trimmed.startsWith('```')) {
      flushText();
      inCode = true;
      lang = trimmed.slice(3).trim();
      continue;
    }
    if (inCode && trimmed === '```') {
      flushCode();
      inCode = false;
      lang = '';
      continue;
    }
    buffer.push(line);
  }
  if (inCode) flushCode(); // unterminated fence (e.g. truncated generation)
  else flushText();

  return out;
}

const LANG_ALIASES: Record<string, string> = {
  javascript: 'js',
  jsx: 'js',
  mjs: 'js',
  cjs: 'js',
  node: 'js',
  nodejs: 'js',
  html: 'html',
  htm: 'html',
  xml: 'html',
  svg: 'html',
  vue: 'html',
  css: 'css',
  scss: 'css',
  sass: 'css',
  less: 'css',
  typescript: 'ts',
  tsx: 'ts',
  python: 'py',
  py: 'py',
  sh: 'sh',
  bash: 'sh',
  shell: 'sh',
  zsh: 'sh',
  json: 'json',
  java: 'java',
  kotlin: 'kt',
  kt: 'kt',
  swift: 'swift',
  dart: 'dart',
  php: 'php',
  sql: 'sql',
  csharp: 'cs',
  cs: 'cs',
  'c#': 'cs',
  cpp: 'cpp',
  'c++': 'cpp',
  c: 'c',
  rb: 'rb',
  ruby: 'rb',
  go: 'go',
  rust: 'rs',
  rs: 'rs',
};

/** Maps a fence info string ("js", "JavaScript", "node:18"…) to a canonical id. */
export function normalizeLang(raw: string): string {
  const first = raw.toLowerCase().trim().split(/[\s:,.]/)[0] ?? '';
  return LANG_ALIASES[first] ?? (first || 'code');
}

export function isRunnableLang(raw: string): boolean {
  const lang = normalizeLang(raw);
  return lang === 'html' || lang === 'css' || lang === 'js';
}

export function extensionFor(raw: string): string {
  const lang = normalizeLang(raw);
  return lang === 'code' ? 'txt' : lang;
}

/** Default file base name for a language, e.g. html → "index.html". */
export function fileNameFor(raw: string): string {
  const lang = normalizeLang(raw);
  const base = lang === 'html' ? 'index' : lang === 'css' ? 'style' : lang === 'js' ? 'script' : 'snippet';
  return `${base}-${Date.now().toString(36)}.${extensionFor(lang)}`;
}

export interface CodePart {
  lang: string;
  code: string;
}

function injectIntoHtml(html: string, cssParts: string[], jsParts: string[]): string {
  let out = html;
  const styleTag = cssParts.map((c) => `<style>\n${c}\n</style>`).join('\n');
  const scriptTag = jsParts.map((j) => `<script>\n${safeJs(j)}\n</script>`).join('\n');

  if (styleTag) {
    out = injectBefore(out, /<\/head>/i, styleTag)
      ?? injectAfter(out, /<head[^>]*>/i, styleTag)
      ?? injectBefore(out, /<body[^>]*>/i, styleTag)
      ?? styleTag + out;
  }
  if (scriptTag) {
    out = injectBefore(out, /<\/body>/i, scriptTag)
      ?? injectBefore(out, /<\/html>/i, scriptTag)
      ?? out + scriptTag;
  }
  return out;
}

function injectBefore(haystack: string, marker: RegExp, inject: string): string | null {
  const m = haystack.match(marker);
  if (!m || m.index === undefined) return null;
  return haystack.slice(0, m.index) + inject + '\n' + haystack.slice(m.index);
}

function injectAfter(haystack: string, marker: RegExp, inject: string): string | null {
  const m = haystack.match(marker);
  if (!m || m.index === undefined) return null;
  const at = m.index + m[0].length;
  return haystack.slice(0, at) + '\n' + inject + haystack.slice(at);
}

/** Keeps user JS from closing the host <script> tag early. */
function safeJs(code: string): string {
  return code.replace(/<\/script/gi, '<\\/script');
}

const VIEWPORT = '<meta name="viewport" content="width=device-width, initial-scale=1">';

function wrapCss(css: string): string {
  return `<!DOCTYPE html>\n<html lang="ar" dir="rtl">\n<head>\n<meta charset="utf-8">\n${VIEWPORT}\n<style>\n${css}\n</style>\n</head>\n<body></body>\n</html>`;
}

// Standalone-JS wrapper: captures console.* and runtime errors so the user
// actually sees output instead of a blank page.
function wrapJs(js: string): string {
  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8">
${VIEWPORT}
<style>
  body { font-family: ui-monospace, Menlo, Consolas, monospace; background: #fff; color: #111; margin: 0; padding: 12px; }
  #__hint { color: #888; font-size: 11px; border-bottom: 1px solid #eee; padding-bottom: 6px; margin-bottom: 8px; }
  #__out > div { white-space: pre-wrap; word-break: break-word; padding: 1px 0; }
</style>
</head>
<body>
<div id="__hint">مخرجات console.log — الأخطاء تظهر بالأحمر</div>
<div id="__out"></div>
<script>
(function () {
  var out = document.getElementById('__out');
  function line(args, color) {
    var d = document.createElement('div');
    d.dir = 'auto';
    if (color) d.style.color = color;
    d.textContent = Array.prototype.map.call(args, function (a) {
      try { return typeof a === 'object' && a !== null ? JSON.stringify(a) : String(a); }
      catch (e) { return String(a); }
    }).join(' ');
    out.appendChild(d);
  }
  ['log', 'info', 'warn', 'error'].forEach(function (k) {
    var orig = console[k];
    console[k] = function () {
      line(arguments, k === 'error' ? '#c5221f' : k === 'warn' ? '#b06000' : null);
      if (orig) orig.apply(console, arguments);
    };
  });
  window.addEventListener('error', function (e) {
    line(['⚠ ' + e.message + ' (سطر ' + e.lineno + ')'], '#c5221f');
  });
})();
</script>
<script>
${safeJs(js)}
</script>
</body>
</html>`;
}

/**
 * Builds one self-contained HTML document from the code blocks of a message.
 * - an html block is the base; sibling css/js blocks get injected into it
 *   (the common index.html + style.css + script.js answer shape)
 * - html absent → css/js blocks are wrapped in a minimal document
 */
export function buildPreviewHtml(blocks: CodePart[], pressed: CodePart): string {
  const htmlBlocks = blocks.filter((b) => normalizeLang(b.lang) === 'html');
  const cssParts = blocks.filter((b) => normalizeLang(b.lang) === 'css').map((b) => b.code);
  const jsParts = blocks.filter((b) => normalizeLang(b.lang) === 'js').map((b) => b.code);

  const base = normalizeLang(pressed.lang) === 'html' ? pressed : htmlBlocks[0];
  if (base) return injectIntoHtml(base.code, cssParts, jsParts);
  if (normalizeLang(pressed.lang) === 'css') return wrapCss(pressed.code);
  return wrapJs(pressed.code);
}
