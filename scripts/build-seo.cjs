const fs = require("node:fs");
const path = require("node:path");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const MarketingContent = require("../src/seo/MarketingContent");
const pages = require("../src/seo/pages.json");

const build = path.join(__dirname, "../build");
const origin = "https://www.leaguecraft.in";
const template = fs.readFileSync(path.join(build, "index.html"), "utf8");
const escape = value => value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
// Generate the initial head for sign-in and workspace routes as well as public pages.
const app = fs.readFileSync(path.join(__dirname, "../src/App.js"), "utf8");
const routes = new Set([...Object.keys(pages), ...Array.from(app.matchAll(/<Route path="([^"]+)"/g), match => match[1]).filter(route => !route.includes(":"))]);
for (const route of routes) {
  const page = pages[route];
  const title = page?.title || "LeagueCraft Workspace";
  const description = page?.description || "Sign in to your LeagueCraft tournament workspace.";
  let html = template.replace(/<title>.*?<\/title>/, `<title>${escape(title)}</title>`);
  const setMeta = (key, value, attr = "name") => {
    html = html.replace(new RegExp(`<meta ${attr}="${key}" content="[^"]*"\\s*\/?>`), `<meta ${attr}="${key}" content="${escape(value)}" />`);
  };
  setMeta("description", description);
  setMeta("robots", page ? "index,follow" : "noindex,follow");
  setMeta("og:title", title, "property");
  setMeta("og:description", description, "property");
  setMeta("og:url", origin + route, "property");
  setMeta("twitter:title", title);
  setMeta("twitter:description", description);
  html = html.replace(/<link rel="canonical" href="[^"]*"\s*\/?>/, `<link rel="canonical" href="${origin + route}" />`);
  if (pages[route]) {
    html = html.replace('<div id="root"></div>', `<div id="root"><main>${renderToStaticMarkup(React.createElement(MarketingContent, { path: route }))}</main></div>`);
  }
  if (route === "/") {
    html = html.replace("</head>", `<script id="site-schema" type="application/ld+json">${JSON.stringify({ "@context": "https://schema.org", "@type": "WebSite", name: "LeagueCraft", url: origin + "/" })}</script></head>`);
  }
  const directory = route === "/" ? build : path.join(build, route.slice(1));
  fs.mkdirSync(directory, { recursive: true });
  fs.writeFileSync(path.join(directory, "index.html"), html);
}
const urls = Object.keys(pages);
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(url => `  <url><loc>${origin + url}</loc></url>`).join("\n")}\n</urlset>\n`;
fs.writeFileSync(path.join(build, "sitemap.xml"), sitemap);
console.log(`Generated SEO HTML for ${routes.size} routes and sitemap for ${urls.length} public pages.`);
