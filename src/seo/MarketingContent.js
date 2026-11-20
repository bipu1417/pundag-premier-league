// Shared with the build script; account defaults to the signed-out public view.
const React = require("react");
const { ArrowUpRight, Check, Clock3, Crown, Layers3, Sparkles, Trophy } = require("lucide-react");
const pages = require("./pages.json");
const h = React.createElement;

const guideLabels = {
  "/": ["LeagueCraft overview", "Your tournament workspace"],
  "/cricket-tournament-management": ["Cricket tournaments", "From registration to the final"],
  "/football-tournament-organiser": ["Football tournaments", "Plan teams, groups and fixtures"],
  "/player-auction-software": ["Player auctions", "Build squads with confidence"],
};

function membership(account) {
  if (account?.loading) return { label: "Getting things ready", title: "Your next tournament starts here.", text: "Checking your account and membership…", icon: Sparkles };
  if (!account?.user) return { label: "Join the league", title: "Big tournament plans? Start here.", text: "Create your account and bring your players, teams and tournament plans together.", action: "Create a LeagueCraft account", href: "/signup", icon: Sparkles };
  if (account.isSubscribed || account.isCreator || account.role === "platformAdmin") return { label: "Your organiser access is ready", title: "Enjoy your LeagueCraft experience.", text: "Your workspace is ready. Bring your next tournament to life, from the first registration to the final match.", action: "Open tournament workspace", href: "/manage-tournaments", icon: Check, active: true };
  if (account.isSubscriptionPending) return { label: "Application under review", title: "You’re one step closer to match day.", text: "Your premium application has been submitted. Check its status while we review your payment.", action: "View subscription status", href: "/subscription", icon: Clock3 };
  if (account.isSubscriptionExpired) return { label: "Keep the momentum going", title: "Ready for your next season?", text: "Renew your premium subscription to return to your tournament organiser tools.", action: "Renew premium subscription", href: "/subscription", icon: Crown };
  if (account.isSubscriptionRejected) return { label: "Your application needs attention", title: "Let’s get you ready to organise.", text: "Review your subscription status and payment details before submitting your application again.", action: "Review premium application", href: "/subscription", icon: Crown };
  return { label: "Take the organiser’s seat", title: "Make your next tournament happen.", text: "Apply for premium to create tournaments, open player registrations and run your auctions in one place.", action: "Apply for premium subscription", href: "/subscription", icon: Crown };
}

function MarketingContent({ path = "/", embedded = false, account = null }) {
  const page = pages[path];
  const member = membership(account);
  return h("article", { className: "league-guide" },
    h("header", { className: "league-guide-heading" },
      h("span", { className: "league-guide-eyebrow" }, h(Layers3, { size: 15, "aria-hidden": true }), "Built for the people behind the game"),
      h(embedded ? "h2" : "h1", null, page.heading),
      h("p", null, page.intro)),
    h("div", { className: "league-guide-sections" }, ...page.sections.map((section, index) =>
      h("section", { key: section.heading, className: "league-guide-feature" },
        h("span", { className: "league-guide-number", "aria-hidden": true }, String(index + 1).padStart(2, "0")),
        h(embedded ? "h3" : "h2", null, section.heading),
        h("p", null, section.text)))),
    h("div", { className: "league-guide-resources" },
      h("div", { className: "league-guide-resources-heading" },
        h("span", { className: "league-guide-eyebrow" }, h(Trophy, { size: 15, "aria-hidden": true }), "Plan your next competition"),
        h(embedded ? "h3" : "h2", null, "A little planning. A great tournament.")),
      h("nav", { "aria-label": "Tournament guides", className: "league-guide-links" },
        ...Object.entries(pages).filter(([url]) => url !== path).map(([url]) => h("a", { key: url, href: url },
          h("span", null, h("strong", null, guideLabels[url][0]), h("small", null, guideLabels[url][1])),
          h(ArrowUpRight, { size: 20, "aria-hidden": true }))))),
    h("section", { className: `league-membership${member.active ? " league-membership-active" : ""}`, "aria-label": "Your LeagueCraft membership", "aria-live": "polite", "aria-busy": Boolean(account?.loading) },
      h("div", { className: "league-membership-icon", "aria-hidden": true }, h(member.icon, { size: 25 })),
      h("div", { className: "league-membership-copy" },
        h("span", { className: "league-guide-eyebrow" }, member.label),
        h(embedded ? "h3" : "h2", null, member.title),
        h("p", null, member.text)),
      member.action && h("a", { href: member.href, className: "league-membership-action" }, member.action, h(ArrowUpRight, { size: 18, "aria-hidden": true })))
  );
}

module.exports = MarketingContent;
