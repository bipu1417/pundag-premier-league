import React, { useState } from "react";
import { auth, googleProvider } from "../firebase"; 
import { signInWithPopup } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { AlertModal } from "../components/ui/AppModal";

const loginErrorMessages = {
  "auth/configuration-not-found": "Google sign-in is not configured for this app. Please contact the app administrator.",
  "auth/operation-not-allowed": "Google sign-in is not enabled for this app. Please contact the app administrator.",
  "auth/unauthorized-domain": "Sign-in is not enabled for this website address. Please contact the app administrator.",
  "auth/popup-blocked": "Your browser blocked the Google sign-in window. Allow pop-ups for this site, then try again.",
  "auth/popup-closed-by-user": "The Google sign-in window closed before sign-in finished. Please try again and keep it open until sign-in completes.",
  "auth/cancelled-popup-request": "Another sign-in attempt interrupted this one. Please close the other sign-in windows and try again.",
  "auth/network-request-failed": "Unable to reach Google sign-in. Check your connection and try again.",
  "auth/account-exists-with-different-credential": "This email already uses another sign-in method. Sign in with the method you originally used.",
};

const GoogleLoginButton = ({ label = "Sign in with Google", redirectTo = "/profile" }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState(null);

  const handleGoogleLogin = async () => {
    try {
      setAlert(null);
      setLoading(true);
      await signInWithPopup(auth, googleProvider);
      navigate(redirectTo, { replace: true });
    } catch (error) {
      console.error("Google Login Failed:", error);
      setAlert({
        title: "Google login failed",
        message: `${loginErrorMessages[error.code] || "Unable to sign in with Google. Please try again or contact the app administrator."}${error.code ? ` (${error.code})` : ""}`,
        tone: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
    <button
      type="button"
      onClick={handleGoogleLogin}
      disabled={loading}
      className="
        mt-4 w-full py-3
        border border-white/15 bg-white/[0.07]
        font-semibold text-white
        rounded-xl shadow-lg shadow-black/20
        hover:border-cyan-300/30 hover:bg-white/[0.11] hover:shadow-cyan-500/10
        transition-all duration-200 
        flex items-center justify-center gap-3
      "
    >
      <img
        src='https://www.svgrepo.com/show/355037/google.svg'
        alt='google'
        className="w-6 h-6"
      />

      {loading ? "Signing in..." : label}
    </button>
    <AlertModal
      open={Boolean(alert)}
      title={alert?.title}
      message={alert?.message}
      tone={alert?.tone}
      onClose={() => setAlert(null)}
    />
    </>
  );
};

export default GoogleLoginButton;
