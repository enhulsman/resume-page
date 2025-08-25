import React, { useEffect, useRef, useState } from 'react';

export default function CodeDemo({ initial = '<h1>Hello from iframe</h1>' }: { initial?: string }) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [code, setCode] = useState(initial);

  useEffect(() => {
    const doc = iframeRef.current?.contentWindow?.document;
    if (doc) {
      doc.open();
      doc.write(code);
      doc.close();
    }
  }, [code]);

  return (
    <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
      <textarea
        value={code}
        onChange={(e) => setCode(e.target.value)}
        className="w-full h-48 p-2 border rounded"
      />
      <div className="border rounded overflow-hidden">
        <iframe ref={iframeRef} sandbox="allow-scripts" className="w-full h-48" />
      </div>
    </div>
  );
}
