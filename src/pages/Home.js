import React from "react";
import { Link } from "react-router-dom";
import TeamReveal from "../components/TeamReveal";
import { AboutPpl } from "./AboutPpl";

export default function Home() {
  const currentYear = new Date().getFullYear();

  // Registration period (Nov 15–25, 2025)
  const today = new Date();
  const startDate = new Date(2025, 10, 15); // Month is 0-indexed (10 = November)
  const endDate = new Date(2025, 10, 25, 23, 59, 59);
  const isRegistrationOpen = today >= startDate && today <= endDate;

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
          15th - 25th November {currentYear}
        </span>.
      </p>

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
