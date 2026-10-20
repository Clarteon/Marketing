import Link from "next/link";
import ReactMarkdown from "react-markdown";
import { cx } from "@/lib/cx";

interface MarkdownProps {
  children: string;
  className?: string;
}

export function Markdown({ children, className }: MarkdownProps) {
  if (!children.trim()) return null;

  return (
    <div className={cx("prose", className)}>
      <ReactMarkdown
        components={{
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
