import type { Metadata } from "next";
import { Fraunces, Inter } from "next/font/google";
import type { ReactNode } from "react";
import { Analytics } from "@/components/ui/Analytics";
import { ChatWidgetSlot } from "@/components/ui/ChatWidgetSlot";
import { Footer } from "@/components/ui/Footer";
import { Header } from "@/components/ui/Header";
import { getSiteUrl, isIndexingAllowed } from "@/lib/site";
import "./globals.css";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
  axes: ["opsz"],
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
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
    <html lang="en" className={`${fraunces.variable} ${inter.variable}`}>
      <body>
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        <Header />
        {children}
        <Footer />
        <ChatWidgetSlot />
        <Analytics />
      </body>
    </html>
  );
}
