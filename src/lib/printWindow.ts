"use client";

type PrintWindowOptions = {
  html: string;
  cleanupDelayMs?: number;
};

const DEFAULT_CLEANUP_DELAY = 1500;

export const openPrintWindow = ({ html, cleanupDelayMs = DEFAULT_CLEANUP_DELAY }: PrintWindowOptions) => {
  if (typeof document === 'undefined' || typeof window === 'undefined') {
    return;
  }

  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  iframe.setAttribute('aria-hidden', 'true');

  const cleanup = () => {
    window.setTimeout(() => {
      iframe.remove();
    }, cleanupDelayMs);
  };

  iframe.onload = () => {
    const frameWindow = iframe.contentWindow;
    if (!frameWindow) {
      cleanup();
      return;
    }

    try {
      frameWindow.focus();
      frameWindow.print();
      frameWindow.onafterprint = cleanup;
      window.setTimeout(cleanup, cleanupDelayMs + 1000);
    } catch {
      cleanup();
    }
  };

  iframe.srcdoc = html;
  document.body.appendChild(iframe);
};

const getDocumentStylesMarkup = () =>
  Array.from(document.querySelectorAll<HTMLStyleElement | HTMLLinkElement>('style, link[rel="stylesheet"]'))
    .map((node) => node.outerHTML)
    .join('');

export const buildPrintHtmlDocument = (bodyContent: string, title = 'Print Preview') => `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${title}</title>
  ${getDocumentStylesMarkup()}
  <style>
    body { margin: 16px; }
    @page { size: auto; margin: 12mm; }
  </style>
</head>
<body>
  ${bodyContent}
</body>
</html>`;
