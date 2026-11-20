#!/usr/bin/env node

const auth = require("firebase-tools/lib/auth");
const { requireAuth } = require("firebase-tools/lib/requireAuth");
const { Client } = require("firebase-tools/lib/apiv2");

const project = process.argv.find((value) => value.startsWith("--project="))?.split("=")[1]
  || "pundag-premier-league";
const apply = process.argv.includes("--apply");

async function main() {
  const options = { project };
  const account = auth.getProjectDefaultAccount(process.cwd());
  if (!account) throw new Error("Firebase login is required before running this script.");
  auth.setActiveAccount(options, account);
  await requireAuth(options);

  const client = new Client({ urlPrefix: "https://identitytoolkit.googleapis.com", apiVersion: "v2" });
  const path = `projects/${project}/config`;
  const current = await client.get(path);
  const enabled = Boolean(current.body.signIn?.anonymous?.enabled);
  console.log(`Anonymous authentication is currently ${enabled ? "enabled" : "disabled"}.`);
  if (!apply || enabled) {
    if (!apply && !enabled) console.log("Dry run only. Re-run with --apply to enable it.");
    return;
  }

  await client.patch(path, {
    signIn: { anonymous: { enabled: true } },
  }, {
    queryParams: { updateMask: "signIn.anonymous.enabled" },
  });
  console.log("Anonymous authentication enabled.");
}

main().catch((error) => {
  console.error(error.message || error);
  process.exitCode = 1;
});
