import { serializeJsonLd } from "@/lib/structured-data";

export function JsonLd({ data }: { data: unknown }) {
  // Safe: data comes from repo content only, and serializeJsonLd escapes `<`.
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }}
    />
  );
}
