import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Menu, X } from "lucide-react";

export default function Header({ isAdmin, setIsAdmin }) {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = () => {
    setIsAdmin(false);
    navigate("/");
  };

  // === Registration Enable Logic ===
  const today = new Date();
  const year = 2025;
  const registrationStart = new Date(`${year}-11-15T00:00:00`);
  const registrationEnd = new Date(`${year}-11-25T23:59:59`);
  const isRegistrationOpen =
    today >= registrationStart && today <= registrationEnd;

  return (
    <header className="relative bg-black text-white sticky top-0 shadow-lg z-50 overflow-hidden">
      {/* Circling Gradient Background Animation */}
      <div className="absolute inset-0 animate-rotateGradient bg-[conic-gradient(from_0deg,rgba(255,215,0,0.5),rgba(255,140,0,0.3),rgba(255,215,0,0.5))]" />
      <div className="absolute inset-[2px] bg-black" /> {/* Inner layer */}

      <div className="relative container mx-auto flex justify-between items-center p-4">
        {/* Logo / Title */}
        <h1
          className="relative text-xl sm:text-2xl font-bold text-yellow-400 
          p-[2px] rounded-xl bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500
          bg-[length:200%_200%] animate-gradientMove"
        >
          <span className="block bg-black px-4 py-1 rounded-lg">
            Pundag Premier League
          </span>
        </h1>

        {/* Desktop Nav */}
        <nav className="hidden md:flex space-x-6 items-center">
          <Link to="/" className="hover:text-yellow-400 transition">
            Home
          </Link>

          <Link to="/team-reveal" className="hover:text-yellow-400 transition">
            Team Reveal
          </Link>

          {/* Registration Menu with Date Restriction */}
          {isRegistrationOpen ? (
            <Link to="/registration" className="hover:text-yellow-400 transition">
              Registration
            </Link>
          ) : (
            <span
              className="cursor-not-allowed text-gray-500"
              title="Registration opens 15–25 Nov 2025"
            >
              Registration
            </span>
          )}

          {isAdmin ? (
            <>
              <Link
                to="/pending-approval"
                className="hover:text-yellow-400 transition"
              >
                Pending Approval
              </Link>
              <button
                onClick={handleLogout}
                className="text-red-400 hover:text-red-500 transition"
              >
                Logout (Admin)
              </button>
            </>
          ) : (
            <Link to="/admin-login" className="hover:text-yellow-400 transition">
              Admin Login
            </Link>
          )}
        </nav>

        {/* Mobile Menu Button */}
        <button
          className="md:hidden text-yellow-400 focus:outline-none z-10"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          {menuOpen ? <X size={26} /> : <Menu size={26} />}
        </button>
      </div>

      {/* Mobile Dropdown Menu */}
      {menuOpen && (
        <nav className="md:hidden bg-black border-t border-gray-700 flex flex-col items-center space-y-4 py-4 relative z-10">
          <Link
            to="/"
            className="hover:text-yellow-400 transition"
            onClick={() => setMenuOpen(false)}
          >
            Home
          </Link>
          <Link
            to="/team-reveal"
            className="hover:text-yellow-400 transition"
            onClick={() => setMenuOpen(false)}
          >
            Team Reveal
          </Link>

          {/* Registration (Mobile) */}
          {isRegistrationOpen ? (
            <Link
              to="/registration"
              className="hover:text-yellow-400 transition"
              onClick={() => setMenuOpen(false)}
            >
              Registration
            </Link>
          ) : (
            <span
              className="text-gray-500 cursor-not-allowed"
              title="Registration opens 15–25 Nov 2025"
            >
              Registration
            </span>
          )}

          {isAdmin ? (
            <>
              <Link
                to="/pending-approval"
                className="hover:text-yellow-400 transition"
                onClick={() => setMenuOpen(false)}
              >
                Pending Approval
              </Link>
              <button
                onClick={() => {
                  handleLogout();
                  setMenuOpen(false);
                }}
                className="text-red-400 hover:text-red-500 transition"
              >
                Logout (Admin)
              </button>
            </>
          ) : (
            <Link
              to="/admin-login"
              className="hover:text-yellow-400 transition"
              onClick={() => setMenuOpen(false)}
            >
              Admin Login
            </Link>
          )}
        </nav>
      )}

      {/* Animations */}
      <style>{`
        @keyframes gradientMove {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }

        .animate-gradientMove {
          animation: gradientMove 4s ease infinite;
        }

        @keyframes rotateGradient {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .animate-rotateGradient {
          animation: rotateGradient 8s linear infinite;
        }
      `}</style>
    </header>
  );
}
