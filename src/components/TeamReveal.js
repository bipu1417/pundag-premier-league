import React, { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import teamsData from "../data/teams.json";
import introMusic from "../assets/intro.mp3";

export default function TeamReveal() {
  const [revealedTeams, setRevealedTeams] = useState([]);
  const [index, setIndex] = useState(0);
  const [started, setStarted] = useState(false);
  const audioRef = useRef(null);

  // 🔊 Start Reveal + Music
  const handleStart = () => {
    setStarted(true);

    // Initialize audio
    if (!audioRef.current) {
      audioRef.current = new Audio(introMusic);
      audioRef.current.volume = 0.4;
      audioRef.current.loop = true;
    }

    audioRef.current
      .play()
      .catch((err) => console.warn("Audio playback blocked:", err));
  };

  // 🎬 Reveal logic (runs only after "Start" pressed)
  useEffect(() => {
    if (!started || index >= teamsData.length) return;

    const interval = setInterval(() => {
      setRevealedTeams((prev) => [...prev, teamsData[index]]);
      setIndex((prev) => prev + 1);
    }, 2500);

    return () => clearInterval(interval);
  }, [started, index]);

  // 🧹 Stop audio when leaving or unmounting
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        const audio = audioRef.current;
        const fadeOut = setInterval(() => {
          if (audio.volume > 0.05) {
            audio.volume -= 0.05;
          } else {
            audio.pause();
            audio.currentTime = 0;
            clearInterval(fadeOut);
          }
        }, 100);
      }
    };
  }, []);

  return (
    <div
      className="relative flex flex-col items-center justify-center min-h-[80vh] px-4 sm:px-6 md:px-10 text-center"
      style={{
        backgroundImage: "url('/team-bg.jpg')",
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      {/* Overlay for readability */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/60 to-black/90 z-0"></div>

      {!started ? (
        // 🎯 Start Button
        <div className="z-10 flex flex-col items-center justify-center min-h-[70vh]">
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleStart}
            className="bg-yellow-400 text-black font-bold px-8 py-4 rounded-xl text-xl md:text-2xl shadow-lg hover:bg-yellow-300 transition"
          >
            🔊 Start Team Reveal
          </motion.button>
          <p className="mt-4 text-gray-300 text-sm sm:text-base">
            Click to see the Teams!
          </p>
        </div>
      ) : (
        <>
          {/* Title */}
          <motion.h1
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 1 }}
            className="z-10 mt-10 sm:mt-16 text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold mb-10 sm:mb-12 text-yellow-400 tracking-widest drop-shadow-[0_0_25px_rgba(255,255,0,0.6)] px-4"
          >
            Registered Teams - 2025
          </motion.h1>

          {/* Teams Grid */}
          <div className="z-10 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 sm:gap-8 px-4 sm:px-8 pb-28 w-full max-w-7xl">
            {revealedTeams.map((team, i) => (
              <motion.div
                key={team.id}
                initial={{ scale: 0, opacity: 0, rotateY: 180 }}
                animate={{ scale: 1, opacity: 1, rotateY: 0 }}
                transition={{ duration: 0.8, delay: i * 0.2, type: "spring" }}
                className="flex items-center justify-center text-lg sm:text-xl md:text-2xl lg:text-3xl font-semibold text-white tracking-wide py-6 sm:py-8 px-6 rounded-2xl shadow-[0_0_30px_rgba(255,200,0,0.5)] bg-gradient-to-r from-yellow-500 to-orange-600 hover:scale-105 hover:shadow-[0_0_40px_rgba(255,255,100,0.7)] transition-transform duration-300"
              >
                {team.name}
              </motion.div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
