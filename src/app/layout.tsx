import type { Metadata } from "next";
import { Fraunces, Schibsted_Grotesk } from "next/font/google";
import type { ReactNode } from "react";
import { DevAgentation } from "@/components/ui/DevAgentation";
import { Analytics } from "@/components/ui/Analytics";
import { ToastProvider } from "@/components/ui/ToastProvider";
import { getSiteUrl, isIndexingAllowed } from "@/lib/site";
import "./globals.css";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
  axes: ["opsz"],
});

const schibsted = Schibsted_Grotesk({
  subsets: ["latin"],
  style: ["normal", "italic"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: {
    default: "Clarteon",
    template: "%s | Clarteon",
  },
  description:
    "Clarteon is the technology partner that believes the right solution starts with the right question.",
  applicationName: "Clarteon",
  robots: isIndexingAllowed() ? { index: true, follow: true } : { index: false, follow: false },
  openGraph: {
    type: "website",
    siteName: "Clarteon",
    locale: "en",
    title: "Clarteon",
    description:
      "Clarteon is the technology partner that believes the right solution starts with the right question.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Clarteon",
    description:
      "Clarteon is the technology partner that believes the right solution starts with the right question.",
  },
  icons: {
    icon: "/icon.svg",
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      className={`${fraunces.variable} ${schibsted.variable}`}
    >
      <body>
        <ToastProvider>
          <a className="skip-link" href="#main">
            Skip to content
          </a>
          {children}
          <Analytics />
          <DevAgentation />
        </ToastProvider>
      </body>
    </html>
  );
}
