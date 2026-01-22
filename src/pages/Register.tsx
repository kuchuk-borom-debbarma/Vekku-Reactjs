import React, { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Link } from "react-router-dom";

const Register: React.FC = () => {
  const { register } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setIsLoading(true);

    try {
      await register(email, password, name);
      setSuccess("Verification email sent! Please check your inbox to activate your account.");
      setEmail("");
      setPassword("");
      setName("");
    } catch (err: any) {
      console.error(err);
      const errorMessage = err.response?.data?.error;
      setError(typeof errorMessage === "string" ? errorMessage : "Failed to request registration");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-8">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-zinc-900">Create an account</h2>
        <p className="text-sm text-zinc-500 mt-2">Join Vekku to start managing your knowledge</p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-100 text-red-600 rounded-xl text-sm flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
          <div className="w-1.5 h-1.5 rounded-full bg-red-600" />
          {error}
        </div>
      )}

      {success && (
        <div className="mb-6 p-4 bg-green-50 border border-green-100 text-green-700 rounded-xl text-sm flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
          <div className="w-1.5 h-1.5 rounded-full bg-green-600" />
          {success}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-2">
          <label className="text-sm font-medium text-zinc-900 ml-1">Full Name</label>
          <input
            type="text"
            placeholder="John Doe"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-all text-sm"
            required
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-zinc-900 ml-1">Email</label>
          <input
            type="email"
            placeholder="name@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-all text-sm"
            required
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-zinc-900 ml-1">Password</label>
          <input
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-all text-sm"
            required
            minLength={6}
          />
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-3 px-4 bg-black text-white text-sm font-semibold rounded-xl hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-500 disabled:opacity-50 transition-all shadow-sm active:scale-[0.98]"
        >
          {isLoading ? "Creating account..." : "Create Account"}
        </button>
      </form>

      <div className="mt-8 text-center text-sm text-zinc-500">
        Already have an account?{" "}
        <Link to="/login" className="text-black font-semibold hover:underline decoration-zinc-300 underline-offset-4">
          Login here
        </Link>
      </div>
    </div>
  );
};

export default Register;
