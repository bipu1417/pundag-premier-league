import React, { useEffect, useState } from "react";
import { db, collection, getDocs } from "../firebase";
import { useParams } from "react-router-dom";

export default function PlayerDetails() {
  const { id } = useParams();
  const [player, setPlayer] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      const snapshot = await getDocs(collection(db, "players"));
      const found = snapshot.docs.find((doc) => doc.id === id);
      if (found) setPlayer(found.data());
    };
    fetchData();
  }, [id]);

  if (!player) return <p className="text-center text-gray-300 mt-10">Loading player details...</p>;

  return (
    <div className="text-center max-w-lg mx-auto mt-10 p-6 bg-gray-900 text-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold text-yellow-400 mb-4">{player.name}</h2>
      <img src={player.photo} alt="player" className="w-40 h-40 rounded-full mx-auto mb-4" />
      <p><strong>Age:</strong> {player.age}</p>
      <p><strong>Type:</strong> {player.playerType}</p>
      <p><strong>Mobile:</strong> {player.mnumber}</p>
      <p><strong>Aadhaar:</strong> {player.aadhaar}</p>
      <p><strong>Address:</strong> {player.address}</p>
    </div>
  );
}
