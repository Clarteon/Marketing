import type { Metadata } from "next";
import { ContactPage } from "@/components/pages/ContactPage";
import { getPage } from "@/lib/content";
import { metadataForPage } from "@/lib/metadata";
import { getPageWithData } from "@/lib/page-loader";
import { contactSchema } from "@/lib/page-schemas";

export async function generateMetadata(): Promise<Metadata> {
  const page = await getPage("contact");
  return page ? metadataForPage(page) : {};
}

export default async function Contact() {
  const { data } = await getPageWithData("contact", contactSchema);
  return <ContactPage data={data} />;
}
