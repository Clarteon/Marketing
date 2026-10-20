import { notFound } from "next/navigation";
import type { z } from "zod";
import { getPage } from "./content";
import { parsePageData } from "./page-schemas";

export async function getPageWithData<T>(slug: string, schema: z.ZodType<T>) {
  const page = await getPage(slug);

  if (!page) notFound();

  return { page, data: parsePageData(schema, page) };
}
