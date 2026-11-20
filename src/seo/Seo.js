import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import pages from "./pages.json";
import { useTournament } from "../context/TournamentContext";

const origin = "https://www.leaguecraft.in";

export default function Seo() {
  const { pathname } = useLocation();
  const { activeTournament } = useTournament();
  const tournamentName = activeTournament?.name;
  useEffect(() => {
    const path = pathname.replace(/\/+$/, "") || "/";
    const page = pages[path];
    const aboutTitle = tournamentName ? `About ${tournamentName} | LeagueCraft` : "Tournament About | LeagueCraft";
    const title = page?.title || (path === "/about" ? aboutTitle : "LeagueCraft Workspace");
    const description = page?.description || (path === "/about" ? "View the selected tournament’s story, history, sponsors and organising committee." : "Sign in to your LeagueCraft tournament workspace.");
    document.title = title;
    const meta = (key, value, attribute = "name") => {
      let element = document.head.querySelector(`meta[${attribute}="${key}"]`);
      if (!element) {
        element = document.createElement("meta");
        element.setAttribute(attribute, key);
        document.head.appendChild(element);
      }
      element.content = value;
    };
    meta("description", description);
    meta("robots", page ? "index,follow" : "noindex,follow");
    meta("og:title", title, "property");
    meta("og:description", description, "property");
    meta("og:url", origin + path, "property");
    meta("twitter:title", title);
    meta("twitter:description", description);
    let canonical = document.head.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.rel = "canonical";
      document.head.appendChild(canonical);
    }
    canonical.href = origin + path;
    // Website schema belongs to the home page, including on client navigation.
    document.getElementById("site-schema")?.remove();
    if (path === "/") {
      const schema = document.createElement("script");
      schema.id = "site-schema";
      schema.type = "application/ld+json";
      schema.textContent = JSON.stringify({ "@context": "https://schema.org", "@type": "WebSite", name: "LeagueCraft", url: origin + "/" });
      document.head.appendChild(schema);
    }
  }, [pathname, tournamentName]);
  return null;
}
