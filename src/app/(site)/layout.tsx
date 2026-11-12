import type { ReactNode } from "react";
import { ChatWidgetSlot } from "@/components/ui/ChatWidgetSlot";
import { CustomCursor } from "@/components/ui/CustomCursor";
import { Footer } from "@/components/ui/Footer";
import { Header } from "@/components/ui/Header";

export default function SiteLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <Header />
      {children}
      <Footer />
      <ChatWidgetSlot turnstileSiteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY} />
      <CustomCursor />
    </>
  );
}
