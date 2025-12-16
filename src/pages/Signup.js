// Signup.jsx
import React, { useState } from "react";
import { createUserWithEmailAndPassword } from "firebase/auth";
import {
  setDoc,
  doc
} from "firebase/firestore";
import { db, auth } from "../firebase";
import { useNavigate, Link } from "react-router-dom";

export default function Signup() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
  });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSignup = async (e) => {
    e.preventDefault();

    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        form.email,
        form.password
      );

      const user = userCredential.user;

      await setDoc(doc(db, "users", user.uid), {
        firstname: form.firstName,
        lastname: form.lastName,
        email_phone: form.email,
        role: "user", // default role
        createdAt: new Date(),
      });

      alert("✅ Account created successfully");
      navigate("/login");
    } catch (error) {
      alert(error.message);
    }
  };

  return (
    <>
        
        <div className="flex flex-col items-center justify-center min-h-[80vh] px-4 sm:px-6 md:px-10 text-center">
        <div className="bg-black/60 backdrop-blur-md p-8 rounded-2xl shadow-lg w-96 border border-yellow-400/30">
            <h2 className="text-2xl font-bold text-yellow-400 text-center mb-6">
            Create Account
            </h2>

            <form onSubmit={handleSignup} className="space-y-4">
            <input
                type="text"
                name="firstName"
                placeholder="First Name"
                value={form.firstName}
                onChange={handleChange}
                required
                className="w-full p-2 rounded bg-gray-800 border border-gray-700 focus:outline-none focus:ring-2 focus:ring-yellow-400"
            />

            <input
                type="text"
                name="lastName"
                placeholder="Last Name"
                value={form.lastName}
                onChange={handleChange}
                required
                className="w-full p-2 rounded bg-gray-800 border border-gray-700 focus:outline-none focus:ring-2 focus:ring-yellow-400"
            />

            <input
                type="email"
                name="email"
                placeholder="Email"
                value={form.email}
                onChange={handleChange}
                required
                className="w-full p-2 rounded bg-gray-800 border border-gray-700 focus:outline-none focus:ring-2 focus:ring-yellow-400"
            />

            <input
                type="password"
                name="password"
                placeholder="Password"
                value={form.password}
                onChange={handleChange}
                required
                className="w-full p-2 rounded bg-gray-800 border border-gray-700 focus:outline-none focus:ring-2 focus:ring-yellow-400"
            />

            <button
                type="submit"
                className="w-full bg-yellow-500 text-black font-semibold py-2 rounded hover:bg-yellow-400 transition"
            >
                Sign Up
            </button>
            </form>
            <p className="mt-4 text-sm text-gray-300">
                        Already have an account?{" "}
                        <Link to="/login" className="text-yellow-400 hover:underline">
                            Sign In
                        </Link>
                        </p>
        </div>
        </div>
    </>
  );
}
