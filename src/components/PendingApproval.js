// import React, { useEffect, useState } from "react";
// import {
//   db,
//   collection,
//   addDoc,
//   deleteDoc,
//   doc,
// } from "../firebase";
// import { onSnapshot } from "firebase/firestore";

// export default function PendingApproval() {
//   const [pendingPlayers, setPendingPlayers] = useState([]);
//   const [loading, setLoading] = useState(true);

//   // Real-time listener for pending players
//   useEffect(() => {
//     const unsubscribe = onSnapshot(collection(db, "pendingPlayers"), (snapshot) => {
//       const data = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
//       setPendingPlayers(data);
//       setLoading(false);
//     });

//     return () => unsubscribe();
//   }, []);

//   // Approve player
//   const handleApprove = async (player) => {
//     try {
//       await addDoc(collection(db, "players"), {
//         ...player,
//         approved: true,
//         approvedAt: new Date().toISOString(),
//       });
//       await deleteDoc(doc(db, "pendingPlayers", player.id));
//       alert(`✅ ${player.name} approved and moved to Players.`);
//     } catch (err) {
//       console.error("Error approving player:", err);
//       alert("❌ Something went wrong while approving.");
//     }
//   };

//   // Reject player
//   const handleReject = async (id, name) => {
//     if (window.confirm(`Reject ${name}?`)) {
//       try {
//         await deleteDoc(doc(db, "pendingPlayers", id));
//         alert(`❌ ${name} has been rejected.`);
//       } catch (err) {
//         console.error("Error rejecting player:", err);
//         alert("❌ Something went wrong while rejecting.");
//       }
//     }
//   };

//   return (
//     <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center py-10 px-3 sm:px-6">
//       <h1 className="text-3xl sm:text-4xl font-bold text-yellow-400 mb-8 border-b border-yellow-500 pb-3 text-center">
//         Pending Player Approvals
//       </h1>

//       {loading ? (
//         <p className="text-gray-400">Loading players...</p>
//       ) : pendingPlayers.length === 0 ? (
//         <p className="text-gray-400">No pending approvals right now.</p>
//       ) : (
//         <>
//           {/* Mobile View (Cards) */}
//           <div className="sm:hidden w-full flex flex-col gap-4">
//             {pendingPlayers.map((player) => (
//               <div
//                 key={player.id}
//                 className="bg-gray-800 rounded-xl p-4 border border-gray-700 shadow-md"
//               >
//                 <div className="flex items-center gap-4">
//                   {player.photo ? (
//                     <img
//                       src={player.photo}
//                       alt={player.name}
//                       className="w-16 h-16 rounded-full border-2 border-yellow-400 object-cover"
//                     />
//                   ) : (
//                     <div className="w-16 h-16 rounded-full bg-gray-600 flex items-center justify-center text-yellow-300 font-bold text-lg">
//                       {player.name[0]}
//                     </div>
//                   )}
//                   <div>
//                     <p className="text-lg font-semibold text-yellow-400">
//                       {player.name}
//                     </p>
//                     <p className="text-sm text-gray-400">
//                       {player.playerType} • Age {player.age}
//                     </p>
//                     <p className="text-sm text-gray-400">
//                       📞 {player.mnumber} • 🪪 {player.aadhaar}
//                     </p>
//                   </div>
//                 </div>

//                 <div className="flex justify-end gap-2 mt-4">
//                   <button
//                     onClick={() => handleApprove(player)}
//                     className="bg-green-500 hover:bg-green-400 text-black font-semibold px-4 py-1.5 rounded-md"
//                   >
//                     Approve
//                   </button>
//                   <button
//                     onClick={() => handleReject(player.id, player.name)}
//                     className="bg-red-500 hover:bg-red-400 text-black font-semibold px-4 py-1.5 rounded-md"
//                   >
//                     Reject
//                   </button>
//                 </div>
//               </div>
//             ))}
//           </div>

//           {/* Desktop / Tablet View (Table) */}
//           <div className="hidden sm:block overflow-x-auto w-full max-w-6xl rounded-lg border border-gray-700 shadow-lg">
//             <table className="min-w-full text-sm sm:text-base">
//               <thead className="bg-gray-800 text-yellow-400">
//                 <tr>
//                   {[
//                     "Name",
//                     "Age",
//                     "Type",
//                     "Mobile",
//                     "Aadhaar",
//                     "Photo",
//                     "Actions",
//                   ].map((head) => (
//                     <th
//                       key={head}
//                       className="px-4 py-3 text-left whitespace-nowrap"
//                     >
//                       {head}
//                     </th>
//                   ))}
//                 </tr>
//               </thead>
//               <tbody>
//                 {pendingPlayers.map((player) => (
//                   <tr
//                     key={player.id}
//                     className="border-t border-gray-700 hover:bg-gray-800 transition-colors duration-200"
//                   >
//                     <td className="px-4 py-3">{player.name}</td>
//                     <td className="px-4 py-3">{player.age}</td>
//                     <td className="px-4 py-3">{player.playerType}</td>
//                     <td className="px-4 py-3">{player.mnumber}</td>
//                     <td className="px-4 py-3">{player.aadhaar}</td>
//                     <td className="px-4 py-3">
//                       {player.photo ? (
//                         <img
//                           src={player.photo}
//                           alt={player.name}
//                           className="w-10 h-10 sm:w-12 sm:h-12 rounded-full border border-yellow-400 object-cover"
//                         />
//                       ) : (
//                         "N/A"
//                       )}
//                     </td>
//                     <td className="px-4 py-3 flex gap-2">
//                       <button
//                         onClick={() => handleApprove(player)}
//                         className="bg-green-500 hover:bg-green-400 text-black font-semibold px-3 py-1 rounded-md"
//                       >
//                         Approve
//                       </button>
//                       <button
//                         onClick={() => handleReject(player.id, player.name)}
//                         className="bg-red-500 hover:bg-red-400 text-black font-semibold px-3 py-1 rounded-md"
//                       >
//                         Reject
//                       </button>
//                     </td>
//                   </tr>
//                 ))}
//               </tbody>
//             </table>
//           </div>
//         </>
//       )}
//     </div>
//   );
// }

import React, { useEffect, useState } from "react";
import {
  db,
  collection,
  addDoc,
  deleteDoc,
  doc,
} from "../firebase";
import { onSnapshot } from "firebase/firestore";
import { useNavigate } from "react-router-dom";

export default function PendingApproval() {
  const [pendingPlayers, setPendingPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Real-time listener for pending players
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "pendingPlayers"), (snapshot) => {
      const data = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      setPendingPlayers(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Approve player
  const handleApprove = async (player) => {
    try {
      await addDoc(collection(db, "players"), {
        ...player,
        approved: true,
        approvedAt: new Date().toISOString(),
      });
      await deleteDoc(doc(db, "pendingPlayers", player.id));
      alert(`✅ ${player.name} approved and moved to Players.`);
    } catch (err) {
      console.error("Error approving player:", err);
      alert("❌ Something went wrong while approving.");
    }
  };

  // Reject player
  const handleReject = async (id, name) => {
    if (window.confirm(`Reject ${name}?`)) {
      try {
        await deleteDoc(doc(db, "pendingPlayers", id));
        alert(`❌ ${name} has been rejected.`);
      } catch (err) {
        console.error("Error rejecting player:", err);
        alert("❌ Something went wrong while rejecting.");
      }
    }
  };

  // Navigate to Pending Player Details Page
  const openDetails = (player) => {
    navigate(`/pending-player/${player.id}`);
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center py-10 px-3 sm:px-6">
      <h1 className="text-3xl sm:text-4xl font-bold text-yellow-400 mb-8 border-b border-yellow-500 pb-3 text-center">
        Pending Player Approvals
      </h1>

      {loading ? (
        <p className="text-gray-400">Loading players...</p>
      ) : pendingPlayers.length === 0 ? (
        <p className="text-gray-400">No pending approvals right now.</p>
      ) : (
        <>
          {/* ------------------ MOBILE VIEW ------------------ */}
          <div className="sm:hidden w-full flex flex-col gap-4">
            {pendingPlayers.map((player) => (
              <div
                key={player.id}
                onClick={() => openDetails(player)}
                className="bg-gray-800 rounded-xl p-4 border border-gray-700 shadow-md cursor-pointer"
              >
                <div className="flex items-center gap-4">
                  {player.photo ? (
                    <img
                      src={player.photo}
                      alt={player.name}
                      className="w-16 h-16 rounded-full border-2 border-yellow-400 object-cover"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-gray-600 flex items-center justify-center text-yellow-300 font-bold text-lg">
                      {player.name[0]}
                    </div>
                  )}

                  <div>
                    <p className="text-lg font-semibold text-yellow-400">
                      {player.name}
                    </p>
                    <p className="text-sm text-gray-400">
                      {player.playerType} • Age {player.age}
                    </p>
                    <p className="text-sm text-gray-400">
                      📞 {player.mnumber} • 🪪 {player.aadhaar}
                    </p>
                    <p className="text-sm text-gray-400">
                      🧾 UPI Ref: {player.upiRef || "N/A"}
                    </p>
                  </div>
                </div>

                {/* Payment Screenshot */}
                {player.paymentScreenshot && (
                  <img
                    src={player.paymentScreenshot}
                    alt="Payment Screenshot"
                    className="w-full h-40 object-contain rounded-lg mt-3 border border-gray-700"
                  />
                )}

                <div className="flex justify-end gap-2 mt-4">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleApprove(player);
                    }}
                    className="bg-green-500 hover:bg-green-400 text-black font-semibold px-4 py-1.5 rounded-md"
                  >
                    Approve
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleReject(player.id, player.name);
                    }}
                    className="bg-red-500 hover:bg-red-400 text-black font-semibold px-4 py-1.5 rounded-md"
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* ------------------ DESKTOP VIEW TABLE ------------------ */}
          <div className="hidden sm:block overflow-x-auto w-full max-w-7xl rounded-lg border border-gray-700 shadow-lg">
            <table className="min-w-full text-sm sm:text-base">
              <thead className="bg-gray-800 text-yellow-400">
                <tr>
                  {[
                    "Name",
                    "Age",
                    "Type",
                    "Mobile",
                    "Aadhaar",
                    "UPI Ref",
                    "Payment SS",
                    "Photo",
                    "Actions",
                  ].map((head) => (
                    <th key={head} className="px-4 py-3 text-left whitespace-nowrap">
                      {head}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {pendingPlayers.map((player) => (
                  <tr
                    key={player.id}
                    onClick={() => openDetails(player)}
                    className="border-t border-gray-700 hover:bg-gray-800 transition cursor-pointer"
                  >
                    <td className="px-4 py-3">{player.name}</td>
                    <td className="px-4 py-3">{player.age}</td>
                    <td className="px-4 py-3">{player.playerType}</td>
                    <td className="px-4 py-3">{player.mnumber}</td>
                    <td className="px-4 py-3">{player.aadhaar}</td>
                    <td className="px-4 py-3">{player.upiRefNo || "N/A"}</td>

                    {/* Payment Screenshot thumbnail */}
                    <td className="px-4 py-3">
                      {player.paymentScreenshot ? (
                        <img
                          src={player.paymentScreenshot}
                          alt="Payment SS"
                          className="w-12 h-12 rounded-lg border border-gray-600 object-cover"
                          onClick={(e) => {
                            e.stopPropagation();
                            window.open(player.paymentScreenshot, "_blank");
                          }}
                        />
                      ) : (
                        "N/A"
                      )}
                    </td>

                    <td className="px-4 py-3">
                      {player.photo ? (
                        <img
                          src={player.photo}
                          alt={player.name}
                          className="w-12 h-12 rounded-full border border-yellow-400 object-cover"
                        />
                      ) : (
                        "N/A"
                      )}
                    </td>

                    <td className="px-4 py-3 flex gap-2" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => handleApprove(player)}
                        className="bg-green-500 hover:bg-green-400 text-black font-semibold px-3 py-1 rounded-md"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleReject(player.id, player.name)}
                        className="bg-red-500 hover:bg-red-400 text-black font-semibold px-3 py-1 rounded-md"
                      >
                        Reject
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>

            </table>
          </div>
        </>
      )}
    </div>
  );
}

