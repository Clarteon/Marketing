import Script from "next/script";

/** Cookieless Cloudflare Web Analytics. Renders nothing unless the site token is set. */
export function Analytics({
  token = process.env.NEXT_PUBLIC_CF_ANALYTICS_TOKEN,
}: {
  token?: string;
}) {
  if (!token) return null;

  return (
    <Script
      type="module"
      src="https://static.cloudflareinsights.com/beacon.min.js"
      data-cf-beacon={JSON.stringify({ token })}
      strategy="afterInteractive"
    />
  );
}
