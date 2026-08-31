import type { CategoryId } from "./categories";

/**
 * Duotone cover system (the blog's visual signature): every cover is exactly
 * two category colors + ink, one oversized geometric motif, and a typographic
 * watermark — the Ghost/Stripe-blog pattern of branded generative covers.
 * No photos, no emojis; deterministic per slug so covers never change between
 * builds.
 */
export interface CoverPalette {
  bg: string;
  fg: string;
  /** Short lowercase word used as the oversized watermark. */
  word: string;
  /** Kicker text color on light backgrounds (AA at small sizes). */
  kicker: string;
  /** Kicker text color on dark backgrounds. */
  kickerDark: string;
}

export const COVER_PALETTES: Record<CategoryId, CoverPalette> = {
  "dividir-contas": {
    bg: "#FFE1E9", fg: "#E5647A", word: "dividir",
    kicker: "#C2445C", kickerDark: "#FFA9BF",
  },
  organizacao: {
    bg: "#E9F7F0", fg: "#3E8E7A", word: "organizar",
    kicker: "#2E7263", kickerDark: "#7BD4BC",
  },
  "conversas-sobre-dinheiro": {
    bg: "#FDEAE4", fg: "#D96A50", word: "conversar",
    kicker: "#B24A33", kickerDark: "#F5A28C",
  },
  "metas-e-sonhos": {
    bg: "#FFF3E0", fg: "#DC9A3E", word: "sonhar",
    kicker: "#8F6314", kickerDark: "#F0C078",
  },
  ferramentas: {
    bg: "#EFECF7", fg: "#7A6BB5", word: "ferramentas",
    kicker: "#5D4E96", kickerDark: "#B4A7E8",
  },
};

export const COVER_INK = "#2A1B22";

/** Small stable hash so each slug always gets the same layout variant. */
export function coverVariant(slug: string): {
  /** Motif anchored to the right (default) or mirrored to the left. */
  mirrored: boolean;
  /** Slight rotation of the motif group, in degrees. */
  rotation: number;
  /** Watermark along the bottom-left (default) or top edge. */
  watermarkTop: boolean;
} {
  let h = 0;
  for (let i = 0; i < slug.length; i++) {
    h = (h * 31 + slug.charCodeAt(i)) >>> 0;
  }
  return {
    mirrored: h % 2 === 1,
    rotation: [-8, 0, 8][h % 3],
    watermarkTop: (h >> 2) % 2 === 1,
  };
}
