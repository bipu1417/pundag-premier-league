const { createHash } = require("node:crypto");
const { FieldValue } = require("firebase-admin/firestore");
const { HttpsError } = require("firebase-functions/v2/https");

const normalizeMobile = (value) => {
  const text = String(value ?? "").trim();
  if (!/^[+\d\s()-]+$/.test(text)) return "";
  let digits = text.replace(/\D/g, "");
  if (digits.length === 14 && digits.startsWith("0091")) digits = digits.slice(4);
  if (digits.length === 12 && digits.startsWith("91")) digits = digits.slice(2);
  return digits;
};
const normalizeAadhaar = (value) => String(value ?? "").replace(/[\s-]/g, "");
const claimKey = (kind, value) => `${kind}_${createHash("sha256").update(value).digest("hex")}`;

exports.normalizeMobile = normalizeMobile;
exports.normalizeAadhaar = normalizeAadhaar;
exports.submitRegistration = async (db, request) => {
  if (!request.auth?.uid) throw new HttpsError("unauthenticated", "Please reload the registration page and try again.");
  const { tournamentId, year, payload } = request.data || {};
  if (typeof tournamentId !== "string" || !tournamentId || tournamentId.includes("/")
      || !Number.isSafeInteger(year) || !payload || typeof payload !== "object") {
    throw new HttpsError("invalid-argument", "Please select a valid tournament.");
  }
  const mnumber = normalizeMobile(payload.mnumber);
  const aadhaar = normalizeAadhaar(payload.aadhaar);
  if (!/^\d{10}$/.test(mnumber)) throw new HttpsError("invalid-argument", "Enter a valid 10-digit mobile number.");
  if (!/^\d{12}$/.test(aadhaar)) throw new HttpsError("invalid-argument", "Enter a valid 12-digit Aadhaar number.");
  if (typeof payload.name !== "string" || !payload.name.trim()) throw new HttpsError("invalid-argument", "Enter the player's name.");

  const indexRef = db.doc(`tournaments/${tournamentId}`);
  const tournamentRef = db.doc(`years/${year}/tournaments/${tournamentId}`);
  const pendingRef = tournamentRef.collection("pendingPlayers");
  const playerRef = pendingRef.doc();
  const claims = [
    tournamentRef.collection("registrationIdentities").doc(claimKey("mobile", mnumber)),
    tournamentRef.collection("registrationIdentities").doc(claimKey("aadhaar", aadhaar)),
  ];
  await db.runTransaction(async (transaction) => {
    const index = await transaction.get(indexRef);
    if (!index.exists || Number(index.data().year) !== year) throw new HttpsError("not-found", "Tournament no longer exists.");
    // Shared identity documents serialize simultaneous submissions with either
    // matching identifier. Only the backend can read or write these locks.
    for (const claim of claims) await transaction.get(claim);
    // Include older entries that predate this feature. Select only identity
    // fields: photos, payment screenshots and other details are not loaded.
    const pending = await transaction.get(pendingRef.select("mnumber", "aadhaar"));
    const approved = await transaction.get(tournamentRef.collection("players").select("mnumber", "aadhaar"));
    const duplicate = [...pending.docs, ...approved.docs].some((snapshot) => {
      const existing = snapshot.data();
      return normalizeMobile(existing.mnumber) === mnumber || normalizeAadhaar(existing.aadhaar) === aadhaar;
    });
    if (duplicate) throw new HttpsError("already-exists", "A registration already exists with this mobile number or Aadhaar number for this tournament.");

    const data = index.data();
    const start = data.registrationStartAt?.toMillis?.() ?? new Date(data.registrationStart || "").getTime();
    const end = data.registrationEndAt?.toMillis?.() ?? new Date(data.registrationEnd || "").getTime();
    const now = Date.now();
    if (data.isLegacy || data.status === "completed" || !Number.isFinite(start) || !Number.isFinite(end) || end <= start || now < start || now > end) {
      throw new HttpsError("failed-precondition", "Registration is not open for this tournament.");
    }
    if (Number(data.maxPlayers) > 0 && approved.size >= Number(data.maxPlayers)) {
      throw new HttpsError("resource-exhausted", "Closed — player limit reached");
    }
    const fields = ["name", "age", "playerType", "address", "photo", "paymentScreenshot", "upiRefNo"];
    const entry = Object.fromEntries(fields.filter((field) => payload[field] !== undefined).map((field) => [field, payload[field]]));
    transaction.create(playerRef, {
      ...entry, name: payload.name.trim(), mnumber, aadhaar,
      approved: false, paymentStatus: "pending", submittedBy: request.auth.uid,
      tournamentId, tournamentYear: year, createdAt: FieldValue.serverTimestamp(),
    });
    // Rejected/deleted submissions do not reserve identities forever: the live
    // pending/approved documents above determine whether an identity is used.
    for (const claim of claims) transaction.set(claim, { registrationId: playerRef.id });
  });
  return { registrationId: playerRef.id };
};
