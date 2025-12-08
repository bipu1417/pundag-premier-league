// import React, { useEffect, useState } from "react";
// import {
//   db,
//   collection,
//   addDoc,
//   getDocs,
//   deleteDoc,
//   doc,
//   updateDoc,
// } from "../firebase";

// export default function TeamManager() {
//   const [teams, setTeams] = useState([]);
//   const [ownerName, setOwnerName] = useState("");
//   const [teamName, setTeamName] = useState("");
//   const [phone, setPhone] = useState("");
//   const [teamPurse, setTeamPurse] = useState(""); // NEW
//   const [logoBase64, setLogoBase64] = useState("");
//   const [editingTeam, setEditingTeam] = useState(null);
//   const [error, setError] = useState("");

//   const fetchTeams = async () => {
//     const ref = collection(db, "teamdetails");
//     const snap = await getDocs(ref);
//     const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
//     setTeams(list);
//   };

//   useEffect(() => {
//     fetchTeams();
//   }, []);

//   // 🔥 Convert uploaded logo to base64
//   const handleLogoUpload = (e) => {
//     const file = e.target.files[0];
//     if (!file) return;

//     const reader = new FileReader();
//     reader.onloadend = () => setLogoBase64(reader.result);
//     reader.readAsDataURL(file);
//   };

//   // 🔥 Unique team name check
//   const isTeamNameExists = (name) =>
//     teams.some(
//       (team) =>
//         team.teamName.toLowerCase() === name.toLowerCase() &&
//         team.id !== (editingTeam?.id || "")
//     );

//   // 🔥 Generate Unique Team ID
//   const generateTeamId = () => {
//     const timestamp = Date.now().toString().slice(-6);
//     return "TEAM-" + new Date().getFullYear() + timestamp;
//   };

//   // 🔥 Add or Update Team
//   const handleSubmit = async () => {
//     if (!ownerName || !teamName || !phone || !teamPurse) {
//       setError("All fields are required");
//       return;
//     }

//     if (isTeamNameExists(teamName)) {
//       setError("Team name already exists");
//       return;
//     }

//     setError("");

//     if (editingTeam) {
//       // UPDATE
//       const ref = doc(db, "teamdetails", editingTeam.id);
//       await updateDoc(ref, {
//         ownerName,
//         teamName,
//         phone,
//         teamPurse: Number(teamPurse),
//         logoBase64,
//       });
//     } else {
//       // CREATE NEW TEAM
//       const ref = collection(db, "teamdetails");
//       await addDoc(ref, {
//         ownerName,
//         teamName,
//         phone,
//         teamPurse: Number(teamPurse),
//         logoBase64,
//         teamUniqueId: generateTeamId(), // NEW
//       });
//     }

//     resetForm();
//     fetchTeams();
//   };

//   const resetForm = () => {
//     setOwnerName("");
//     setTeamName("");
//     setPhone("");
//     setTeamPurse("");
//     setLogoBase64("");
//     setEditingTeam(null);
//     setError("");
//   };

//   const handleDelete = async (id) => {
//     await deleteDoc(doc(db, "teamdetails", id));
//     fetchTeams();
//   };

//   const handleEdit = (team) => {
//     setEditingTeam(team);
//     setOwnerName(team.ownerName);
//     setTeamName(team.teamName);
//     setPhone(team.phone);
//     setTeamPurse(team.teamPurse);
//     setLogoBase64(team.logoBase64);
//   };

//   return (
//     <div className="min-h-screen bg-gray-900 text-white px-4 py-10">
//       <div className="max-w-3xl mx-auto bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-700">
//         <h1 className="text-2xl font-bold text-yellow-400 mb-4">
//           {editingTeam ? "Edit Team" : "Create Team"}
//         </h1>

//         <div className="space-y-3">
//           <input
//             type="text"
//             placeholder="Owner Name"
//             value={ownerName}
//             onChange={(e) => setOwnerName(e.target.value)}
//             className="w-full bg-gray-700 px-3 py-2 rounded-md outline-none"
//           />

//           <input
//             type="text"
//             placeholder="Team Name"
//             value={teamName}
//             onChange={(e) => setTeamName(e.target.value)}
//             className="w-full bg-gray-700 px-3 py-2 rounded-md outline-none"
//           />

//           <input
//             type="text"
//             placeholder="Phone Number"
//             value={phone}
//             onChange={(e) => setPhone(e.target.value)}
//             className="w-full bg-gray-700 px-3 py-2 rounded-md outline-none"
//           />

//           <input
//             type="number"
//             placeholder="Team Purse (₹)"
//             value={teamPurse}
//             onChange={(e) => setTeamPurse(e.target.value)}
//             className="w-full bg-gray-700 px-3 py-2 rounded-md outline-none"
//           />

//           <input
//             type="file"
//             accept="image/*"
//             onChange={handleLogoUpload}
//             className="w-full bg-gray-700 px-3 py-2 rounded-md"
//           />

//           {logoBase64 && (
//             <img
//               src={logoBase64}
//               className="w-24 h-24 mt-3 rounded-md border border-gray-600 object-cover"
//               alt="Team Logo"
//             />
//           )}

//           {error && <p className="text-red-400 text-sm">{error}</p>}

//           <button
//             onClick={handleSubmit}
//             className="w-full bg-yellow-500 hover:bg-yellow-400 text-black font-semibold px-4 py-2 rounded-md"
//           >
//             {editingTeam ? "Update Team" : "Create Team"}
//           </button>

//           {editingTeam && (
//             <button
//               onClick={resetForm}
//               className="w-full bg-gray-600 mt-2 text-white px-4 py-2 rounded-md"
//             >
//               Cancel Edit
//             </button>
//           )}
//         </div>
//       </div>

//       {/* TEAM LIST TABLE */}
//       <div className="max-w-5xl mx-auto mt-10 bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-700">
//         <h2 className="text-xl font-bold text-yellow-400 mb-4">Team List</h2>

//         <table className="w-full text-left">
//           <thead>
//             <tr className="text-yellow-400 border-b border-gray-700">
//               <th className="py-2">Logo</th>
//               <th>Team ID</th>
//               <th>Owner</th>
//               <th>Team Name</th>
//               <th>Phone</th>
//               <th>Purse (₹)</th>
//               <th>Actions</th>
//             </tr>
//           </thead>

//           <tbody>
//             {teams.map((team) => (
//               <tr key={team.id} className="border-b border-gray-700">
//                 <td className="py-3">
//                   {team.logoBase64 ? (
//                     <img
//                       alt="logo"
//                       src={team.logoBase64}
//                       className="w-12 h-12 rounded-md object-cover"
//                     />
//                   ) : (
//                     <div className="w-12 h-12 bg-gray-700 rounded-md flex items-center justify-center">
//                       ❌
//                     </div>
//                   )}
//                 </td>

//                 <td className="text-gray-300">{team.teamUniqueId}</td>

//                 <td>{team.ownerName}</td>
//                 <td>{team.teamName}</td>
//                 <td>{team.phone}</td>
//                 <td className="font-semibold text-green-300">{team.teamPurse}</td>

//                 <td className="space-x-3">
//                   <button
//                     onClick={() => handleEdit(team)}
//                     className="text-blue-400 underline"
//                   >
//                     Edit
//                   </button>

//                   <button
//                     onClick={() => handleDelete(team.id)}
//                     className="text-red-400 underline"
//                   >
//                     Delete
//                   </button>
//                 </td>
//               </tr>
//             ))}
//           </tbody>
//         </table>
//       </div>
//     </div>
//   );
// }

import React, { useEffect, useState } from "react";
import {
  db,
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  updateDoc,
} from "../firebase";

export default function TeamManager() {
  const [teams, setTeams] = useState([]);
  const [ownerName, setOwnerName] = useState("");
  const [teamName, setTeamName] = useState("");
  const [phone, setPhone] = useState("");
  const [teamPurse, setTeamPurse] = useState("");
  const [logoBase64, setLogoBase64] = useState("");
  const [editingTeam, setEditingTeam] = useState(null);
  const [error, setError] = useState("");

  const fetchTeams = async () => {
    const ref = collection(db, "teamdetails");
    const snap = await getDocs(ref);
    const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    setTeams(list);
  };

  useEffect(() => {
    fetchTeams();
  }, []);

  const handleLogoUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => setLogoBase64(reader.result);
    reader.readAsDataURL(file);
  };

  const isTeamNameExists = (name) =>
    teams.some(
      (team) =>
        team.teamName.toLowerCase() === name.toLowerCase() &&
        team.id !== (editingTeam?.id || "")
    );

  const generateTeamId = () => {
    const timestamp = Date.now().toString().slice(-6);
    return "TEAM-" + new Date().getFullYear() + "-" + timestamp;
  };

  const handleSubmit = async () => {
    if (!ownerName || !teamName || !phone || !teamPurse) {
      setError("All fields are required");
      return;
    }

    if (isTeamNameExists(teamName)) {
      setError("Team name already exists");
      return;
    }

    setError("");

    if (editingTeam) {
      const ref = doc(db, "teamdetails", editingTeam.id);
      await updateDoc(ref, {
        ownerName,
        teamName,
        phone,
        teamPurse: Number(teamPurse),
        logoBase64,
      });
    } else {
      const ref = collection(db, "teamdetails");
      await addDoc(ref, {
        ownerName,
        teamName,
        phone,
        teamPurse: Number(teamPurse),
        logoBase64,
        teamUniqueId: generateTeamId(),
      });
    }

    resetForm();
    fetchTeams();
  };

  const resetForm = () => {
    setOwnerName("");
    setTeamName("");
    setPhone("");
    setTeamPurse("");
    setLogoBase64("");
    setEditingTeam(null);
    setError("");
  };

  const handleDelete = async (id) => {
    await deleteDoc(doc(db, "teamdetails", id));
    fetchTeams();
  };

  const handleEdit = (team) => {
    setEditingTeam(team);
    setOwnerName(team.ownerName);
    setTeamName(team.teamName);
    setPhone(team.phone);
    setTeamPurse(team.teamPurse);
    setLogoBase64(team.logoBase64);
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white px-4 py-10">
      {/* FORM */}
      <div className="max-w-3xl mx-auto bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-700">
        <h1 className="text-2xl font-bold text-yellow-400 mb-4">
          {editingTeam ? "Edit Team" : "Create Team"}
        </h1>

        <div className="space-y-3">
          <input
            type="text"
            placeholder="Owner Name"
            value={ownerName}
            onChange={(e) => setOwnerName(e.target.value)}
            className="w-full bg-gray-700 px-3 py-2 rounded-md outline-none"
          />
          <input
            type="text"
            placeholder="Team Name"
            value={teamName}
            onChange={(e) => setTeamName(e.target.value)}
            className="w-full bg-gray-700 px-3 py-2 rounded-md outline-none"
          />
          <input
            type="text"
            placeholder="Phone Number"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full bg-gray-700 px-3 py-2 rounded-md outline-none"
          />
          <input
            type="number"
            placeholder="Team Purse (₹)"
            value={teamPurse}
            onChange={(e) => setTeamPurse(e.target.value)}
            className="w-full bg-gray-700 px-3 py-2 rounded-md outline-none"
          />
          <input
            type="file"
            accept="image/*"
            onChange={handleLogoUpload}
            className="w-full bg-gray-700 px-3 py-2 rounded-md"
          />

          {logoBase64 && (
            <img
              src={logoBase64}
              className="w-24 h-24 mt-3 rounded-md border border-gray-600 object-cover"
              alt="Team Logo"
            />
          )}

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <button
            onClick={handleSubmit}
            className="w-full bg-yellow-500 hover:bg-yellow-400 text-black font-semibold px-4 py-2 rounded-md"
          >
            {editingTeam ? "Update Team" : "Create Team"}
          </button>

          {editingTeam && (
            <button
              onClick={resetForm}
              className="w-full bg-gray-600 mt-2 text-white px-4 py-2 rounded-md"
            >
              Cancel Edit
            </button>
          )}
        </div>
      </div>

      {/* TEAM LIST */}
      <div className="max-w-5xl mx-auto mt-10 bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-700">
        <h2 className="text-xl font-bold text-yellow-400 mb-4">Team List</h2>

        {/* DESKTOP TABLE */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-yellow-400 border-b border-gray-700">
                <th className="py-2">Logo</th>
                <th>Team ID</th>
                <th>Owner</th>
                <th>Team Name</th>
                <th>Phone</th>
                <th>Purse (₹)</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {teams.map((team) => (
                <tr key={team.id} className="border-b border-gray-700">
                  <td className="py-3">
                    {team.logoBase64 ? (
                      <img
                        alt="logo"
                        src={team.logoBase64}
                        className="w-12 h-12 rounded-md object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 bg-gray-700 rounded-md flex items-center justify-center">
                        ❌
                      </div>
                    )}
                  </td>
                  <td className="text-gray-300">{team.teamUniqueId}</td>
                  <td>{team.ownerName}</td>
                  <td>{team.teamName}</td>
                  <td>{team.phone}</td>
                  <td className="font-semibold text-green-300">{team.teamPurse}</td>
                  <td className="space-x-3">
                    <button
                      onClick={() => handleEdit(team)}
                      className="text-blue-400 underline"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(team.id)}
                      className="text-red-400 underline"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* MOBILE CARD VIEW */}
        <div className="md:hidden space-y-4">
          {teams.map((team) => (
            <div
              key={team.id}
              className="bg-gray-700 p-4 rounded-xl shadow-md flex flex-col gap-2"
            >
              <div className="flex items-center gap-3">
                {team.logoBase64 ? (
                  <img
                    src={team.logoBase64}
                    alt="logo"
                    className="w-16 h-16 object-cover rounded-md"
                  />
                ) : (
                  <div className="w-16 h-16 bg-gray-600 rounded-md flex items-center justify-center">
                    ❌
                  </div>
                )}
                <div>
                  <p className="text-yellow-300 font-bold">{team.teamName}</p>
                  <p className="text-xs text-gray-300">{team.teamUniqueId}</p>
                </div>
              </div>

              <p>👤 Owner: {team.ownerName}</p>
              <p>📞 Phone: {team.phone}</p>
              <p className="text-green-300 font-semibold">
                💰 Purse: ₹{team.teamPurse}
              </p>

              <div className="flex gap-4 mt-2">
                <button
                  onClick={() => handleEdit(team)}
                  className="text-blue-400 underline"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(team.id)}
                  className="text-red-400 underline"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
