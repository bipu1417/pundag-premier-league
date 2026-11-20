#!/usr/bin/env node
// Reconcile the old pending+approved counter with the Registered Players collection.
// Pause registration/approval writes during deployment. Dry run unless --apply is given.
const auth = require("firebase-tools/lib/auth");
const { requireAuth } = require("firebase-tools/lib/requireAuth");
const { Client } = require("firebase-tools/lib/apiv2");
const project = process.argv.find((value) => value.startsWith("--project="))?.slice(10);
const apply = process.argv.includes("--apply");
// Add the new public field only after the updated rules/app are deployed.
const includeApprovedCount = process.argv.includes("--include-approved-count");

async function main() {
  if (!project) throw new Error("Specify --project=<firebase-project-id> explicitly.");
  const options = { project };
  const account = auth.getProjectDefaultAccount(process.cwd());
  if (!account) throw new Error("Firebase login is required before running this script.");
  auth.setActiveAccount(options, account);
  await requireAuth(options);
  const client = new Client({ urlPrefix: "https://firestore.googleapis.com", apiVersion: "v1" });
  const root = `projects/${project}/databases/(default)/documents`;
  const response = await client.post(`${root}:runQuery`, {
    structuredQuery: { from: [{ collectionId: "tournaments" }] },
  });
  for (const document of (response.body || []).map((item) => item.document).filter(Boolean)) {
    if (Number(document.fields?.capacityVersion?.integerValue) !== 1) continue;
    const id = document.name.split("/").pop();
    const year = document.fields.year.integerValue;
    const yearly = `${root}/years/${year}/tournaments/${id}`;
    const players = await client.post(`${yearly}:runAggregationQuery`, {
      structuredAggregationQuery: {
        structuredQuery: { from: [{ collectionId: "players" }] },
        aggregations: [{ alias: "players", count: {} }],
      },
    });
    const countValue = players.body?.[0]?.result?.aggregateFields?.players?.integerValue;
    if (countValue === undefined) throw new Error(`No player count returned for ${id}.`);
    const count = Number(countValue);
    if (!Number.isSafeInteger(count) || count < 0 || count > Number(document.fields.maxPlayers.integerValue)) {
      throw new Error(`Registered players exceed the configured limit for ${id}. Resolve this before migration.`);
    }
    console.log(`${id}: ${document.fields.registeredPlayerCount.integerValue} -> ${count} registered players${apply ? " (applying)" : " (dry run)"}`);
    if (!apply) continue;
    const counter = {
      registeredPlayerCount: { integerValue: String(count) },
      ...(includeApprovedCount || document.fields.approvedPlayerCount ? { approvedPlayerCount: { integerValue: String(count) } } : {}),
    };
    const mirrorKeys = ["teamCount", "lastRegistrationId", "lastReleasedRegistrationId", "lastTeamId", "lastDeletedTeamId"];
    const mirrorFields = Object.fromEntries(mirrorKeys.filter((key) => document.fields[key]).map((key) => [key, document.fields[key]]));
    await client.post(`${root}:commit`, {
      writes: [
        { update: { name: document.name, fields: counter }, updateMask: { fieldPaths: Object.keys(counter) }, currentDocument: { updateTime: document.updateTime } },
        { update: { name: yearly, fields: { ...counter, ...mirrorFields } }, updateMask: { fieldPaths: [...Object.keys(counter), ...mirrorKeys] }, currentDocument: { exists: true } },
        { update: { name: `${root}/publicTournaments/${id}`, fields: { ...counter, teamCount: document.fields.teamCount } }, updateMask: { fieldPaths: [...Object.keys(counter), "teamCount"] }, currentDocument: { exists: true } },
      ],
    });
  }
}
main().catch((error) => { console.error(error.message || error); process.exitCode = 1; });
