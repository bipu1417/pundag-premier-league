[Project overview video](https://github.com/user-attachments/assets/2784c720-6094-439a-982d-9c70c9190b13)

# Getting Started with Create React App

This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).

## Available Scripts

In the project directory, you can run:

### `npm start`

Runs the app in the development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in your browser.

The page will reload when you make changes.\
You may also see any lint errors in the console.

### `npm test`

Launches the test runner in the interactive watch mode.\
See the section about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more information.

### `npm run build`

Builds the app for production to the `build` folder.\
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.\
Your app is ready to be deployed!

See the section about [deployment](https://facebook.github.io/create-react-app/docs/deployment) for more information.

### `npm run eject`

**Note: this is a one-way operation. Once you `eject`, you can't go back!**

If you aren't satisfied with the build tool and configuration choices, you can `eject` at any time. This command will remove the single build dependency from your project.

Instead, it will copy all the configuration files and the transitive dependencies (webpack, Babel, ESLint, etc) right into your project so you have full control over them. All of the commands except `eject` will still work, but they will point to the copied scripts so you can tweak them. At this point you're on your own.

You don't have to ever use `eject`. The curated feature set is suitable for small and middle deployments, and you shouldn't feel obligated to use this feature. However we understand that this tool wouldn't be useful if you couldn't customize it when you are ready for it.

## Learn More

You can learn more in the [Create React App documentation](https://facebook.github.io/create-react-app/docs/getting-started).

To learn React, check out the [React documentation](https://reactjs.org/).

### Code Splitting

This section has moved here: [https://facebook.github.io/create-react-app/docs/code-splitting](https://facebook.github.io/create-react-app/docs/code-splitting)

### Analyzing the Bundle Size

This section has moved here: [https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size](https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size)

### Making a Progressive Web App

This section has moved here: [https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app](https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app)

### Advanced Configuration

This section has moved here: [https://facebook.github.io/create-react-app/docs/advanced-configuration](https://facebook.github.io/create-react-app/docs/advanced-configuration)

### Deployment

This section has moved here: [https://facebook.github.io/create-react-app/docs/deployment](https://facebook.github.io/create-react-app/docs/deployment)

### `npm run build` fails to minify

This section has moved here: [https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify](https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify)

## Tournament capacity and groups

New tournaments require a team limit, a registered player limit, and a group count. Groups must have room for at least two teams; uneven group sizes are supported. The tournament index document (`tournaments/{id}`) holds the authoritative `registeredPlayerCount` and `teamCount` counters.

Only approved players count toward the player limit. Pending submissions, including repeated submissions by the same player, do not reserve places. Approval atomically moves a pending document to Registered Players and increments capacity, enforcing the limit even for concurrent approvals. Approval and team changes synchronize counters and linkage IDs in the yearly document as well as the private index and public listing; rules reject counted operations that leave a mirror stale. Rejection leaves capacity unchanged. The existing duplicate check prevents approving repeated player entries. Team creation and deletion adjust the separate team counter. Reaching the team limit does not close player registration; each limit applies to its own type of entry.

Registration availability updates live on the home page, tournament directory, organizer workspace, and registration page. Fixtures use the group count chosen when the tournament is created, distribute teams evenly, and handle knockout byes. Existing tournaments without capacity settings retain their previous behavior; existing data is not assigned guessed limits or reset counters.

Deploy the updated Firestore rules before using capacity limits against the live backend. The currently configured client project in `src/firebase.js` is `pundag-premier-league`:

```sh
npx firebase-tools deploy --only firestore:rules --project pundag-premier-league
```

Existing counters must be recalculated from Registered Players when deploying this change. Pause registration and approval writes during the rules/app rollout and migration. Preview the migration, then apply it to the intended project:

```sh
node scripts/recount-registered-players.cjs --project=pundag-premier-league
node scripts/recount-registered-players.cjs --project=pundag-premier-league --apply
```

The migration updates the private index, yearly document, and public count together. It leaves pending submissions untouched and refuses counts above the configured limit. Run it after the rules and application are updated, before resuming writes.

The existing `npm run deploy` script targets a different hosting project. The command above explicitly targets the database used by the client.

### Counting Registered Players

Signed-in clients read the actual `players` collection count with `getCountFromServer`, refresh it every 15 seconds and on window focus, and recheck it when submitting. All buttons, capacity labels and settings validations prefer that fresh count. They then fall back to `approvedPlayerCount`, a count derived from player documents, before using the legacy `registeredPlayerCount` field for older tournaments. Client-only live counts are never written into public tournament metadata.

The `functions/` backend rebuilds `approvedPlayerCount` and the compatibility counter from `years/{year}/tournaments/{id}/players` whenever a player document is added, edited or deleted. It updates the index, yearly document and public listing in a transaction. Duplicate or delayed triggers recount current documents rather than incrementing stale values. Pending submissions never change the approved count.

To activate this behavior for public visitors, deploy the matching rules, function and frontend together, then initialize the actual counts:

```sh
npm --prefix functions ci
npx firebase-tools deploy --only firestore:rules,functions:syncRegisteredPlayerCount,functions:submitPlayerRegistration --project pundag-premier-league
node scripts/recount-registered-players.cjs --project=pundag-premier-league --include-approved-count --apply
npm run deploy
```

Without `--include-approved-count`, the recount command repairs the existing fields without introducing the new field to a backend still running the older rules. Keeping deployment pending means the live backend can still use the old submission logic; a one-time counter repair cannot change that behavior.

### Duplicate registration prevention

`submitPlayerRegistration` is an authenticated callable function, including for temporary anonymous registration sessions. It rejects a submission if either the mobile number or Aadhaar already appears in pending or approved players for that tournament. Mobile numbers are normalized to 10 digits (including `+91`/`0091` prefixes), and Aadhaar spaces/hyphens are removed before comparison and storage. Inputs must contain a valid-length mobile number and Aadhaar.

The function checks older records too; no identity backfill or deletion of existing submissions is required. Private identity locks and the submission are written in one transaction so simultaneous submissions cannot both succeed. Rejection allows a corrected resubmission once the pending entry is removed. The same player may register in a different tournament. Identity locks are inaccessible to clients, and direct client creation of pending entries is denied to prevent bypassing the check.

Publish `functions:submitPlayerRegistration`, the updated Firestore rules, and the frontend together to enable this path. Until that rollout, the live app still uses its existing submission behavior; local source changes alone cannot enforce uniqueness on the live database. Run the backend integration suites against the local Firestore emulator with:

```sh
FIRESTORE_EMULATOR_HOST=127.0.0.1:8088 \
PPL_TEST_DEPENDENCIES=/tmp/ppl-capacity-tests/package.json \
node --test tests/firestore-capacity.test.cjs tests/tournament-management-rules.test.cjs tests/player-count-sync.test.cjs tests/duplicate-registration.test.cjs
```

### Public tournament listings

Signed-out visitors read `publicTournaments/{id}`, a sanitized mirror that excludes owner email/phone, UPI IDs, payment QR images, and player records. Tournament creation, editing, capacity updates, and deletion keep this mirror synchronized. Signed-in users continue reading the private `tournaments/{id}` documents.

Preview the one-time backfill for existing tournaments, then apply it after publishing the updated rules:

```sh
npm run sync:public-tournaments
npm run sync:public-tournaments -- --apply
```

Player registration uses a temporary Firebase anonymous identity, so visitors can submit without a visible login while security rules still receive a verified UID. Preview and enable the provider with:

```sh
npm run configure:anonymous-auth
npm run configure:anonymous-auth -- --apply
```

Run the pure scheduling/capacity and server-rendered registration UI checks with Node 22 or newer:

```sh
node --test tests/tournament-capacity.test.mjs tests/registration-ui.test.cjs tests/player-capacity-service.test.cjs
```

The Firestore integration checks use an isolated emulator and never write production data. They require `@firebase/rules-unit-testing` and `firebase` in a test-tools directory, plus a running Firestore emulator. Set `PPL_TEST_DEPENDENCIES` to that directory's `package.json` when keeping test dependencies outside this project:

```sh
FIRESTORE_EMULATOR_HOST=127.0.0.1:8086 \
PPL_TEST_DEPENDENCIES=/tmp/ppl-capacity-tests/package.json \
node --test tests/firestore-capacity.test.cjs
```
