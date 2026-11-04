"use client";

import { useEffect, useState } from "react";
import type { Options } from "react-markdown";

type MarkdownRenderer = typeof import("react-markdown").default;

// The caller retains its sanitization and link policy; only loading changes.
export function MessageMarkdown({ children, ...options }: Options) {
  const [Markdown, setMarkdown] = useState<MarkdownRenderer | null>(null);

  useEffect(() => {
    let active = true;
    import("react-markdown")
      .then(({ default: Renderer }) => {
        if (active) setMarkdown(() => Renderer);
      })
      // A failed chunk must not hide a reply or make untrusted markup executable.
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  if (!Markdown) return <p>{children}</p>;
  return <Markdown {...options}>{children}</Markdown>;
}
