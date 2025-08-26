import React, { useRef, useState, useEffect } from 'react';
import { getCurrentTheme, getThemeVariables } from '../lib/theme-css.ts';
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
  // This version will listen for theme updates via postMessage
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>React Demo</title>
  <style id="theme-styles">
    :root {
      color-scheme: light;
      /* Default light theme - will be updated dynamically */
      --color-bg-primary: rgb(255 255 255);
      --color-bg-secondary: rgb(248 250 252);
      --color-bg-tertiary: rgb(241 245 249);
      --color-bg-elevated: rgba(255 255 255 / 0.7);
      --color-text-primary: rgb(15 23 42);
      --color-text-secondary: rgb(51 65 85);
      --color-text-tertiary: rgb(71 85 105);
      --color-text-muted: rgb(100 116 139);
      --color-border-primary: rgb(226 232 240);
      --color-border-secondary: rgb(203 213 225);
      --color-accent-primary: rgb(99 102 241);
      --color-accent-hover: rgb(79 70 229);
      --color-accent-light: rgb(165 180 252);
      --color-success: rgb(34 197 94);
      --color-warning: rgb(245 158 11);
      --color-error: rgb(239 68 68);
      --transition-theme: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      --transition-fast: all 0.15s cubic-bezier(0.4, 0, 0.2, 1);
    }
    
    * { box-sizing: border-box; }
    
    body {
      margin: 0;
      font-family: system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, Helvetica, Arial, 'Apple Color Emoji', 'Segoe UI Emoji';
      line-height: 1.4;
      background: var(--color-bg-primary);
      color: var(--color-text-secondary);
      transition: var(--transition-theme);
    }
    
    header {
      padding: 16px 20px;
      border-bottom: 1px solid var(--color-border-primary);
      background: var(--color-bg-secondary);
      color: var(--color-text-primary);
    }
    
    .container {
      padding: 16px 20px;
      background: var(--color-bg-primary);
    }
    
    nav {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }
    
    button {
      appearance: none;
      border: 1px solid var(--color-border-primary);
      background: var(--color-bg-primary);
      color: var(--color-text-primary);
      border-radius: 8px;
      padding: 8px 12px;
      cursor: pointer;
      transition: var(--transition-fast);
    }
    
    button:hover {
      background: var(--color-bg-secondary);
    }
    
    button[aria-pressed="true"] {
      background: var(--color-accent-primary);
      color: var(--color-bg-primary);
      border-color: var(--color-accent-primary);
    }
    
    .card {
      border: 1px solid var(--color-border-primary);
      border-radius: 12px;
      padding: 12px 14px;
      background: var(--color-bg-secondary);
      color: var(--color-text-primary);
    }
    
    .grid {
      display: grid;
      gap: 12px;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    }
    
    input, textarea {
      width: 100%;
      padding: 8px 10px;
      border: 1px solid var(--color-border-primary);
      border-radius: 8px;
      background: var(--color-bg-primary);
      color: var(--color-text-primary);
      transition: var(--transition-fast);
    }
    
    input:focus, textarea:focus {
      outline: none;
      border-color: var(--color-accent-primary);
      box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.1);
    }
    
    .muted {
      color: var(--color-text-muted);
      font-size: 12px;
    }
    
    .row {
      display: flex;
      gap: 8px;
      align-items: center;
    }
    
    .space {
      height: 8px;
    }
    
    .todo {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    
    .todo input[type="checkbox"] {
      width: 16px;
      height: 16px;
      accent-color: var(--color-accent-primary);
    }
    
    .badge {
      font-size: 12px;
      border-radius: 999px;
      padding: 2px 8px;
      border: 1px solid var(--color-border-primary);
      color: var(--color-text-muted);
      background: var(--color-bg-tertiary);
    }
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
  <script>
    // Theme update functionality
    function updateTheme(theme, themeVariables) {
      const styleElement = document.getElementById('theme-styles');
      if (styleElement) {
        const colorScheme = theme === 'light' ? 'light' : 'dark';
        const newCSS = styleElement.textContent.replace(
          /:root\\s*\\{[^}]*\\}/,
          \`:root { color-scheme: \${colorScheme}; \${themeVariables} }\`
        );
        styleElement.textContent = newCSS;
      }
    }
    
    // Listen for theme updates from parent
    window.addEventListener('message', function(event) {
      if (event.data && event.data.type === 'THEME_UPDATE') {
        updateTheme(event.data.theme, event.data.themeVariables);
      }
    });
    
    // Request initial theme from parent
    window.parent.postMessage({ type: 'REQUEST_THEME' }, '*');
  </script>
</body>
</html>`;
}

export default function CodeDemo({ initial = '<h1>Hello from iframe</h1>', reactDemo = false, height = '36rem', width = '100%' }: CodeDemoProps) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [currentTheme, setCurrentTheme] = useState<'light' | 'dark' | 'gruvbox'>('light');
  
  // Store the initial React demo HTML to prevent reloading on theme changes
  const [reactDemoSrc] = useState(() => {
    return reactDemo ? buildReactDemoSrcDoc() : null;
  });
  
  // Format the textarea content nicely with theme awareness
  const getFormattedInitialHtml = (theme: 'light' | 'dark' | 'gruvbox') => {
    const themeVariables = getThemeVariables(theme);
    
    return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Demo</title>
    <style> 
      :root {
        color-scheme: ${theme === 'light' ? 'light' : 'dark'};
        ${themeVariables}
      }
      
      body {
        font-family: Inter, system-ui, sans-serif;
        padding: 20px;
        line-height: 1.6;
        background: var(--color-bg-primary);
        color: var(--color-text-primary);
        transition: var(--transition-theme);
        margin: 0;
      }
      
      h1 {
        color: var(--color-text-primary);
        margin-top: 0;
      }
      
      p {
        color: var(--color-text-secondary);
      }
      
      a {
        color: var(--color-accent-primary);
        text-decoration: none;
      }
      
      a:hover {
        color: var(--color-accent-hover);
        text-decoration: underline;
      }
    </style>
  </head>
  <body>
    <h1>Hello from the demo!</h1>
    <p>Edit the HTML in the textarea to see changes.</p>
    <p>This content automatically adapts to your selected theme!</p>
  </body>
</html>`;
  };

  // Clean HTML content for display in textarea (without styles)
  const getCleanHtmlForDisplay = () => {
    return `<h1>Hello from the demo!</h1>
<p>Edit the HTML in the textarea to see changes.</p>
<p>This content automatically adapts to your selected theme!</p>`;
  };

  // Generate full HTML with theme-aware styles for iframe
  const generateFullHtml = (bodyContent: string, theme: 'light' | 'dark' | 'gruvbox') => {
    const themeVariables = getThemeVariables(theme);
    
    return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Demo</title>
    <style> 
      :root {
        color-scheme: ${theme === 'light' ? 'light' : 'dark'};
        ${themeVariables}
      }
      
      body {
        font-family: Inter, system-ui, sans-serif;
        padding: 20px;
        line-height: 1.6;
        background: var(--color-bg-primary);
        color: var(--color-text-primary);
        transition: var(--transition-theme);
        margin: 0;
      }
      
      h1 {
        color: var(--color-text-primary);
        margin-top: 0;
      }
      
      p {
        color: var(--color-text-secondary);
      }
      
      a {
        color: var(--color-accent-primary);
        text-decoration: none;
      }
      
      a:hover {
        color: var(--color-accent-hover);
        text-decoration: underline;
      }
    </style>
  </head>
  <body>
    ${bodyContent}
  </body>
</html>`;
  };

  // Initialize with clean HTML if using default initial value
  const [code, setCode] = useState(() => {
    if (reactDemo) return initial;
    return initial === '<h1>Hello from iframe</h1>' ? getCleanHtmlForDisplay() : initial;
  });

  // Listen for theme changes
  useEffect(() => {
    const updateTheme = () => {
      const newTheme = getCurrentTheme();
      setCurrentTheme(newTheme);
      
      // Send theme update to React demo iframe via postMessage
      if (reactDemo && iframeRef.current) {
        const themeVariables = getThemeVariables(newTheme);
        iframeRef.current.contentWindow?.postMessage({
          type: 'THEME_UPDATE',
          theme: newTheme,
          themeVariables: themeVariables
        }, '*');
      }
      
      // Update HTML demo content if using default content (but not React demo)
      if (!reactDemo && initial === '<h1>Hello from iframe</h1>') {
        setCode(getCleanHtmlForDisplay());
      }
    };

    // Set initial theme
    updateTheme();

    // Listen for messages from iframe (e.g., theme requests)
    const handleMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'REQUEST_THEME' && reactDemo && iframeRef.current) {
        const themeVariables = getThemeVariables(currentTheme);
        iframeRef.current.contentWindow?.postMessage({
          type: 'THEME_UPDATE',
          theme: currentTheme,
          themeVariables: themeVariables
        }, '*');
      }
    };

    window.addEventListener('message', handleMessage);

    // Listen for theme changes via mutation observer
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'data-theme') {
          updateTheme();
        }
      });
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme']
    });

    return () => {
      observer.disconnect();
      window.removeEventListener('message', handleMessage);
    };
  }, [reactDemo, initial, currentTheme]);
  
  // Use different sources for iframe vs display
  const src = reactDemo 
    ? (reactDemoSrc || buildReactDemoSrcDoc())
    : (initial === '<h1>Hello from iframe</h1>' ? generateFullHtml(code, currentTheme) : code);
  
  const displayCode = reactDemo ? (reactDemoSrc || buildReactDemoSrcDoc()) : code;
  
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
      {/* Show textarea for editing in both modes */}
      <div className="border border-[var(--color-border-primary)] rounded-lg overflow-hidden bg-[var(--color-bg-secondary)]">
        {/*
          Use srcDoc to inject the HTML instead of accessing the iframe's document.
          This avoids cross-origin restrictions caused by sandboxed iframes.
          */}
        <iframe
          ref={iframeRef}
          sandbox="allow-scripts"
          srcDoc={src}
          className="w-full bg-[var(--color-bg-primary)]"
          style={iframeStyle}
        />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium text-[var(--color-text-primary)]">
          {reactDemo ? 'React Demo Source (read-only)' : 'Editable HTML'}
        </label>
        <textarea
          value={displayCode}
          onChange={reactDemo ? undefined : (e) => {
            const newCode = e.target.value;
            setCode(newCode);
          }}
          readOnly={reactDemo}
          className={`w-full h-96 p-3 border border-[var(--color-border-primary)] rounded-lg font-mono text-sm transition-[var(--transition-fast)] ${
            reactDemo 
              ? 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)]' 
              : 'bg-[var(--color-bg-primary)] text-[var(--color-text-primary)]'
          }`}
          style={{ 
            fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Monaco, Consolas, monospace',
            colorScheme: currentTheme === 'light' ? 'light' : 'dark'
          }}
        />
      </div>
    </div>
  );
}
