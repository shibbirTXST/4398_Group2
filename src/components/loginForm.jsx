import { useState } from "react";
import { supabase } from "../supabaseClient";
import { Link, useNavigate } from "react-router-dom";
import bgImage from "../assets/signinAnimood2.png";

const LoginForm = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");

    if (!email.trim() || !password) {
      setError("Both fields are required");
      return;
    }

    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email,
      password: password
    });
    setLoading(false);

    if (error) {
      setError(error.message);
    } else {
      navigate("/");
    }
  };

  return (
   <div
  className="min-h-screen w-full bg-center bg-cover bg-no-repeat flex items-center justify-center px-4"
  style={{ backgroundImage: `url(${bgImage})` }}
>
  <div className="w-full max-w-md">
    <form
      onSubmit={handleLogin}
      className="w-full mx-auto flex flex-col items-center"
    >
      <div className="w-full flex flex-col gap-6 mt-4 text-center">

        {/* Inputs */}
        <input
          placeholder="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full px-5 py-4 rounded-full bg-gray-300/90 text-black placeholder-gray-700 outline-none shadow-md"
        />

        <input
          placeholder="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full px-5 py-4 rounded-full bg-gray-300/90 text-black placeholder-gray-700 outline-none shadow-md"
        />

        {/* Error */}
        {error && (
          <p className="text-red-300 text-sm text-center font-medium">
            {error}
          </p>
        )}

        {/* Buttons */}
        <div className="flex gap-[60px] justify-center mt-2">
          <button
            type="submit"
            disabled={loading}
            className="min-w-[150px] bg-gray-300/90 hover:bg-gray-200 text-black font-semibold py-3 px-6 rounded-full shadow-md transition"
          >
            {loading ? "Logging in..." : "Login"}
          </button>

          <Link
            to="/signup"
            className="min-w-[150px] flex items-center justify-center bg-gray-300/90 hover:bg-gray-200 text-black font-semibold py-3 px-6 rounded-full shadow-md transition"
          >
            Sign Up
          </Link>
        </div>

        {/* Bottom Section */}
        <div className="flex flex-col items-center gap-2 mt-2">
          <Link
            to="/forgot-password"
            className="text-white text-[14px] hover:underline"
          >
            Forgot password?
          </Link>

          <p className="text-white text-[14px]">
            Don&apos;t have an account?{" "}
            <Link
              to="/signup"
              className="text-blue-300 hover:underline font-semibold"
            >
              Sign up instead
            </Link>
          </p>
        </div>

      </div>
    </form>
  </div>
</div>
  );
};

export default LoginForm;