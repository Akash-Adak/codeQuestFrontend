import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";

const SignUp = ({ onSignUpSuccess }) => {
  const [step, setStep] = useState("signup"); // "signup" or "verify"
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  // Step 1: Submit signup form to send verification code
  const handleSignUp = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("http://localhost:8080/public/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password, email }),
      });
      setLoading(false);
      if (res.ok) {
        // Move to verification step
        setStep("verify");
        localStorage.setItem("email",email);
        localStorage.setItem("name",username);

      } else {
        const text = await res.text();
        setError(text || "Sign up failed");
      }
    } catch {
      setLoading(false);
      setError("Sign up failed");
    }
  };

  // Step 2: Submit verification code to complete signup
  const handleVerify = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("http://localhost:8080/public/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code }),
      });
      setLoading(false);
      if (res.ok) {
        const data = await res.json();
        // You can save token here or call onSignUpSuccess callback
        localStorage.setItem("token", data.token);
        // Redirect to dashboard or login page
        navigate("/Login"); // or "/login"
      } else {
        const text = await res.text();
        setError(text || "Verification failed");
      }
    } catch {
      setLoading(false);
      setError("Verification failed");
    }
  };

  // Optional: Google login (unchanged)
  // const handleGoogleLogin = () => {
  //   window.location.href = "http://localhost:http://localhost:8080/oauth2/authorization/google";
  // };

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="w-full max-w-md p-8 bg-white dark:bg-gray-800 rounded-lg shadow-lg opacity-90 backdrop-blur-lg">
        {step === "signup" && (
          <>
            <h2 className="text-3xl font-semibold text-center text-gray-700 dark:text-white mb-6">
              Create your account
            </h2>

            {error && (
              <div className="text-red-500 text-sm text-center mb-4">{error}</div>
            )}

            <form onSubmit={handleSignUp} className="space-y-4">
              <input
                type="text"
                placeholder="Username"
                className="w-full px-4 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white dark:border-gray-600"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
              <input
                type="password"
                placeholder="Password"
                className="w-full px-4 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white dark:border-gray-600"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <input
                type="email"
                placeholder="Email"
                className="w-full px-4 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white dark:border-gray-600"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <button
                type="submit"
                className="w-full py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-indigo-500 dark:hover:bg-indigo-600"
                disabled={loading}
              >
                {loading ? "Signing Up..." : "Sign Up"}
              </button>
            </form>

            <div className="flex items-center justify-center my-4">
              <div className="text-gray-500 dark:text-gray-400">OR</div>
            </div>

            <button
              onClick={handleGoogleLogin}
              className="w-full flex items-center justify-center py-2 border border-gray-300 rounded-md hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:hover:bg-gray-600"
            >
              <img
                src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/google/google-original.svg"
                alt="Google Logo"
                className="w-5 h-5 mr-2"
              />
              Continue with Google
            </button>

{/*             <div className="text-center text-sm text-gray-500 mt-4 dark:text-gray-400">
              Already have an account?{" "}
              <Link
                to="/login"
                className="text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-500"
              >
                Login
              </Link>
            </div> */}
          </>
        )}

        {step === "verify" && (
          <>
            <h2 className="text-3xl font-semibold text-center text-gray-700 dark:text-white mb-6">
              Verify Your Email
            </h2>

            {error && (
              <div className="text-red-500 text-sm text-center mb-4">{error}</div>
            )}

            <form onSubmit={handleVerify} className="space-y-4">
              <input
                type="email"
                placeholder="Email"
                className="w-full px-4 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white dark:border-gray-600"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled
              />
              <input
                type="text"
                placeholder="Verification Code"
                className="w-full px-4 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white dark:border-gray-600"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                required
              />
              <button
                type="submit"
                className="w-full py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-indigo-500 dark:hover:bg-indigo-600"
                disabled={loading}
              >
                {loading ? "Verifying..." : "Verify"}
              </button>
            </form>

            <div className="text-center text-sm text-gray-500 mt-4 dark:text-gray-400">
              Didn't receive the code?{" "}
              <button
                onClick={handleSignUp}
                className="text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-500 underline"
                disabled={loading}
              >
                Resend Code
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default SignUp;
