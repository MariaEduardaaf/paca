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
    /*
     * Chave do registro em `src/lib/autores.ts`, não o nome escrito.
     * Omitir = "Equipe Paca Finance", que é o que assina tudo o que foi
     * publicado antes de setembro de 2026. ⚠️ Não reatribua artigo antigo a
     * quem não o escreveu: autoria falsa é o sinal que o registro evita.
     */
    author: z.string().default("equipe"),
    // Chave de quem lê e avalia o guia antes de ir ao ar (não escreve nem edita).
    reviewer: z.string().optional(),
    draft: z.boolean().default(false),
    // Fica no ar para quem chega por link, mas fora do índice e do sitemap
    // (plano de recuperação no Google, 29/10/2026).
    noindex: z.boolean().default(false),
    // Emoji hero art on a brand-gradient card (no stock images).
  }),
});

export const collections = { blog };
