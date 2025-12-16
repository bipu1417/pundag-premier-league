// ---------------- USER LOGIN PAGE ----------------
// Login.jsx
import React, { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../firebase";
import { useNavigate, Link } from "react-router-dom";


export function Login() {
const [email, setEmail] = useState("");
const [password, setPassword] = useState("");
const navigate = useNavigate();


const handleLogin = async (e) => {
e.preventDefault();
try {
await signInWithEmailAndPassword(auth, email, password);
navigate("/"); // redirect after login
} catch (error) {
alert("❌ " + error.message);
}
};


return (
<div className="flex flex-col items-center justify-center min-h-[80vh] px-4 sm:px-6 md:px-10 text-center">
<div className="bg-black/60 backdrop-blur-md p-8 rounded-2xl shadow-lg w-96 border border-yellow-400/30">
<h2 className="text-2xl font-bold text-yellow-400 text-center mb-6">
User Login
</h2>


<form onSubmit={handleLogin} className="space-y-4">
<input
type="email"
placeholder="Email"
value={email}
onChange={(e) => setEmail(e.target.value)}
required
className="w-full p-2 rounded bg-gray-800 border border-gray-700 focus:outline-none focus:ring-2 focus:ring-yellow-400"
/>


<input
type="password"
placeholder="Password"
value={password}
onChange={(e) => setPassword(e.target.value)}
required
className="w-full p-2 rounded bg-gray-800 border border-gray-700 focus:outline-none focus:ring-2 focus:ring-yellow-400"
/>


<button
type="submit"
className="w-full bg-yellow-500 text-black font-semibold py-2 rounded hover:bg-yellow-400 transition"
>
Login
</button>
</form>

<p className="mt-4 text-sm text-gray-300">
            Don’t have an account?{" "}
            <Link to="/signup" className="text-yellow-400 hover:underline">
            Sign Up
            </Link>
            </p>
</div>
</div>
);
}