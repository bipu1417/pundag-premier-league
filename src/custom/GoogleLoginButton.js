import React, { useState } from "react";
import { auth, googleProvider } from "../firebase"; 
import { signInWithPopup } from "firebase/auth";

const GoogleLoginButton = () => {
  const [loading, setLoading] = useState(false);

  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      await signInWithPopup(auth, googleProvider);
      // redirect or reload
      window.location.href = "/"; 
    } catch (error) {
      console.error("Google Login Failed:", error);
      alert("Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleGoogleLogin}
      disabled={loading}
      className="
        w-full mt-4 py-3 
        bg-white border border-gray-300 
        text-gray-700 font-semibold 
        rounded-xl shadow-md 
        hover:shadow-lg hover:bg-gray-50 
        transition-all duration-200 
        flex items-center justify-center gap-3
      "
    >
      <img
        src='https://www.svgrepo.com/show/355037/google.svg'
        alt='google'
        className="w-6 h-6"
      />

      {loading ? "Signing in..." : "Sign in with Google"}
    </button>
  );
};

export default GoogleLoginButton;
