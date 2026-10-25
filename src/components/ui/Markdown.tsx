import Link from "next/link";
import ReactMarkdown from "react-markdown";
import { cx } from "@/lib/cx";
import { ScrollReveal } from "./ScrollReveal";

interface MarkdownProps {
  children: string;
  className?: string;
  reveal?: boolean;
}

export function Markdown({ children, className, reveal = false }: MarkdownProps) {
  if (!children.trim()) return null;

  return (
    <div className={cx("prose", className)}>
      <ReactMarkdown
        components={{
          ...(reveal
            ? {
                h2: ({ children: heading }: { children?: React.ReactNode }) => (
                  <ScrollReveal as="h2" variant="wipe">
                    {heading}
                  </ScrollReveal>
                ),
                h3: ({ children: heading }: { children?: React.ReactNode }) => (
                  <ScrollReveal as="h3" variant="wipe">
                    {heading}
                  </ScrollReveal>
                ),
                p: ({ children: paragraph }: { children?: React.ReactNode }) => (
                  <ScrollReveal as="p" variant="rise">
                    {paragraph}
                  </ScrollReveal>
                ),
              }
            : {}),
          a: ({ href, children: linkChildren, node, ...props }) => {
            void node;

            if (!href) return <>{linkChildren}</>;

            if (/^(https?:|mailto:)/.test(href)) {
              return (
                <a href={href} {...props}>
                  {linkChildren}
                </a>
              );
            }

            return (
              <Link href={href} {...props}>
                {linkChildren}
              </Link>
            );
          },
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
