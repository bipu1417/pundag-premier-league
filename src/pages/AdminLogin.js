// import React, { useState } from "react";
// import { useNavigate } from "react-router-dom";

// export default function AdminLogin({ setIsAdmin }) {
//   const [password, setPassword] = useState("");
//   const navigate = useNavigate();

//   const handleLogin = (e) => {
//     e.preventDefault();

//     if (password === "ppL@dmin1417") {
//       setIsAdmin(true);
//       alert("Admin logged in successfully!");
//       navigate("/registration");
//     } else {
//       alert("Incorrect password! Try again.");
//     }
//   };

//   return (
//     <div className="flex flex-col justify-center items-center min-h-screen bg-gray-900 text-white">
//       <div className="bg-gray-800 p-8 rounded-xl shadow-lg w-80">
//         <h2 className="text-2xl font-bold mb-4 text-center text-yellow-400">
//           Admin Login
//         </h2>
//         <form onSubmit={handleLogin}>
//           <label className="block mb-2 text-sm">Password:</label>
//           <input
//             type="password"
//             value={password}
//             onChange={(e) => setPassword(e.target.value)}
//             className="w-full p-2 mb-4 rounded bg-gray-700 focus:outline-none focus:ring-2 focus:ring-yellow-400"
//           />
//           <button
//             type="submit"
//             className="w-full bg-yellow-500 text-black py-2 rounded font-semibold hover:bg-yellow-400 transition"
//           >
//             Login
//           </button>
//         </form>
//       </div>
//     </div>
//   );
// }

import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function AdminLogin({ setIsAdmin }) {
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const handleLogin = (e) => {
    e.preventDefault();
    if (password === "ppl@dmin1417") {
      setIsAdmin(true);
      navigate("/registration");
    } else {
      alert("❌ Wrong Password!");
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] px-4 sm:px-6 md:px-10 text-center">
      <div className="bg-black/60 backdrop-blur-md p-8 rounded-2xl shadow-lg w-80 border border-yellow-400/30">
        <h2 className="text-2xl font-bold text-yellow-400 text-center mb-6">
          Admin Login
        </h2>
        <form onSubmit={handleLogin}>
          <label className="block mb-2">Password:</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full p-2 mb-4 rounded bg-gray-800 border border-gray-700 focus:outline-none focus:ring-2 focus:ring-yellow-400"
          />
          <button
            type="submit"
            className="w-full bg-yellow-500 text-black font-semibold py-2 rounded hover:bg-yellow-400 transition"
          >
            Login
          </button>
        </form>
      </div>
    </div>
  );
}
