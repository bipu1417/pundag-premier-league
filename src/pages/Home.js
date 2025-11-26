// import React from "react";
// import { Link } from "react-router-dom";
// import TeamReveal from "../components/TeamReveal";
// import { AboutPpl } from "./AboutPpl";

// export default function Home() {
//   const currentYear = new Date().getFullYear();

//   // Registration period (Nov 15–25, 2025)
//   const today = new Date();
//   const startDate = new Date(2025, 10, 15); // Month is 0-indexed (10 = November)
//   const endDate = new Date(2025, 10, 26, 23, 59, 59);
//   const isRegistrationOpen = today >= startDate && today <= endDate;

//   return (
//     <div
//       className="relative flex flex-col items-center justify-center min-h-[80vh] px-4 sm:px-6 md:px-10 text-center text-yellow-400"
//       style={{
//         backgroundImage: "url('/assets/ppl.jpg')",
//         backgroundSize: "cover",
//         backgroundPosition: "center",
//         backgroundRepeat: "no-repeat",
//       }}
//     >
//       {/* Tournament Dates Card */}
//       <div
//         className="absolute top-4 left-4 bg-yellow-400 text-black font-bold 
//         rounded-xl px-4 py-2 shadow-[0_4px_10px_rgba(0,0,0,0.4)] 
//         transform rotate-[-5deg] border-4 border-yellow-200
//         sm:text-sm md:text-base text-xs"
//         style={{
//           boxShadow: "0 4px 12px rgba(0,0,0,0.5)",
//           fontFamily: "'Courier New', monospace",
//         }}
//       >
//         <div className="flex flex-col items-center">
//           <span className="uppercase tracking-widest text-[10px] sm:text-xs">
//             Tournament Dates
//           </span>
//           <span className="text-sm sm:text-base md:text-lg font-extrabold">
//             19–21 Dec 2025
//           </span>
//         </div>
//       </div>

//       {/* Prize Card */}
//       <div
//         className="absolute top-4 right-4 bg-yellow-400 text-black font-bold 
//         rounded-xl px-4 py-2 shadow-[0_4px_10px_rgba(0,0,0,0.4)] 
//         transform rotate-[5deg] border-4 border-yellow-200
//         sm:text-sm md:text-base text-xs"
//         style={{
//           boxShadow: "0 4px 12px rgba(0,0,0,0.5)",
//           fontFamily: "'Courier New', monospace",
//         }}
//       >
//         <div className="flex flex-col items-center">
//           <span className="uppercase tracking-widest text-[10px] sm:text-xs">
//             Prizes Worth
//           </span>
//           <span className="text-sm sm:text-base md:text-lg font-extrabold">
//             Rs. 53,000/-
//           </span>
//         </div>
//       </div>

//       {/* Title */}
//       <h1
//         className="text-3xl sm:text-4xl md:text-5xl font-extrabold mt-64 mb-6 
//         drop-shadow-[0_4px_8px_rgba(0,0,0,0.7)]"
//       >
//         Welcome to Pundag Premier League 🏏
//       </h1>

//       {/* Description */}
//       <p
//         className="text-base sm:text-lg md:text-xl text-yellow-100 max-w-xl 
//         bg-black bg-opacity-40 p-4 rounded-2xl shadow-lg"
//       >
//         Register your name for the upcoming season anytime between{" "}
//         <span className="font-semibold text-yellow-300">
//           15th - 26th November {currentYear}
//         </span>.
//       </p>

//       {/* Registration Button */}
//       <br />
//       <br />

//       {isRegistrationOpen ? (
//         <Link
//           to="/registration"
//           className="relative inline-block text-black font-extrabold py-3 px-8 rounded-2xl 
//           bg-gradient-to-r from-yellow-300 via-orange-400 to-red-500 
//           bg-[length:200%_200%] animate-gradientMove 
//           shadow-[0_0_15px_rgba(255,215,0,0.6)] 
//           transition-all duration-300 hover:scale-110 hover:shadow-[0_0_25px_rgba(255,200,0,0.9)]"
//         >
//           Register Now
//         </Link>
//       ) : (
//         <button
//           disabled
//           className="relative inline-block text-gray-400 font-extrabold py-3 px-8 rounded-2xl 
//           bg-gradient-to-r from-gray-500 via-gray-600 to-gray-700 
//           opacity-60 cursor-not-allowed"
//         >
//           Registration Opening Soon
//         </button>
//       )}

//       <div className="mt-[25rem]">
//         <AboutPpl />
//       </div>

//     </div>
//   );
// }


import React, { useMemo, useEffect, useState } from "react";
import { Link } from "react-router-dom";
// import TeamReveal from "../components/TeamReveal";
import { AboutPpl } from "./AboutPpl";

export default function Home() {
  const currentYear = new Date().getFullYear();

  // Registration period (Nov 15–26, 2025)
  const today = new Date();
  // const startDate = new Date(2025, 10, 15); // Month is 0-indexed (10 = November)
  // const endDate = new Date(2025, 10, 26, 23, 59, 59);
  const startDate = React.useMemo(() => new Date(2025, 10, 15), []);
const endDate = React.useMemo(() => new Date(2025, 10, 26, 23, 59, 59), []);
  const isRegistrationOpen = today >= startDate && today <= endDate;
  const isRegistrationClosed = today > endDate;

  // formatted last day string e.g. "26 November 2025"
  const formattedEndDate = useMemo(() => {
    return new Intl.DateTimeFormat("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(endDate);
  }, [endDate]);

  // Optional: simple countdown (days/hours) while registration is open
  const [countdown, setCountdown] = useState("");
  useEffect(() => {
    if (!isRegistrationOpen) return;

    const update = () => {
      const now = new Date().getTime();
      const distance = endDate.getTime() - now;

      if (distance <= 0) {
        setCountdown("Less than an hour left");
        return;
      }

      const days = Math.floor(distance / (1000 * 60 * 60 * 24));
      const hours = Math.floor((distance / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((distance / (1000 * 60)) % 60);

      const parts = [];
      if (days) parts.push(`${days}d`);
      if (hours) parts.push(`${hours}h`);
      if (minutes) parts.push(`${minutes}m`);

      setCountdown(parts.join(" "));
    };

    update();
    const t = setInterval(update, 60 * 1000); // update every minute
    return () => clearInterval(t);
  }, [endDate, isRegistrationOpen]);

  return (
    <div
      className="relative flex flex-col items-center justify-center min-h-[80vh] px-4 sm:px-6 md:px-10 text-center text-yellow-400"
      style={{
        backgroundImage: "url('/assets/ppl.jpg')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      {/* Tournament Dates Card */}
      <div
        className="absolute top-4 left-4 bg-yellow-400 text-black font-bold 
        rounded-xl px-4 py-2 shadow-[0_4px_10px_rgba(0,0,0,0.4)] 
        transform rotate-[-5deg] border-4 border-yellow-200
        sm:text-sm md:text-base text-xs"
        style={{
          boxShadow: "0 4px 12px rgba(0,0,0,0.5)",
          fontFamily: "'Courier New', monospace",
        }}
      >
        <div className="flex flex-col items-center">
          <span className="uppercase tracking-widest text-[10px] sm:text-xs">
            Tournament Dates
          </span>
          <span className="text-sm sm:text-base md:text-lg font-extrabold">
            19–21 Dec 2025
          </span>
        </div>
      </div>

      {/* Prize Card */}
      <div
        className="absolute top-4 right-4 bg-yellow-400 text-black font-bold 
        rounded-xl px-4 py-2 shadow-[0_4px_10px_rgba(0,0,0,0.4)] 
        transform rotate-[5deg] border-4 border-yellow-200
        sm:text-sm md:text-base text-xs"
        style={{
          boxShadow: "0 4px 12px rgba(0,0,0,0.5)",
          fontFamily: "'Courier New', monospace",
        }}
      >
        <div className="flex flex-col items-center">
          <span className="uppercase tracking-widest text-[10px] sm:text-xs">
            Prizes Worth
          </span>
          <span className="text-sm sm:text-base md:text-lg font-extrabold">
            Rs. 53,000/-
          </span>
        </div>
      </div>

      {/* Title */}
      <h1
        className="text-3xl sm:text-4xl md:text-5xl font-extrabold mt-64 mb-6 
        drop-shadow-[0_4px_8px_rgba(0,0,0,0.7)]"
      >
        Welcome to Pundag Premier League 🏏
      </h1>

      {/* Description */}
      <p
        className="text-base sm:text-lg md:text-xl text-yellow-100 max-w-xl 
        bg-black bg-opacity-40 p-4 rounded-2xl shadow-lg"
      >
        Register your name for the upcoming season anytime between{" "}
        <span className="font-semibold text-yellow-300">
          15th - 26th November {currentYear}
        </span>
        .
      </p>

      {/* Last day + status */}
      <div className="mt-4 flex flex-col items-center gap-2">
        <div className="inline-flex items-center gap-3 bg-black bg-opacity-50 px-4 py-2 rounded-full border border-yellow-300">
          <span className="text-sm sm:text-base">
            <strong>Last day to register:</strong>{" "}
            <span className="text-yellow-300">{formattedEndDate}</span>
          </span>

          {isRegistrationOpen ? (
            <span className="ml-2 inline-block px-2 py-0.5 text-xs rounded-full bg-green-500 text-black font-semibold">
              OPEN ({countdown || "ending soon"})
            </span>
          ) : isRegistrationClosed ? (
            <span className="ml-2 inline-block px-2 py-0.5 text-xs rounded-full bg-red-600 text-white font-semibold">
              CLOSED
            </span>
          ) : (
            <span className="ml-2 inline-block px-2 py-0.5 text-xs rounded-full bg-gray-600 text-white font-semibold">
              OPENS {startDate.toLocaleDateString()}
            </span>
          )}
        </div>
        {/* Small helper text */}
        <p className="text-xs text-yellow-200/80 mt-1">
          Registration closes at 23:59 on the last day.
        </p>
      </div>

      {/* Registration Button */}
      <br />
      <br />

      {isRegistrationOpen ? (
        <Link
          to="/registration"
          className="relative inline-block text-black font-extrabold py-3 px-8 rounded-2xl 
          bg-gradient-to-r from-yellow-300 via-orange-400 to-red-500 
          bg-[length:200%_200%] animate-gradientMove 
          shadow-[0_0_15px_rgba(255,215,0,0.6)] 
          transition-all duration-300 hover:scale-110 hover:shadow-[0_0_25px_rgba(255,200,0,0.9)]"
        >
          Register Now
        </Link>
      ) : (
        <button
          disabled
          className="relative inline-block text-gray-400 font-extrabold py-3 px-8 rounded-2xl 
          bg-gradient-to-r from-gray-500 via-gray-600 to-gray-700 
          opacity-60 cursor-not-allowed"
        >
          Registration Opening Soon
        </button>
      )}

      <div className="mt-[25rem]">
        <AboutPpl />
      </div>
    </div>
  );
}
