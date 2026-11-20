const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const pages = require("../src/seo/pages.json");
const read = file => fs.readFileSync(path.join(__dirname, "../build", file), "utf8");

test("public landing pages contain readable copy and unique metadata before JavaScript runs", () => {
  const titles = new Set();
  for (const [url, page] of Object.entries(pages)) {
    const html = read(url === "/" ? "index.html" : `${url.slice(1)}/index.html`);
    assert.ok(html.includes(page.heading));
    assert.ok(html.includes(page.intro));
    assert.equal((html.match(/<h1[ >]/g) || []).length, 1);
    assert.ok(html.includes(`href="https://www.leaguecraft.in${url}"`));
    assert.match(html, /name="robots" content="index,follow"/);
    assert.ok(!html.includes("%PUBLIC_URL%"));
    const title = html.match(/<title>(.*?)<\/title>/)[1];
    assert.ok(!titles.has(title));
    titles.add(title);
    for (const target of Object.keys(pages).filter(target => target !== url)) {
      assert.ok(html.includes(`href="${target}"`));
    }
    if (url !== "/") assert.ok(!html.includes('id="site-schema"'));
  }
  const schema = read("index.html").match(/<script id="site-schema" type="application\/ld\+json">(.*?)<\/script>/)[1];
  assert.equal(JSON.parse(schema)["@type"], "WebSite");
});

test("sitemap lists public pages and workspace HTML starts with noindex", () => {
  const sitemap = read("sitemap.xml");
  const urls = [...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map(match => match[1]);
  assert.deepEqual(urls, Object.keys(pages).map(url => `https://www.leaguecraft.in${url}`));
  assert.ok(read("robots.txt").includes("Sitemap: https://www.leaguecraft.in/sitemap.xml"));
  for (const route of ["about", "login", "signup", "profile", "auction", "payment", "manage-tournaments"]) {
    assert.match(read(`${route}/index.html`), /name="robots" content="noindex,follow"/);
  }
});
