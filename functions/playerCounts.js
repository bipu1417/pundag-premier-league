// Count the Registered Players documents, never the pending submission documents.
// Re-read inside the transaction: trigger deliveries may be repeated or out of order.
exports.recountPlayers = async (db, { year, tournamentId }) => {
  const indexRef = db.doc(`tournaments/${tournamentId}`);
  const yearlyRef = db.doc(`years/${year}/tournaments/${tournamentId}`);
  const publicRef = db.doc(`publicTournaments/${tournamentId}`);
  return db.runTransaction(async (transaction) => {
    const index = await transaction.get(indexRef);
    if (!index.exists || String(index.data().year) !== String(year)) return;
    const yearly = await transaction.get(yearlyRef);
    const publicIndex = await transaction.get(publicRef);
    // select() returns document IDs without loading photos or personal information.
    const players = await transaction.get(yearlyRef.collection("players").select());
    const counts = { approvedPlayerCount: players.size, registeredPlayerCount: players.size };
    transaction.update(indexRef, counts);
    if (yearly.exists) transaction.update(yearlyRef, counts);
    if (publicIndex.exists) transaction.update(publicRef, counts);
    return players.size;
  });
};
