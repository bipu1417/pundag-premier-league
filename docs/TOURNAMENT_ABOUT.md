# Tournament About pages

The landing page shows “Open About Page” only when there is a selected tournament. `/about` follows the selection from the tournament directory; there is no global About navigation link. Without a selection, the page asks the visitor to select a tournament. Changing the tournament or account clears any open editor to avoid copying a draft to another tournament.

All viewers can read the selected tournament’s content. Only its `ownerId`, the application creator, or a user whose stored role is `platformAdmin` can edit it. Paid subscription access alone does not grant editing access to another organiser’s About page. Editing this content does not require a current subscription for the owner.

Editors can add an introduction and up to 20 sections, each with text and up to 30 cards. Cards support a title, subtitle, details and an optional HTTPS image URL. These can represent history results, committee members, sponsors or other information. Removing cards/sections takes effect on Save changes. Cancel discards the draft after confirmation. Existing PPL history and committee photos are used only as the initial content for the legacy PPL tournament. Saving an empty page deliberately clears that content rather than restoring defaults. The organiser's tournament-deletion workflow may delete its About document together with the tournament.

Each tournament stores its page at `tournamentAbout/{tournamentId}`. This document contains only public About content, a revision and update metadata. Tournament registrations and payment information remain in their existing restricted collections. A transaction checks the revision before publishing, so concurrent edits are rejected rather than overwriting newer content.

## Publish requirements

On 28 October 2026, the About-page rules were deployed to `pundag-premier-league` after explicit user approval. The deployed update added only the `tournamentAbout` rules to the previously active ruleset. All four About permission tests passed against that exact combination, and the active production rules were verified against it after deployment. The public read check returned `NOT_FOUND` for the unsaved legacy PPL About document, rather than a permission error; the application uses its legacy defaults until an editor saves that page.

The local `firestore.rules` also contains separate capacity and registration changes that were not part of this deployment. Review those differences before deploying the entire local file. A backup of the previously active rules was saved at `/private/tmp/leaguecraft-active-firestore.rules`, and the approved deployed rules and deployment config are at `/private/tmp/leaguecraft-about-rules-fix/` for this session.

The existing `npm run deploy` command deploys hosting only to `leaguecraft-aux`. It does not deploy these database rules. The two project IDs are different in the current application configuration; use the database project for rules and the existing hosting project for the web build.

## Verification

- `npm run build`
- `node --test tests/tournament-about-ui.test.cjs tests/registration-ui.test.cjs tests/seo-build.test.cjs`
- `tests/tournament-about-rules.test.cjs` runs against a local Firestore emulator and requires `@firebase/rules-unit-testing`. It covers owner CRUD through content updates, platform admins, public reads, blocked viewer/unrelated organiser writes, revision conflicts and invalid metadata. Set `PPL_TEST_DEPENDENCIES` to an external test package.json if the test dependencies are installed outside this project. These tests refuse to use production.

Browser preview automation was unavailable in this session because its runtime could not initialise. Editor interaction checks use a DOM test environment; an actual browser visual review remains a separate check.
