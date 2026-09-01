import rss from "@astrojs/rss";
import { getCollection } from "astro:content";
import { SITE_TITLE, SITE_DESCRIPTION } from "../consts";

export async function GET(context) {
  const posts = (await getCollection("blog", ({ data }) => !data.draft)).sort(
    (a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf(),
  );

  return rss({
    title: `${SITE_TITLE} — Blog`,
    description: SITE_DESCRIPTION,
    site: context.site,
    // O site usa trailingSlash "never" (astro.config.mjs) e o canonical sai sem
    // barra final. Sem isto o feed publicaria /blog/slug/ — outra URL para a
    // mesma página, justo no canal que agregadores usam para citar o link.
    trailingSlash: false,
    items: posts.map((post) => ({
      title: post.data.title,
      description: post.data.description,
      pubDate: post.data.pubDate,
      categories: [post.data.category, ...post.data.tags],
      link: `/blog/${post.id}`,
    })),
    customData: "<language>pt-BR</language>",
  });
}
