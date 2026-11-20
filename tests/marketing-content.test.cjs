const { test } = require("node:test");
const assert = require("node:assert/strict");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const MarketingContent = require("../src/seo/MarketingContent");
const render = account => renderToStaticMarkup(React.createElement(MarketingContent, { embedded: true, account }));
const user = { uid: "organiser" };

test("signed-out visitors can create an account; loading does not flash a signup link", () => {
  assert.match(render(null), /href="\/signup"/);
  const loading = render({ loading: true });
  assert.doesNotMatch(loading, /href="\/signup"|href="\/subscription"/);
  assert.match(loading, /Checking your account/);
});

test("signed-in free users apply for premium instead of signing up again", () => {
  const html = render({ user, isSubscribed: false });
  assert.doesNotMatch(html, /href="\/signup"|Create a LeagueCraft account/);
  assert.match(html, /href="\/subscription"/);
  assert.match(html, /Apply for premium subscription/);
});

test("premium members receive a welcome message and organiser workspace access", () => {
  for (const account of [{ user, isSubscribed: true }, { user, isCreator: true }, { user, role: "platformAdmin" }]) {
    const html = render(account);
    assert.match(html, /Enjoy your LeagueCraft experience/);
    assert.match(html, /href="\/manage-tournaments"/);
    assert.doesNotMatch(html, /href="\/signup"|Apply for premium subscription/);
  }
});

test("pending, expired and rejected applications have the correct next action", () => {
  for (const [state, action] of [["isSubscriptionPending", "View subscription status"], ["isSubscriptionExpired", "Renew premium subscription"], ["isSubscriptionRejected", "Review premium application"]]) {
    const html = render({ user, [state]: true });
    assert.ok(html.includes(action));
    assert.match(html, /href="\/subscription"/);
    assert.doesNotMatch(html, /href="\/signup"|Apply for premium subscription/);
  }
});
