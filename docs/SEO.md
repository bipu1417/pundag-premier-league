# LeagueCraft SEO implementation and launch

The build now produces readable initial HTML for the home page and three public guides, unique titles and descriptions, canonical URLs, sharing metadata, home-page WebSite structured data and a sitemap. The same content component renders in the React app. Existing access controls remain in place. Known sign-in and workspace routes receive initial noindex metadata; client navigation updates metadata too. Noindex is a search directive, not access control. Dynamic player URLs receive noindex after JavaScript renders; signed-out visitors are redirected to login.

The `/about` page follows the currently selected tournament. It is excluded from the sitemap and uses noindex because its content depends on the visitor’s selection. The landing page shows its About link only after a tournament is selected.

## Target searches

These are proposed targets based on the implemented features, not verified search-volume or difficulty estimates.

| Page | Search intent |
| --- | --- |
| `/` | sports tournament management software, tournament organiser software |
| `/cricket-tournament-management` | cricket tournament management software, organise a cricket tournament |
| `/football-tournament-organiser` | how to organise a football tournament, football tournament organiser |
| `/player-auction-software` | player auction software, cricket player auction software |

The football page describes general organisation and fixture tools. It does not promise football-specific scoring. Broad terms such as cricket, football and tournament have mixed intent; start by measuring specific organiser searches. Rankings and indexing are not guaranteed.

## Validate and publish

1. Run `npm run build`, then `node --test tests/seo-build.test.cjs`. The postbuild step writes the route HTML and `build/sitemap.xml`; deploy the full build directory.
2. Deploy with the existing `npm run deploy` command when ready. This change has not been deployed by the assistant.
3. Check all public pages and `/sitemap.xml` on the actual domain. Verify that Firebase serves each generated route's HTML directly before its SPA fallback. Check both trailing-slash variants and establish one redirect policy if both remain accessible.
4. Verify that `https://www.leaguecraft.in` is the intended primary hostname. Configure permanent redirects from HTTP, the apex domain and alternate Firebase hosting domains where possible. Canonical tags are already set to the requested www hostname; inspect actual redirects and certificates after deployment.
5. In Google Search Console, add the domain property `leaguecraft.in` and verify ownership using the DNS TXT record Google supplies. No verification token is invented or embedded in this project.
6. Submit `https://www.leaguecraft.in/sitemap.xml`. Inspect the home page and three guide URLs, run a live URL test, review rendered content and canonical selection, then request indexing. The public web lookup during this task could not fetch the site and returned no site-search results; this does not establish that the domain is offline or unindexed.

## Ongoing work

- Record a Search Console baseline after launch. Review indexed pages, impressions, clicks, queries, countries and average positions weekly. Track each target URL and query rather than a single site-wide position.
- Use feedback from real organisers to expand the guides with accurate screenshots, detailed workflows and original tournament examples. Get permission before publishing player information or tournament case studies.
- Ask participating leagues and clubs to link to relevant guides or genuine tournament case studies from their own websites. Avoid purchased links, fabricated testimonials and mass directory submissions.
- Check mobile usability and Core Web Vitals using Search Console and PageSpeed Insights. The app still loads Firebase and the main React bundle; further performance improvements should follow measurements.
- Review results after 4, 8 and 12 weeks to decide which content needs improvement. These are review milestones, not promises of ranking gains. Public tournament-detail pages can be a later project with an explicit privacy and publication model.

Google references: [SEO starter guide](https://developers.google.com/search/docs/fundamentals/seo-starter-guide), [JavaScript SEO](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics), [developer guide](https://developers.google.com/search/docs/fundamentals/get-started-developers).
