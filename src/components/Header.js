import React, { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Menu, X } from "lucide-react";

export default function Header({ isAdmin, setIsAdmin }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = () => {
    setIsAdmin(false);
    navigate("/");
  };

  // === Registration Logic ===
  const today = new Date();
  const year = 2025;
  const registrationStart = new Date(`${year}-11-15T00:00:00`);
  const registrationEnd = new Date(`${year}-11-26T16:59:59`);
  const isRegistrationOpen =
    today >= registrationStart && today <= registrationEnd;

  // === Helper: Active Link ===
  const isActive = (path) =>
    location.pathname === path
      ? "text-yellow-400 font-semibold border-b-2 border-yellow-400"
      : "hover:text-yellow-400 transition";

  return (
    <header className="relative bg-black text-white top-0 shadow-lg z-50">
      {/* Animated Background */}
      <div className="absolute inset-0 animate-rotateGradient bg-[conic-gradient(from_0deg,rgba(255,215,0,0.4),rgba(255,140,0,0.2),rgba(255,215,0,0.4))]" />
      <div className="absolute inset-[2px] bg-black" />

      <div className="relative container mx-auto flex justify-between items-center p-4">
        {/* Logo */}
        <h1 className="relative text-xl sm:text-2xl font-bold text-yellow-400 
          p-[2px] rounded-xl bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500
          bg-[length:200%_200%] animate-gradientMove">
          <span className="block bg-black px-4 py-1 rounded-lg">
            Pundag Premier League
          </span>
        </h1>

        {/* Desktop Navigation (Glassmorphism) */}
        <nav className="hidden md:flex space-x-6 items-center 
            backdrop-blur-md bg-white/10 border border-white/20 
            px-6 py-3 rounded-2xl shadow-lg">
          
          <Link to="/" className={isActive("/")}>Home</Link>
          <Link to="/auction" className={isActive("/auction")}>Auction</Link>
          <Link to="/registered-players" className={isActive("/registered-players")}>Player List</Link>
          <Link to="/team-reveal" className={isActive("/team-reveal")}>Team Reveal</Link>

          {/* Registration */}
          {isRegistrationOpen ? (
            <Link to="/registration" className={isActive("/registration")}>Registration</Link>
          ) : (
            <span className="text-gray-500 cursor-not-allowed">Registration</span>
          )}

          {/* Admin Menus */}
          {isAdmin && (
            <>
              <Link to="/create-team" className={isActive("/create-team")}>Teams</Link>
              <Link to="/pending-approval" className={isActive("/pending-approval")}>
                Pending Approval
              </Link>
              <button
                onClick={handleLogout}
                className="text-red-400 hover:text-red-500 transition"
              >
                Logout
              </button>
            </>
          )}

          {!isAdmin && (
            <Link className={isActive("/admin-login")} to="/admin-login">
              Admin Login
            </Link>
          )}
        </nav>

        {/* Mobile Menu Toggle */}
        <button
          className="md:hidden text-yellow-400 z-20"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          {menuOpen ? <X size={26} /> : <Menu size={26} />}
        </button>
      </div>

      {/* Mobile Dropdown (Glassmorphism) */}
      {menuOpen && (
        <nav
          className="md:hidden flex flex-col items-center py-6 space-y-4 
          backdrop-blur-xl bg-white/10 border-t border-white/20 relative z-10"
        >
          <Link to="/" onClick={() => setMenuOpen(false)} className={isActive("/")}>Home</Link>
          <Link to="/about" onClick={() => setMenuOpen(false)} className={isActive("/about")}>About</Link>
          <Link to="/auction" onClick={() => setMenuOpen(false)} className={isActive("/auction")}>Auction</Link>
          <Link to="/team-reveal" onClick={() => setMenuOpen(false)} className={isActive("/team-reveal")}>Team Reveal</Link>
          <Link to="/registered-players" onClick={() => setMenuOpen(false)} className={isActive("/registered-players")}>Player List</Link>

          {isRegistrationOpen ? (
            <Link to="/registration" onClick={() => setMenuOpen(false)} className={isActive("/registration")}>
              Registration
            </Link>
          ) : (
            <span className="text-gray-500 cursor-not-allowed">Registration</span>
          )}

          {/* Admin Mobile Menu */}
          {isAdmin && (
            <>
              <Link to="/create-team" onClick={() => setMenuOpen(false)} className={isActive("/create-team")}>
                Teams
              </Link>
              <Link to="/pending-approval" onClick={() => setMenuOpen(false)} className={isActive("/pending-approval")}>
                Pending Approval
              </Link>
              <button
                onClick={() => {
                  handleLogout();
                  setMenuOpen(false);
                }}
                className="text-red-400 hover:text-red-500 transition"
              >
                Logout
              </button>
            </>
          )}

          {!isAdmin && (
            <Link to="/admin-login" onClick={() => setMenuOpen(false)} className={isActive("/admin-login")}>
              Admin Login
            </Link>
          )}
        </nav>
      )}
    </header>
  );
}
