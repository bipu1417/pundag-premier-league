#!/usr/bin/env node

const auth = require("firebase-tools/lib/auth");
const { requireAuth } = require("firebase-tools/lib/requireAuth");
const { Client } = require("firebase-tools/lib/apiv2");

const project = process.argv.find((value) => value.startsWith("--project="))?.split("=")[1]
  || "pundag-premier-league";
const apply = process.argv.includes("--apply");
const database = "(default)";
const root = `projects/${project}/databases/${database}/documents`;

const defaults = {
  name: { stringValue: "Tournament" },
  sport: { stringValue: "Sports" },
  year: { integerValue: String(new Date().getFullYear()) },
  registrationStart: { stringValue: "" },
  registrationEnd: { stringValue: "" },
  maxTeams: { integerValue: "0" },
  maxPlayers: { integerValue: "0" },
  groupCount: { integerValue: "0" },
  teamCount: { integerValue: "0" },
  registeredPlayerCount: { integerValue: "0" },
  winnerPrize: { integerValue: "0" },
  runnerUpPrize: { integerValue: "0" },
  auctionEnabled: { booleanValue: false },
  status: { stringValue: "draft" },
};

const sanitize = (document) => ({
  ...Object.fromEntries(Object.entries(defaults).map(([field, fallback]) => [field, document.fields?.[field] || fallback])),
  ...(document.fields?.approvedPlayerCount ? { approvedPlayerCount: document.fields.approvedPlayerCount } : {}),
});
const registrationConfig = (document) => ({
  upiId: document.fields?.upiId || { stringValue: "" },
  paymentQr: document.fields?.paymentQr || { stringValue: "" },
});

async function main() {
  const options = { project };
  const account = auth.getProjectDefaultAccount(process.cwd());
  if (!account) throw new Error("Firebase login is required before running this script.");
  auth.setActiveAccount(options, account);
  await requireAuth(options);

  const client = new Client({ urlPrefix: "https://firestore.googleapis.com", apiVersion: "v1" });
  const response = await client.post(`${root}:runQuery`, {
    structuredQuery: {
      from: [{ collectionId: "tournaments", allDescendants: true }],
    },
  });
  const discovered = (response.body || []).map((result) => result.document).filter(Boolean);
  const documentsById = new Map();
  // Prefer the current top-level index when the same ID also has a yearly mirror.
  for (const document of discovered.sort((left, right) => left.name.split("/").length - right.name.split("/").length)) {
    const id = document.name.split("/").pop();
    if (!documentsById.has(id)) documentsById.set(id, document);
  }
  const documents = [...documentsById.values()];

  console.log(`Found ${discovered.length} tournament document(s), representing ${documents.length} unique public listing(s).`);
  if (!apply) {
    console.log("Dry run only. Re-run with --apply to create the sanitized public mirrors.");
    return;
  }

  for (let offset = 0; offset < documents.length; offset += 200) {
    const writes = documents.slice(offset, offset + 200).flatMap((document) => {
      const id = document.name.split("/").pop();
      return [{
        update: {
          name: `${root}/publicTournaments/${id}`,
          fields: sanitize(document),
        },
      }, {
        update: {
          name: `${root}/publicRegistrationConfigs/${id}`,
          fields: registrationConfig(document),
        },
      }];
    });
    await client.post(`${root}:commit`, { writes });
  }
  console.log(`Published ${documents.length} sanitized tournament listing(s).`);
}

main().catch((error) => {
  console.error(error.message || error);
  process.exitCode = 1;
});
