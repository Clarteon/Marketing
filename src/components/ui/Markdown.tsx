import type { ReactNode } from "react";
import { Children, isValidElement } from "react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import { cx } from "@/lib/cx";
import { ScrollReveal } from "./ScrollReveal";

interface MarkdownProps {
  children: string;
  className?: string;
  reveal?: boolean;
}

function extractNodeText(node: ReactNode): string {
  return Children.toArray(node)
    .map((child) => {
      if (typeof child === "string" || typeof child === "number") return String(child);
      if (isValidElement<{ children?: ReactNode }>(child)) {
        return extractNodeText(child.props.children);
      }
      return "";
    })
    .join("");
}

function slugifyHeading(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function Markdown({ children, className, reveal = false }: MarkdownProps) {
  if (!children.trim()) return null;

  const seenIds = new Map<string, number>();

  function getHeadingId(heading: ReactNode): string | undefined {
    const base = slugifyHeading(extractNodeText(heading));
    if (!base) return undefined;
    const count = seenIds.get(base) ?? 0;
    seenIds.set(base, count + 1);
    return count === 0 ? base : `${base}-${count + 1}`;
  }

  return (
    <div className={cx("prose", className)}>
      <ReactMarkdown
        components={{
          h2: ({ children: heading }) => {
            const id = getHeadingId(heading);
            if (reveal) {
              return (
                <ScrollReveal as="h2" id={id} variant="wipe">
                  {heading}
                </ScrollReveal>
              );
            }
            return <h2 id={id}>{heading}</h2>;
          },
          h3: ({ children: heading }) => {
            const id = getHeadingId(heading);
            if (reveal) {
              return (
                <ScrollReveal as="h3" id={id} variant="wipe">
                  {heading}
                </ScrollReveal>
              );
            }
            return <h3 id={id}>{heading}</h3>;
          },
          ...(reveal
            ? {
                p: ({ children: paragraph }: { children?: ReactNode }) => (
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
