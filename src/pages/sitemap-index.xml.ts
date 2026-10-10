// The sitemap every page advertises (src/components/Metadata.astro): the fixed pages, then every
// project and blog post found on disk, so a new write-up is listed without touching this file.
import site from "../config/site";

const pages = Object.keys(import.meta.glob(["./projects/*.mdx", "./blog/*.mdx"]))
  .filter((path) => !path.split("/").pop()!.startsWith("_"))
  .map((path) => path.replace(/^\.\//, "/").replace(/\.mdx$/, ""));

export function GET() {
  const urls = ["/", "/projects", "/blog", "/resume", "/contact", ...pages].map((p) => new URL(p, site.url).href);
  const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((u) => `  <url><loc>${u}</loc></url>`).join("\n")}\n</urlset>\n`;
  return new Response(body, { headers: { "Content-Type": "application/xml; charset=utf-8" } });
}
