import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

const blog = defineCollection({
  loader: glob({ base: "./src/content/blog", pattern: "**/*.md" }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    category: z.enum([
      "organizacao",
      "conversas-sobre-dinheiro",
      "metas-e-sonhos",
      "dividir-contas",
      "ferramentas",
    ]),
    tags: z.array(z.string()).default([]),
    draft: z.boolean().default(false),
    // Emoji hero art on a brand-gradient card (no stock images).
    heroEmoji: z.string().default("💰"),
  }),
});

export const collections = { blog };
