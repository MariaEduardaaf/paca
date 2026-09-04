import type { CollectionEntry } from "astro:content";

export type BlogPost = CollectionEntry<"blog">;

/** Reading time in minutes, computed from the raw markdown word count. */
export function readingTimeMinutes(body: string | undefined): number {
  if (!body) return 1;
  const words = body
    .replace(/```[\s\S]*?```/g, " ")
    .split(/\s+/)
    .filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

/** Format a date in pt-BR, e.g. "27 de junho de 2026". */
export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

export function sortByDateDesc(posts: BlogPost[]): BlogPost[] {
  return [...posts].sort(
    (a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf(),
  );
}

export interface FaqItem {
  question: string;
  answer: string;
}

/** Remove enough markdown syntax for clean JSON-LD text. */
function stripMarkdown(text: string): string {
  return text
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1") // links -> label
    .replace(/`([^`]*)`/g, "$1")
    .replace(/(\*\*|__)(.*?)\1/g, "$2")
    .replace(/(\*|_)(.*?)\1/g, "$2")
    .replace(/^[-*+]\s+/gm, "")
    .replace(/^\d+\.\s+/gm, "")
    .replace(/^>\s?/gm, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Extract FAQ pairs from a post's raw markdown body.
 * Looks for an H2 "Perguntas frequentes"; each following "### question"
 * plus its first paragraph becomes one Q&A pair (only the first paragraph,
 * so closing remarks after the last question don't leak into the answer).
 * Returns [] when the post has no FAQ section.
 */
export function extractFaq(body: string | undefined): FaqItem[] {
  if (!body) return [];
  const h2 = body.match(/^##\s+Perguntas\s+[Ff]requentes\s*$/m);
  if (!h2 || h2.index === undefined) return [];

  const afterH2 = body.slice(h2.index + h2[0].length);
  // FAQ section ends at the next H2 (## but not ###), if any.
  const nextH2 = afterH2.match(/^##\s(?!#)/m);
  const section = nextH2 ? afterH2.slice(0, nextH2.index) : afterH2;

  const chunks = section.split(/^###\s+/m).slice(1);
  const items: FaqItem[] = [];
  for (const chunk of chunks) {
    const newlineIndex = chunk.indexOf("\n");
    const question = stripMarkdown(
      newlineIndex === -1 ? chunk : chunk.slice(0, newlineIndex),
    );
    const firstParagraph =
      newlineIndex === -1
        ? ""
        : (chunk
            .slice(newlineIndex + 1)
            .split(/\n\s*\n/)
            .map((p) => p.trim())
            .find(Boolean) ?? "");
    const answer = stripMarkdown(firstParagraph);
    if (question && answer) items.push({ question, answer });
  }
  return items;
}
