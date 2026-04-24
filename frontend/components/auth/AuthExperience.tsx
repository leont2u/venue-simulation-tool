"use client";

import Link from "next/link";
import { Github, Lock, Mail, Shield, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import { apiClient } from "@/lib/apiClient";

export function AuthExperience({ mode }: { mode: "login" | "register" }) {
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next") || "/dashboard";
  const { login, isSubmitting } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const isRegister = mode === "register";

  const switchHref = useMemo(() => {
    const target = isRegister ? "/login" : "/register";
    return `${target}?next=${encodeURIComponent(nextPath)}`;
  }, [isRegister, nextPath]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    try {
      if (isRegister) {
        await apiClient.post("/api/auth/register/", { email, password });
      }

      await login({ email, password, redirectTo: nextPath });
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Authentication failed.",
      );
    }
  };

  return (
    <main className="h-screen overflow-hidden bg-white text-[#17211e]">
      <div className="grid h-full w-full bg-white md:grid-cols-[1.06fr_0.94fr]">
        <aside className="relative hidden overflow-hidden bg-[#527970] p-12 text-white md:flex md:flex-col lg:p-16">
          <Link href="/" className="relative">
            <div className="text-[18px] font-semibold leading-none">
              Leon Manhimanzi
            </div>
            <div className="mt-2 text-[11px] font-medium uppercase tracking-[0.2em] text-white/68">
              Venue Simulation Tool
            </div>
          </Link>

          <div className="relative mt-auto grid grid-cols-[1fr_0.86fr] items-end gap-8">
            <div>
              <h1 className="text-[48px] font-semibold leading-[1.04] tracking-[-0.03em]">
                Get Started
                <span className="block">with Us</span>
              </h1>
            </div>
            <p className="mb-2 text-[17px] leading-7 text-white/76">
              Complete these easy steps to register your account.
            </p>
          </div>

          <div className="relative mt-10 grid grid-cols-3 gap-5">
            {[
              [
                "1",
                isRegister ? "Sign up your account" : "Sign in to your account",
              ],
              ["2", "Set up your workspace"],
              ["3", "Set up your profile"],
            ].map(([number, label], index) => (
              <div
                key={number}
                className={`h-[138px] rounded-[10px] p-6 ${
                  index === 0
                    ? "bg-white text-[#111917]"
                    : "bg-white/14 text-white/82 backdrop-blur"
                }`}
              >
                <div
                  className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-semibold ${
                    index === 0
                      ? "bg-[#17211e] text-white"
                      : "bg-white/18 text-white"
                  }`}
                >
                  {number}
                </div>
                <div className="mt-8 text-[16px] font-medium leading-6">
                  {label}
                </div>
              </div>
            ))}
          </div>

          <div className="relative mt-9 flex items-center gap-2 text-[15px] text-white/68">
            <Shield size={18} />
            Encrypted in transit. Built for private venue projects.
          </div>
        </aside>

        <section className="flex min-h-0 items-center justify-center bg-white px-6 py-6 sm:px-10">
          <div className="w-full max-w-[440px]">
            <div className="text-center">
              <div className="mx-auto mb-6 inline-flex h-12 w-12 items-center justify-center rounded-full border border-[#c8d8d3] bg-[#eaf2ef] text-[#527970]">
                <Sparkles size={22} />
              </div>
              <h2 className="text-[36px] font-semibold tracking-[-0.03em] text-[#17211e]">
                {isRegister ? "Sign Up Account" : "Sign In Account"}
              </h2>
              <p className="mt-3 text-[15px] leading-6 text-[#6e7d78]">
                {isRegister
                  ? "Enter your personal data to create your account."
                  : "Enter your details to continue to your dashboard."}
              </p>
            </div>

            <div className="mt-9 grid grid-cols-2 gap-4">
              <button
                type="button"
                className="flex h-13 items-center justify-center gap-3 rounded-[8px] border border-[#dfe8e5] bg-white text-[16px] font-medium text-[#25312d] shadow-sm transition hover:bg-[#f5faf8]"
                title="Google sign-in is not configured yet"
              >
                <span className="font-bold text-[#527970]">G</span>
                Google
              </button>
              <button
                type="button"
                className="flex h-13 items-center justify-center gap-3 rounded-[8px] border border-[#dfe8e5] bg-white text-[16px] font-medium text-[#25312d] shadow-sm transition hover:bg-[#f5faf8]"
                title="GitHub sign-in is not configured yet"
              >
                <Github size={18} />
                GitHub
              </button>
            </div>

            <div className="my-7 flex items-center gap-4">
              <div className="h-px flex-1 bg-[#dfe8e5]" />
              <div className="text-[14px] text-[#7e8b86]">Or</div>
              <div className="h-px flex-1 bg-[#dfe8e5]" />
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <label className="block">
                <div className="mb-2 text-[15px] font-medium text-[#4f625c]">
                  Email
                </div>
                <div className="flex h-14 items-center gap-3 rounded-[8px] border border-[#dfe8e5] bg-[#f7faf9] px-4 shadow-sm">
                  <Mail size={20} className="text-[#7e908a]" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="eg. johnframe@gmail.com"
                    className="min-w-0 flex-1 bg-transparent text-[18px] text-[#17211e] placeholder:text-[#9aa7a2]"
                  />
                </div>
              </label>

              <label className="block">
                <div className="mb-2 text-[15px] font-medium text-[#4f625c]">
                  Password
                </div>
                <div className="flex h-14 items-center gap-3 rounded-[8px] border border-[#dfe8e5] bg-[#f7faf9] px-4 shadow-sm">
                  <Lock size={20} className="text-[#7e908a]" />
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Enter your password"
                    className="min-w-0 flex-1 bg-transparent text-[18px] text-[#17211e] placeholder:text-[#9aa7a2]"
                  />
                </div>
                {isRegister ? (
                  <div className="mt-2 text-[12px] text-[#7e8b86]">
                    Must be at least 8 characters.
                  </div>
                ) : null}
              </label>

              {error ? (
                <div className="rounded-[8px] border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-600">
                  {error}
                </div>
              ) : null}

              <button
                type="submit"
                disabled={isSubmitting}
                className="flex h-14 w-full items-center justify-center rounded-[8px] bg-[#527970] text-[18px] font-semibold text-white shadow-[0_4px_12px_rgba(82,121,112,0.24)] transition hover:bg-[#466b63] disabled:opacity-60"
              >
                {isSubmitting
                  ? "Please wait..."
                  : isRegister
                    ? "Sign Up"
                    : "Sign In"}
              </button>
            </form>

            <div className="mt-7 text-center text-[15px] text-[#7e8b86]">
              {isRegister ? "Already have an account?" : "Need an account?"}{" "}
              <Link
                href={switchHref}
                className="font-medium text-[#527970] hover:text-[#345f56]"
              >
                {isRegister ? "Log in" : "Sign up"}
              </Link>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
