import React, { useState } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
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

function App() {
  const [isAdmin, setIsAdmin] = useState(false);

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
            <Route path="/registration" element={<Registration isAdmin={isAdmin} />} />
            <Route path="/team-reveal" element={<TeamReveal />} />
            <Route path="/pending-approval" element={<PendingApproval />} />
            <Route path="/payment" element={<PaymentPage />} />
            <Route path="/about" element={<AboutPpl />} />
            <Route path="/pending-player/:id" element={<PendingPlayerDetails />} />
            <Route path="/admin-login" element={<AdminLogin setIsAdmin={setIsAdmin} />} />
            <Route path="/player/:id" element={<PlayerDetails />} />
          </Routes>
        </main>

        {/* Footer fixed at bottom */}
        <Footer />
      </div>
    </Router>
  );
}

export default App;
