import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";
const turnstileOrigin = "https://challenges.cloudflare.com";
// Cloudflare Web Analytics origins are allowed only when the site token is set.
const analyticsEnabled = Boolean(process.env.NEXT_PUBLIC_CF_ANALYTICS_TOKEN);
const analyticsScript = analyticsEnabled ? " https://static.cloudflareinsights.com" : "";
const analyticsConnect = analyticsEnabled ? " https://cloudflareinsights.com" : "";

// The CSP allows inline scripts because Next.js injects its hydration bootstrap
// inline. Tighten this with per-request nonces during the P6 hardening pass.
const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' ${isDev ? "'unsafe-eval' " : ""}${turnstileOrigin}${analyticsScript}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  // Turnstile probes the browser with a `data:,` connection from its challenge frame.
  `connect-src 'self' data: ${turnstileOrigin}${analyticsConnect}${isDev ? " ws: wss:" : ""}`,
  `frame-src ${turnstileOrigin}`,
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  ...(isDev ? [] : ["upgrade-insecure-requests"]),
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
];

const nextConfig: NextConfig = {
  agentRules: false,
  poweredByHeader: false,
  reactStrictMode: true,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
