import {useEffect, useRef} from "react";

export function Sketch({code}) {
  const sketchRef = useRef(null);

  useEffect(() => {
    if (!sketchRef.current) return;
    sketchRef.current.innerHTML = "";
    const iframe = document.createElement("iframe");
    sketchRef.current.appendChild(iframe);
    const doc = iframe.contentDocument || iframe.contentWindow.document;
    doc.open();
    doc.write(`
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <script src="https://cdn.jsdelivr.net/npm/p5@1.11.10/lib/p5.js"></script>
      </head>
      <style>
        body {
          margin: 0;
          padding: 0;
          overflow: hidden;
        }
        canvas {
          margin: 0;
          padding: 0;
          display: block;
        }
      </style>
      <body>
        <script>
      ${code}
        </script>
        <script>
          // Resize iframe to match canvas size
          window.addEventListener('load', () => {
            setTimeout(() => {
              const canvas = document.querySelector('canvas');
              if (canvas) {
                window.parent.postMessage({
                  type: 'resize',
                  width: +canvas.style.width.replace('px', ''),
                  height: +canvas.style.height.replace('px', '')
                }, '*');
              }
            }, 100);
          });
        </script>
      </body>
    </html>`);
    doc.close();
    iframe.style.border = "none";
    iframe.style.display = "block";

    // Listen for resize messages from iframe
    const handleMessage = (event) => {
      if (event.data.type === "resize") {
        iframe.style.width = event.data.width + "px";
        iframe.style.height = event.data.height + "px";
      }
    };

    window.addEventListener("message", handleMessage);

    return () => {
      window.removeEventListener("message", handleMessage);
    };
  }, [code]);

  return <div ref={sketchRef} />;
}
