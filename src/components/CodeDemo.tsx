import React, { useRef, useState } from 'react';
// Import the demo app source as a raw string. Vite supports ?raw imports.
// Falls back gracefully if bundler doesn't support it.
// @ts-ignore

type CodeDemoProps = {
  initial?: string;
  /** When true, render a full React demo app inside the iframe instead of raw HTML */
  reactDemo?: boolean;
  /** Height/Width of the iframe; accepts CSS length (e.g., '36rem') or number (px). */
  height?: string | number;
  width?: string | number;
};

function buildReactDemoSrcDoc(): string {
  // Build an HTML shell that loads React, ReactDOM, then a precompiled IIFE bundle.
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>React Demo</title>
  <style>
    :root{color-scheme: light dark}
    *{box-sizing:border-box}
    body{margin:0;font-family: system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, Helvetica, Arial, 'Apple Color Emoji', 'Segoe UI Emoji';line-height:1.4}
    header{padding:16px 20px;border-bottom:1px solid #e5e7eb;background:#f8fafc;color:#0f172a}
    .container{padding:16px 20px}
    nav{display:flex;gap:8px;flex-wrap:wrap}
    button{appearance:none;border:1px solid #cbd5e1;background:#fff;color:#0f172a;border-radius:8px;padding:8px 12px;cursor:pointer}
    button[aria-pressed="true"]{background:#0ea5e9;color:white;border-color:#0ea5e9}
    .card{border:1px solid #e5e7eb;border-radius:12px;padding:12px 14px;background:#fff;color:#0f172a}
    .grid{display:grid;gap:12px;grid-template-columns: repeat(auto-fit, minmax(220px,1fr));}
    input, textarea{width:100%;padding:8px 10px;border:1px solid #cbd5e1;border-radius:8px}
    .muted{color:#64748b;font-size:12px}
    .row{display:flex;gap:8px;align-items:center}
    .space{height:8px}
    .todo{display:flex;align-items:center;gap:8px}
    .todo input[type="checkbox"]{width:16px;height:16px}
    .badge{font-size:12px;border-radius:999px;padding:2px 8px;border:1px solid #94a3b8;color:#334155}
  </style>
  <script crossorigin src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
  <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
</head>
<body>
  <header>
    <h1 style="margin:0;font-size:18px">React Demo App <span class="badge">iframe</span></h1>
  </header>
  <div id="root" class="container"></div>
  <script src="/react-demo-app.iife.js"></script>
</body>
</html>`;
}

export default function CodeDemo({ initial = '<h1>Hello from iframe</h1>', reactDemo = false, height = '36rem', width = '100%' }: CodeDemoProps) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [code, setCode] = useState(initial);
  const src = reactDemo ? buildReactDemoSrcDoc() : code;
  const iframeStyle: React.CSSProperties = { 
    height: typeof height === 'number' ? `${height}px` : height,
    width: typeof width === 'number' ? `${width}px` : width
  };

  const isReactDemo = !!reactDemo;
  const containerClass = isReactDemo
    ? 'mt-4 grid grid-cols-1 gap-4'
    : 'mt-4 grid grid-cols-1 md:grid-cols-2 gap-4';
  return (
    <div className={containerClass}>
      {!isReactDemo && (
        <textarea
          value={src}
          onChange={(e) => setCode(e.target.value)}
          className="w-full h-48 p-2 border rounded"
        />
      )}
      <div className="border rounded overflow-hidden">
        {/*
          Use srcDoc to inject the HTML instead of accessing the iframe's document.
          This avoids cross-origin restrictions caused by sandboxed iframes.
        */}
        <iframe
          ref={iframeRef}
          sandbox="allow-scripts"
          srcDoc={src}
          className="w-full"
          style={iframeStyle}
        />
      </div>
    </div>
  );
}
