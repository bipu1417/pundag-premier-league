const { initializeApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const { onDocumentWritten } = require("firebase-functions/v2/firestore");
const { recountPlayers } = require("./playerCounts");

initializeApp();

// Recompute after approvals, removals, console edits, and imported players.
// Pending submissions do not write approvedPlayerCount.
exports.syncRegisteredPlayerCount = onDocumentWritten({
  document: "years/{year}/tournaments/{tournamentId}/players/{playerId}",
  retry: true,
}, (event) => recountPlayers(getFirestore(), event.params));


const { onCall } = require("firebase-functions/v2/https");
const { submitRegistration } = require("./registration");
exports.submitPlayerRegistration = onCall({ maxInstances: 10 }, (request) => submitRegistration(getFirestore(), request));
