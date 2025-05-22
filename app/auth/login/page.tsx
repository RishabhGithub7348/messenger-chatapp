"use client";

import { createClient } from "@/lib/supabase/client";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isFormVisible, setIsFormVisible] = useState(false); // For fade-in effect
  const router = useRouter();
  const supabase = createClient();

  // Trigger fade-in effect on mount
  useEffect(() => {
    setIsFormVisible(true);
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Please fill in all fields");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setError(error.message);
        return;
      }

      router.push("/");
    } catch (err) {
      console.error("Login error:", err);
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-white/90 via-black/600 to-black/200 ">
      {/* Left Side: Demonstrative Image */}
      <div className="hidden lg:flex lg:w-1/2 items-center justify-center ml-9 transition-all duration-1000 ease-in-out transform">
        <div
          className={`relative h-[400px] w-[400px] hidden md:block transition-all duration-1000 ease-in-out transform ${
            isFormVisible
              ? "opacity-100 translate-y-0"
              : "opacity-0 translate-y-10"
          }`}
        >
          <Image
            src="/documents.png"
            fill
            className="object-contain dark:hidden"
            alt="Documents"
          />
        </div>
        <div
          className={`relative h-[400px] w-[400px] hidden md:block transition-all duration-1000 ease-in-out transform ${
            isFormVisible
              ? "opacity-100 translate-y-0"
              : "opacity-0 translate-y-10"
          }`}
        >
          <Image
            src="/reading.png"
            fill
            className="object-contain dark:hidden"
            alt="Reading"
          />
        </div>
      </div>

      {/* Right Side: Login Form */}
      <div className="flex w-full lg:w-1/2 items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
        <div
          className={`w-full max-w-md bg-white px-8 py-10 shadow-lg rounded-lg transition-all duration-1000 ease-in-out transform ${
            isFormVisible
              ? "opacity-100 translate-y-0"
              : "opacity-0 translate-y-10"
          }`}
        >
          <div className="mb-8 text-center">
            <h2 className="text-3xl font-bold text-gray-900">
              Sign in to Chat Messenger
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              Or{" "}
              <Link
                href="/auth/signup"
                className="font-medium text-[0.96rem] hover:underline text-blue-500 hover:text-blue-600 transition-colors duration-300"
              >
                Create a new account
              </Link>
            </p>
          </div>

          {error && (
            <div className="mb-4 rounded-md bg-red-50 p-4 animate-fade-in">
              <div className="flex">
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">
                    Authentication Error
                  </h3>
                  <div className="mt-2 text-sm text-red-700">{error}</div>
                </div>
              </div>
            </div>
          )}

          <form
            className="space-y-6"
            onSubmit={handleLogin}
            aria-label="Login form"
          >
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700"
              >
                Email address
              </label>
              <div className="mt-1">
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={`block w-full appearance-none rounded-md border ${
                    error && !email ? "border-red-500" : "border-gray-300"
                  } px-3 py-2 placeholder-gray-400 shadow-sm focus:border-blue-400 focus:outline-none focus:ring-blue-400 transition-all duration-300 ease-in-out`}
                  aria-invalid={error && !email ? "true" : "false"}
                  aria-describedby={error && !email ? "email-error" : undefined}
                />
                {error && !email && (
                  <p id="email-error" className="mt-1 text-sm text-red-600">
                    Email is required
                  </p>
                )}
              </div>
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700"
              >
                Password
              </label>
              <div className="mt-1">
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`block w-full appearance-none rounded-md border ${
                    error && !password ? "border-red-500" : "border-gray-300"
                  } px-3 py-2 placeholder-gray-400 shadow-sm focus:border-blue-400 focus:outline-none focus:ring-blue-400 transition-all duration-300 ease-in-out`}
                  aria-invalid={error && !password ? "true" : "false"}
                  aria-describedby={
                    error && !password ? "password-error" : undefined
                  }
                />
                {error && !password && (
                  <p id="password-error" className="mt-1 text-sm text-red-600">
                    Password is required
                  </p>
                )}
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="flex w-full cursor-pointer justify-center items-center rounded-md border border-transparent bg-green-500 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 ease-in-out"
              >
                {loading ? (
                  <>
                    <svg
                      className="animate-spin h-5 w-5 mr-2 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                      />
                    </svg>
                    Signing in...
                  </>
                ) : (
                  "Sign in"
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
