import rss from "@astrojs/rss";
import site from "../config/site";

export async function GET() {
  const entries = Object.entries(
    import.meta.glob("./blog/*.mdx", { eager: true })
  ) as [string, any][];

  const items = entries
    .filter(([path]) => !path.split("/").pop()!.startsWith("_"))
    .map(([path, m]) => {
      const basename = path.split("/").pop()!.replace(/\.mdx$/, "");
      return {
        title: m.frontmatter?.title ?? "Untitled",
        description: m.frontmatter?.description ?? "",
        pubDate: new Date(m.frontmatter?.date),
        link: `/blog/${basename}/`,
      };
    })
    .sort((a, b) => b.pubDate.getTime() - a.pubDate.getTime());

  return rss({
    title: `${site.name} — Blog`,
    description: `Writing from ${site.name} — ${site.summary}`,
    site: site.seo.baseUrl,
    items,
  });
}
