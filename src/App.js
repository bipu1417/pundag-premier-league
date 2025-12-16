import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import {
  db,
  auth,
  doc,
  getDoc,
} from "./firebase";
import Header from "./components/Header";
import Footer from "./components/Footer";
import Home from "./pages/Home";
import Registration from "./pages/Registration";
import AdminLogin from "./pages/AdminLogin";
import PlayerDetails from "./components/PlayerDetails";
import TeamReveal from "./components/TeamReveal";
import bgImage from "./assets/ppl.jpg";
import PendingApproval from './components/PendingApproval';
import PaymentPage from './components/PaymentPage';
import PendingPlayerDetails from "./pages/PendingPlayerDetails";
import { AboutPpl } from "./pages/AboutPpl";
import RegisteredPlayers from "./pages/RegisteredPlayers";
import TeamManager from "./pages/TeamManager";
import AuctionManagerFull from "./pages/AuctionManagerFull";
import Signup from "./pages/Signup";
import { Login } from "./pages/Login";
import ProtectedRoute from "./components/security/ProtectedRoute";
import AdminRoute from "./components/security/AdminRoute";

function App() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [role, setRole] = useState(localStorage.getItem("role") || "guest");

  useEffect(() => {
    onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setRole("guest");
        localStorage.removeItem("role");
        return;
      }

      // Load role from Firestore
      const snap = await getDoc(doc(db, "users", user.uid));
      if (snap.exists()) {
        const r = snap.data().role;
        setRole(r);
        localStorage.setItem("role", r);
      }
    });
  }, []);

  return (
    <Router>
      <div
        className="flex flex-col min-h-screen bg-cover bg-center bg-no-repeat text-white"
        style={{
          backgroundImage: `url(${bgImage})`,
          backgroundAttachment: "fixed",
        }}
      >
        {/* Header */}
        <Header isAdmin={isAdmin} setIsAdmin={setIsAdmin} />

        {/* Main content area */}
        <main className="flex-grow px-4 md:px-8 py-6 backdrop-blur-sm bg-black/50">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/signup" element={<Signup setRole={setRole} />} />
            <Route path="/login" element={<Login setRole={setRole} />} />
            <Route path="/registration" element={
              <ProtectedRoute>
                <Registration isAdmin={isAdmin} />
              </ProtectedRoute>
            } />
            <Route path="/team-reveal" element={
              <ProtectedRoute>
                <TeamReveal />
              </ProtectedRoute>
            } />
              <Route path="/pending-approval" element={
                <AdminRoute>
                  <PendingApproval />
                </AdminRoute>} />
            
            <Route path="/payment" element={
              <ProtectedRoute>
                <PaymentPage />
              </ProtectedRoute>
            } />
            <Route path="/about" element={<AboutPpl />} />
            
              <Route path="/pending-player/:id" element={
                <AdminRoute>
                  <PendingPlayerDetails />
                </AdminRoute>} />
            
            <Route path="/admin-login" element={
              <ProtectedRoute>
                <AdminLogin setIsAdmin={setIsAdmin} />
              </ProtectedRoute>} />
            <Route path="/player/:id" element={
              <ProtectedRoute>
                <PlayerDetails />
              </ProtectedRoute>} />
            <Route path="/registered-players" element={
              <ProtectedRoute>
                <RegisteredPlayers />
              </ProtectedRoute>} />
            
              <Route path="/create-team" element={
                <AdminRoute>
                  <TeamManager />
                </AdminRoute>} />
            
            <Route path="/auction" element={
              <ProtectedRoute>
                <AuctionManagerFull isAdmin={isAdmin} />
              </ProtectedRoute>} />
          </Routes>
        </main>

        {/* Footer fixed at bottom */}
        <Footer />
      </div>
    </Router>
  );
}

export default App;
