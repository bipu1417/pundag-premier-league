import React, { useEffect, useMemo, useState } from "react";
import {
  collection,
  addDoc,
  doc,
  deleteDoc,
  orderBy,
  query,
  updateDoc,
  onSnapshot,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase";

/**
 * AuctionManagerFull
 *
 * Collections:
 *  - registeredPlayers
 *  - teamdetails  (should contain teamName, logoBase64 (optional), purse (optional))
 *  - AuctionDetails (playerId, teamName, auctionPrice, createdAt)
 *
 * NOTE: Ensure your firebase exports `db` correctly.
 */

const DEFAULT_PURSE = 11000; // fallback if team.purse absent

export default function AuctionManagerFull({ isAdmin }) {
  // raw data
  const [players, setPlayers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [assignments, setAssignments] = useState([]); // AuctionDetails docs

  // form state
  const [selectedPlayer, setSelectedPlayer] = useState("");
  const [selectedTeam, setSelectedTeam] = useState("");
  const [auctionPrice, setAuctionPrice] = useState("");

  // UI controls
  const [search, setSearch] = useState("");
  const [filterTeam, setFilterTeam] = useState(""); // teamName or empty for all
  const [sortBy, setSortBy] = useState("none"); // none | priceAsc | priceDesc | nameAsc | nameDesc | teamAsc | teamDesc

  // edit modal
  const [editingAssignment, setEditingAssignment] = useState(null);
  const [editingPrice, setEditingPrice] = useState("");

  // errors / messages
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  // --- realtime listeners ---
  useEffect(() => {
    const q = query(
      collection(db, "players"),
      orderBy("name", "asc")   // 🔥 Sort alphabetically
      );

    const unsubPlayers = onSnapshot(q, (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setPlayers(list);
    });
    // const unsubPlayers = onSnapshot(collection(db, "players"), (snap) => {
    //   const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    //   setPlayers(list);
    // });

    const unsubTeams = onSnapshot(collection(db, "teamdetails"), (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setTeams(list);
    });

    const unsubAssignments = onSnapshot(collection(db, "AuctionDetails"), (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setAssignments(list);
    });

    return () => {
      unsubPlayers();
      unsubTeams();
      unsubAssignments();
    };
  }, []);

  // Helper: get player by id
  const getPlayer = (id) => players.find((p) => p.id === id) || { id, name: "Unknown" };

  // Prevent duplicate assignment
  const isPlayerAssigned = (playerId) =>
    assignments.some((a) => a.playerId === playerId);

  // Compute team-wise totals & remaining purse
  const teamStats = useMemo(() => {
    // map teamName -> { team, assigned:[], totalSpent, purse, remaining }
    const map = {};
    teams.forEach((t) => {
      const purse = typeof t.purse === "number" ? t.purse : DEFAULT_PURSE;
      map[t.teamName] = { team: t, assigned: [], totalSpent: 0, purse, remaining: purse };
    });

    assignments.forEach((a) => {
      const teamName = a.teamName;
      if (!map[teamName]) {
        // team removed or non-existing — create placeholder
        const purse = DEFAULT_PURSE;
        map[teamName] = { team: { teamName }, assigned: [], totalSpent: 0, purse, remaining: purse };
      }
      map[teamName].assigned.push(a);
      map[teamName].totalSpent += Number(a.auctionPrice || 0);
    });

    // compute remaining
    Object.values(map).forEach((entry) => {
      entry.remaining = entry.purse - entry.totalSpent;
    });

    return map;
  }, [teams, assignments]);

  // Assign handler
  const handleAssign = async () => {
    setError("");
    setInfo("");

    if (!selectedPlayer || !selectedTeam || !auctionPrice) {
      setError("Please select player, team and provide auction price.");
      return;
    }

    if (isPlayerAssigned(selectedPlayer)) {
      setError("Selected player is already assigned to a team.");
      return;
    }

    // Optional: check if team has enough purse remaining
    const teamEntry = teamStats[selectedTeam];
    const priceNum = Number(auctionPrice);
    if (teamEntry && teamEntry.remaining - priceNum < 0) {
      // not enough funds
      const proceed = window.confirm(
        `Team "${selectedTeam}" doesn't have enough purse remaining (remaining: ${teamEntry.remaining}). Proceed?`
      );
      if (!proceed) return;
    }

    try {
      await addDoc(collection(db, "AuctionDetails"), {
        playerId: selectedPlayer,
        teamName: selectedTeam,
        auctionPrice: priceNum,
        createdAt: serverTimestamp(),
      });
      setInfo("Player assigned successfully.");
      // reset
      setSelectedPlayer("");
      setSelectedTeam("");
      setAuctionPrice("");
    } catch (err) {
      console.error("Assign error:", err);
      setError("Failed to assign player. Check console.");
    }
  };

  // Remove (unassign)
  const handleRemove = async (assignmentId) => {
    if (!window.confirm("Remove this player from team?")) return;
    try {
      await deleteDoc(doc(db, "AuctionDetails", assignmentId));
      setInfo("Player unassigned.");
    } catch (err) {
      console.error(err);
      setError("Failed to remove assignment.");
    }
  };

  // Open edit modal
  const openEdit = (assignment) => {
    setEditingAssignment(assignment);
    setEditingPrice(String(assignment.auctionPrice || ""));
    setError("");
  };

  // Save edited price
  const saveEdit = async () => {
    if (!editingAssignment) return;
    const priceNum = Number(editingPrice);
    if (isNaN(priceNum) || priceNum < 0) {
      setError("Enter a valid price");
      return;
    }

    // check purse constraint
    const teamName = editingAssignment.teamName;
    const teamEntry = teamStats[teamName];
    const oldPrice = Number(editingAssignment.auctionPrice || 0);
    const delta = priceNum - oldPrice; // additional money needed
    if (teamEntry && teamEntry.remaining - delta < 0) {
      const proceed = window.confirm(
        `Editing will exceed ${teamName} purse. Remaining: ${teamEntry.remaining}. Proceed?`
      );
      if (!proceed) return;
    }

    try {
      await updateDoc(doc(db, "AuctionDetails", editingAssignment.id), {
        auctionPrice: priceNum,
        updatedAt: serverTimestamp(),
      });
      setEditingAssignment(null);
      setEditingPrice("");
      setInfo("Auction price updated.");
    } catch (err) {
      console.error(err);
      setError("Failed to update price.");
    }
  };

  // Filter + search + sorting for display
  const filteredAssignments = useMemo(() => {
    let list = assignments.map((a) => ({
      ...a,
      player: getPlayer(a.playerId),
    }));

    // search by player name
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (a) =>
          (a.player?.name || "").toLowerCase().includes(q) ||
          (a.teamName || "").toLowerCase().includes(q)
      );
    }

    if (filterTeam) {
      list = list.filter((a) => a.teamName === filterTeam);
    }

    // sorting
    switch (sortBy) {
      case "priceAsc":
        list.sort((x, y) => Number(x.auctionPrice || 0) - Number(y.auctionPrice || 0));
        break;
      case "priceDesc":
        list.sort((x, y) => Number(y.auctionPrice || 0) - Number(x.auctionPrice || 0));
        break;
      case "nameAsc":
        list.sort((x, y) => (x.player?.name || "").localeCompare(y.player?.name || ""));
        break;
      case "nameDesc":
        list.sort((x, y) => (y.player?.name || "").localeCompare(x.player?.name || ""));
        break;
      case "teamAsc":
        list.sort((x, y) => (x.teamName || "").localeCompare(y.teamName || ""));
        break;
      case "teamDesc":
        list.sort((x, y) => (y.teamName || "").localeCompare(x.teamName || ""));
        break;
      default:
        break;
    }

    return list;
  }, [assignments, players, search, filterTeam, sortBy]);

  // Group by team for live dashboard
  const groupedByTeam = useMemo(() => {
    const groups = {};
    // ensure all teams exist as keys
    teams.forEach((t) => {
      groups[t.teamName] = { team: t, assignments: [], total: 0 };
    });
    assignments.forEach((a) => {
      if (!groups[a.teamName]) {
        groups[a.teamName] = { team: { teamName: a.teamName }, assignments: [], total: 0 };
      }
      groups[a.teamName].assignments.push({ ...a, player: getPlayer(a.playerId) });
      groups[a.teamName].total += Number(a.auctionPrice || 0);
    });
    return groups;
  }, [teams, assignments, players]);

  return (
    <div className="min-h-screen bg-gray-900 text-white px-4 py-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header + Form */}
        {isAdmin && 
        <>
            <div className="bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-700">
            <h1 className="text-2xl font-bold text-yellow-400 mb-4">Auction — Assign Players</h1>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <select
                className="bg-gray-700 px-3 py-2 rounded-md"
                value={selectedPlayer}
                onChange={(e) => setSelectedPlayer(e.target.value)}
              >
                <option value="">Select Player</option>
                {players.map((p) => (
                  <option key={p.id} value={p.id} disabled={isPlayerAssigned(p.id)}>
                    {p.name} {isPlayerAssigned(p.id) ? " (assigned)" : ""}
                  </option>
                ))}
              </select>

              <select
                className="bg-gray-700 px-3 py-2 rounded-md"
                value={selectedTeam}
                onChange={(e) => setSelectedTeam(e.target.value)}
              >
                <option value="">Select Team</option>
                {teams.map((t) => (
                  <option key={t.id} value={t.teamName}>
                    {t.teamName}
                  </option>
                ))}
              </select>

              <input
                type="number"
                min="0"
                className="bg-gray-700 px-3 py-2 rounded-md"
                placeholder="Auction Price"
                value={auctionPrice}
                onChange={(e) => setAuctionPrice(e.target.value)}
              />

              <button
                onClick={handleAssign}
                className="bg-yellow-500 text-black font-semibold px-4 py-2 rounded-md hover:bg-yellow-400"
              >
                Assign
              </button>
            </div>

            {error && <p className="text-red-400 mt-2">{error}</p>}
            {info && <p className="text-green-300 mt-2">{info}</p>}
          </div>
        </>
        }
        

        {/* Controls: search / filter / sort */}
        {isAdmin && <>
            <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between w-full">

              {/* LEFT SECTION */}
              <div className="flex flex-col sm:flex-row gap-3 w-full md:w-2/3">
                <input
                  type="text"
                  placeholder="Search player or team..."
                  className="w-full sm:w-1/2 bg-gray-800 px-3 py-2 rounded-md"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />

                <select
                  className="w-full sm:w-auto bg-gray-800 px-3 py-2 rounded-md"
                  value={filterTeam}
                  onChange={(e) => setFilterTeam(e.target.value)}
                >
                  <option value="">All Teams</option>
                  {teams.map((t) => (
                    <option key={t.id} value={t.teamName}>
                      {t.teamName}
                    </option>
                  ))}
                </select>

                <select
                  className="w-full sm:w-auto bg-gray-800 px-3 py-2 rounded-md"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                >
                  <option value="none">Sort: None</option>
                  <option value="priceAsc">Price ↑</option>
                  <option value="priceDesc">Price ↓</option>
                  <option value="nameAsc">Name A→Z</option>
                  <option value="nameDesc">Name Z→A</option>
                  <option value="teamAsc">Team A→Z</option>
                  <option value="teamDesc">Team Z→A</option>
                </select>
              </div>

              {/* RIGHT SECTION */}
              <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center w-full md:w-auto mt-2 md:mt-0">
                <div className="text-sm text-gray-300">
                  Total Players: <span className="text-yellow-300">{assignments.length}</span>
                </div>

                <button
                  onClick={() => {
                    setSearch("");
                    setFilterTeam("");
                    setSortBy("none");
                  }}
                  className="bg-gray-800 px-3 py-1 rounded-md text-sm w-full sm:w-auto"
                >
                  Reset
                </button>
              </div>

            </div>

        </>}
        

        {/* Live Auction Dashboard (team cards) */}
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Object.values(groupedByTeam).map((g) => {
            const t = g.team;
            const purse = typeof t.purse === "number" ? t.purse : DEFAULT_PURSE;
            const spent = g.total;
            const remaining = purse - spent;

            return (
              
              <div key={t.teamName} className="bg-gray-800 p-4 rounded-xl border border-gray-700 shadow hover:shadow-yellow-400/10 transition">
                <div className="flex items-center gap-3">
                  {t.logoBase64 ? (
                    <img src={t.logoBase64} alt="logo" className="w-12 h-12 rounded-full object-cover border border-yellow-400" />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-gray-700 flex items-center justify-center text-yellow-300 font-bold">
                      {t.teamName?.charAt(0) || "T"}
                    </div>
                  )}
                  <div>
                    <div className="text-yellow-300 font-bold">{t.teamName}</div>
                    <div className="text-sm text-gray-300">Players: {g.assignments.length}</div>
                  </div>
                </div>

                {/* purse bar */}
                <div className="mt-3">
                  <div className="text-sm text-gray-300 mb-1">Purse Remaining</div>
                  <div className="w-full bg-gray-700 h-3 rounded-full overflow-hidden">
                    {/* compute percent */}
                    <div
                      className="h-3 rounded-full bg-yellow-400 transition-all"
                      style={{
                        width: `${Math.max(0, Math.min(100, ((remaining) / (purse || 1)) * 100))}%`,
                      }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-gray-400 mt-1">
                    <span>Remaining: {remaining}</span>
                    <span>Spent: {spent}</span>
                  </div>
                </div>

                {/* player mini list with animations */}
                
                {/* player mini list with expand on hover */}
                <div className="mt-3 space-y-2">

                  {g.assignments.length === 0 ? (
                    <div className="text-gray-400 text-sm">No players.</div>
                  ) : (
                    <div
                      className="
                        group
                        max-h-[120px] 
                        overflow-hidden 
                        hover:max-h-[900px] 
                        transition-all 
                        duration-500
                        ease-in-out
                      "
                    >
                      {g.assignments.map((a, index) => (
                        <div
                          key={a.id}
                          className={`
                            bg-gray-900 p-2 rounded-md flex items-center justify-between gap-3 
                            transform transition hover:-translate-y-1
                            ${index > 1 ? "opacity-0 group-hover:opacity-100 transition-opacity duration-500" : ""}
                          `}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center text-sm text-yellow-300 overflow-hidden">
                              {a.player?.name
                                ? a.player.name.split(" ").map(n => n[0]).slice(0, 2).join("")
                                : "P"}
                            </div>

                            <div>
                              <div className="text-sm font-medium">
                                {a.player?.name || "Unknown"}
                              </div>
                              <div className="text-xs text-gray-400">
                                ₹ {a.auctionPrice}
                              </div>
                            </div>
                          </div>

                          {isAdmin && (
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => openEdit(a)}
                                className="text-blue-400 text-sm hover:underline"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleRemove(a.id)}
                                className="text-red-400 text-sm hover:underline"
                              >
                                Remove
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Detailed Assignment Table */}
         <>
            <div className="bg-gray-800 p-4 rounded-xl border border-gray-700 mt-6">
              <h3 className="text-lg font-bold text-yellow-400 mb-3">Assignments</h3>

              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-yellow-300 border-b border-gray-700">
                      <th className="py-2 px-2">Player</th>
                      <th className="py-2 px-2">Team</th>
                      <th className="py-2 px-2">Price</th>
                      <th className="py-2 px-2">Assigned At</th>
                      { isAdmin && <th className="py-2 px-2">Actions</th> }
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAssignments.map((a) => (
                      <tr key={a.id} className="border-b border-gray-700">
                        <td className="py-2 px-2">{a.player?.name}</td>
                        <td className="py-2 px-2">{a.teamName}</td>
                        <td className="py-2 px-2">₹ {a.auctionPrice}</td>
                        <td className="py-2 px-2 text-sm text-gray-400">
                          {a.createdAt?.toDate ? a.createdAt.toDate().toLocaleString() : "-"}
                        </td>
                        { isAdmin && <td className="py-2 px-2 space-x-2">
                          <button onClick={() => openEdit(a)} className="text-blue-400 hover:underline text-sm">Edit</button>
                          <button onClick={() => handleRemove(a.id)} className="text-red-400 hover:underline text-sm">Remove</button>
                        </td> }
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
        </>
        

        {/* Edit Modal (simple inline) */}
        {editingAssignment && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 rounded-xl p-6 w-full max-w-md border border-gray-700">
              <h4 className="text-xl font-bold text-yellow-300 mb-2">Edit Auction Price</h4>
              <div className="text-sm text-gray-300 mb-4">
                Player: <span className="font-medium">{getPlayer(editingAssignment.playerId).name}</span>
                <br />
                Team: <span className="font-medium">{editingAssignment.teamName}</span>
              </div>

              <input
                type="number"
                min="0"
                className="w-full bg-gray-700 px-3 py-2 rounded-md mb-3"
                value={editingPrice}
                onChange={(e) => setEditingPrice(e.target.value)}
              />

              {error && <p className="text-red-400 mb-2">{error}</p>}

              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => { setEditingAssignment(null); setEditingPrice(""); setError(""); }}
                  className="px-3 py-1 rounded-md bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  onClick={saveEdit}
                  className="px-3 py-1 rounded-md bg-yellow-500 text-black font-semibold hover:bg-yellow-400"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
