import React, { act } from "react";
import { createRoot } from "react-dom/client";
import TournamentFixtures from "./TournamentFixtures";
import { useTournament } from "../context/TournamentContext";
import { useAuth } from "../context/AuthContext";
import { doc, getDoc, onSnapshot, setDoc } from "../firebase";

jest.mock("../context/TournamentContext", () => ({ useTournament: jest.fn() }));
jest.mock("../context/AuthContext", () => ({ useAuth: jest.fn() }));
jest.mock("../utils/tournamentData", () => ({ getDataCollection: jest.fn() }));
jest.mock("../firebase", () => ({
  db: {}, doc: jest.fn((...parts) => parts.slice(1).join("/")),
  getDoc: jest.fn(), onSnapshot: jest.fn(), setDoc: jest.fn(), serverTimestamp: () => "now",
}));

let container, root, saved;
const tournament = { id: "cup", year: 2026, name: "Cup", groupCount: 2 };
const mount = async () => {
  root = createRoot(container);
  await act(async () => root.render(<TournamentFixtures />));
};
const change = async (element, value) => {
  await act(async () => {
    element.value = String(value);
    element.dispatchEvent(new Event("change", { bubbles: true }));
  });
};
const positions = () => [...container.querySelectorAll('select[aria-label^="Play position for Team"]')];
const save = async () => {
  const button = [...container.querySelectorAll("button")].find((item) => item.textContent === "Save Fixtures");
  await act(async () => button.click());
};

beforeEach(() => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  saved = null;
  container = document.createElement("div");
  document.body.appendChild(container);
  useTournament.mockReturnValue({ activeTournament: tournament, canManageActiveTournament: true });
  useAuth.mockReturnValue({ user: { uid: "owner" }, isCreator: false, role: "user" });
  doc.mockImplementation((...parts) => parts.slice(1).join("/"));
  onSnapshot.mockImplementation((ref, callback) => {
    callback({ docs: Array.from({ length: 6 }, (_, index) => ({
      id: `t${index}`, data: () => ({ teamName: `Team ${index}` }),
    })) });
    return () => {};
  });
  getDoc.mockImplementation(async () => ({ exists: () => Boolean(saved), data: () => saved }));
  setDoc.mockImplementation(async (ref, data) => { saved = data; });
});
afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  jest.clearAllMocks();
});

test("owner moves matches across groups and the saved order survives reload for viewers", async () => {
  await mount();
  const lastMatch = positions().at(-1).getAttribute("aria-label");
  await change(positions().at(-1), 0);
  expect(positions()[0].getAttribute("aria-label")).toBe(lastMatch);
  await save();
  expect(saved.groupFixtures[0].home.id).toBe("t3");
  expect(saved.groupFixtures[0].away.id).toBe("t5");
  expect(saved.groupFixtures[0].matchNumber).toBe(1);
  await act(async () => root.unmount());
  useTournament.mockReturnValue({ activeTournament: tournament, canManageActiveTournament: false });
  useAuth.mockReturnValue({ user: { uid: "viewer" }, role: "user" });
  await mount();
  const section = [...container.querySelectorAll("section")].find((item) => item.textContent.includes("Group Stage Fixtures"));
  expect(section.querySelector(".safe-text").textContent).toBe("Team 3 vs Team 5");
  expect(positions()).toHaveLength(0);
  expect([...container.querySelectorAll("button")].some((item) => item.textContent === "Save Fixtures")).toBe(false);
});

test.each([{ role: "platformAdmin" }, { role: "user", isCreator: true }])("platform administrators can edit fixtures owned by another user: %j", async (account) => {
  useTournament.mockReturnValue({ activeTournament: tournament, canManageActiveTournament: false });
  useAuth.mockReturnValue({ user: { uid: "admin" }, ...account });
  await mount();
  expect(positions()).toHaveLength(6);
  await change(positions()[0], 5);
  await save();
  expect(saved.groupFixtures.at(-1).home.id).toBe("t0");
});

test("knockout reordering preserves bracket IDs, selected winners and subsequent pairings", async () => {
  await mount();
  const bracket = [...container.querySelectorAll("section")].find((item) => item.textContent.includes("Knockout Bracket"));
  const firstWinner = bracket.querySelector("select:not([aria-label])");
  const winnerId = firstWinner.options[1].value;
  await change(firstWinner, winnerId);
  await change(bracket.querySelector('select[aria-label="Play position for Semi Finals bracket match 1"]'), 1);
  await save();
  expect(saved.knockoutRounds[0].matches.map((match) => match.id)).toEqual(["r0-m1", "r0-m0"]);
  expect(saved.knockoutRounds[0].matches[1].selectedWinnerId).toBe(winnerId);
  expect(saved.knockoutRounds[0].matches[1].matchNumber).toBe(1);
  expect(saved.knockoutRounds[0].matches[1].playOrder).toBe(2);
  expect(saved.knockoutRounds[1].matches[0].home.team.id).toBe(winnerId);
  await act(async () => root.unmount());
  await mount();
  expect(container.querySelector('select[aria-label="Play position for Semi Finals bracket match 1"]').value).toBe("1");
});
