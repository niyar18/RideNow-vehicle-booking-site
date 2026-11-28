"use client";

import { useEffect, useRef } from "react";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => { heading.current?.focus(); }, []);
  return (
    <html lang="en">
      <head><title>Page unavailable | Jaatri</title></head>
      <body style={{ color: "#142238", background: "#f3f8f6", fontFamily: "system-ui, sans-serif", margin: 0 }}>
        <main style={{ maxWidth: "32rem", padding: "2rem 1rem", margin: "4vh auto" }}>
          <h1 tabIndex={-1} ref={heading}>This page couldn’t load</h1>
          <p>Try opening this page again, or return to Jaatri’s home page.</p>
          <button type="button" onClick={reset} style={{ font: "inherit", minHeight: 44, paddingInline: "1rem" }}>Try again</button>
          <p><a href="/" style={{ color: "#142238", textDecoration: "underline" }}>Go to Jaatri home</a></p>
        </main>
      </body>
    </html>
  );
}
