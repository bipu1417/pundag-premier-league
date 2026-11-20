import React, { Suspense, lazy } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Header from "./components/Header";
import Footer from "./components/Footer";
import Home from "./pages/Home";
import ProtectedRoute from "./components/security/ProtectedRoute";
import AdminRoute from "./components/security/AdminRoute";
import SubscriptionRoute from "./components/security/SubscriptionRoute";
import { useAuth } from "./context/AuthContext";
import Seo from "./seo/Seo";
import MarketingContent from "./seo/MarketingContent";
import seoPages from "./seo/pages.json";

const Registration = lazy(() => import("./pages/Registration"));
const AdminLogin = lazy(() => import("./pages/AdminLogin"));
const PlayerDetails = lazy(() => import("./components/PlayerDetails"));
const TeamReveal = lazy(() => import("./components/TeamReveal"));
const PendingApproval = lazy(() => import("./components/PendingApproval"));
const PaymentPage = lazy(() => import("./components/PaymentPage"));
const PendingPlayerDetails = lazy(() => import("./pages/PendingPlayerDetails"));
const AboutPpl = lazy(() => import("./pages/AboutPpl").then((module) => ({ default: module.AboutPpl })));
const RegisteredPlayers = lazy(() => import("./pages/RegisteredPlayers"));
const TeamManager = lazy(() => import("./pages/TeamManager"));
const AuctionManagerFull = lazy(() => import("./pages/AuctionManagerFull"));
const Signup = lazy(() => import("./pages/Signup"));
const Login = lazy(() => import("./pages/Login").then((module) => ({ default: module.Login })));
const TournamentGlimpses = lazy(() => import("./components/TournamentGlimpses"));
const Profile = lazy(() => import("./pages/Profile"));
const Subscription = lazy(() => import("./pages/Subscription"));
const SubscriptionApprovals = lazy(() => import("./pages/SubscriptionApprovals"));
const TeamsDirectory = lazy(() => import("./pages/TeamsDirectory"));
const TournamentDirectory = lazy(() => import("./pages/TournamentDirectory"));
const TournamentManager = lazy(() => import("./pages/TournamentManager"));
const TournamentFixtures = lazy(() => import("./pages/TournamentFixtures"));
const LiveAuctionDashboard = lazy(() => import("./pages/LiveAuctionDashboard"));

function App() {
  const { effectiveRole } = useAuth();
  const isAdmin = effectiveRole === "admin";

  return (
    <Router>
      <Seo />
      <div className="app-shell flex min-h-screen flex-col text-white">
        <Header isAdmin={isAdmin} />

        <main className="min-w-0 flex-grow overflow-x-hidden px-3 py-5 sm:px-4 sm:py-7 md:px-6 lg:px-8">
          <Suspense fallback={<div className="surface mx-auto max-w-md rounded-2xl p-8 text-center text-gray-200"><span className="mx-auto mb-4 block h-8 w-8 animate-spin rounded-full border-2 border-yellow-300/25 border-t-yellow-300" />Loading workspace...</div>}>
          <Routes>
            <Route path="/" element={<Home />} />
            {Object.keys(seoPages).filter((path) => path !== "/").map((path) => (
              <Route key={path} path={path} element={<MarketingContent path={path} />} />
            ))}
            <Route path="/signup" element={<Signup />} />
            <Route path="/login" element={<Login />} />
            <Route path="/profile" element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            } />
            <Route path="/subscription" element={
              <ProtectedRoute>
                <Subscription />
              </ProtectedRoute>
            } />
            <Route path="/subscription-approvals" element={
              <ProtectedRoute>
                <SubscriptionApprovals />
              </ProtectedRoute>
            } />
            <Route path="/tournaments" element={<TournamentDirectory />} />
            <Route path="/manage-tournaments" element={
              <SubscriptionRoute>
                <TournamentManager />
              </SubscriptionRoute>
            } />
            <Route path="/registration" element={<Registration isAdmin={isAdmin} />} />
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
                <AdminLogin />
              </ProtectedRoute>} />
            <Route path="/player/:id" element={
              <ProtectedRoute>
                <PlayerDetails />
              </ProtectedRoute>} />
            <Route path="/registered-players" element={
              <ProtectedRoute>
                <RegisteredPlayers />
              </ProtectedRoute>} />
            <Route path="/teams" element={
              <ProtectedRoute>
                <TeamsDirectory />
              </ProtectedRoute>} />
            <Route path="/fixtures" element={
              <ProtectedRoute>
                <TournamentFixtures />
              </ProtectedRoute>} />

              <Route path="/glimpse" element={
              <ProtectedRoute>
                <TournamentGlimpses />
              </ProtectedRoute>} />
            
              <Route path="/create-team" element={
                <SubscriptionRoute>
                  <TeamManager />
                </SubscriptionRoute>} />
            
            <Route path="/auction" element={
              <ProtectedRoute>
                <AuctionManagerFull />
              </ProtectedRoute>} />
            <Route path="/live-auction" element={
              <ProtectedRoute>
                <LiveAuctionDashboard />
              </ProtectedRoute>} />
          </Routes>
          </Suspense>
        </main>

        <Footer />
      </div>
    </Router>
  );
}

export default App;
