"use client";

import Link from "next/link";
import { ArrowRight, Lock, Mail, Shield, Sparkles } from "lucide-react";
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
    <main className="flex min-h-screen items-center justify-center bg-[#fbfcfb] px-5 py-8">
      <div className="grid w-full max-w-[1040px] overflow-hidden rounded-[16px] border border-[#dce7e3] bg-white shadow-[0_26px_80px_rgba(44,62,56,0.18)] md:grid-cols-[0.92fr_0.88fr]">
        <aside className="hidden min-h-[540px] bg-[#77968c] bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.18)_1px,transparent_0)] [background-size:22px_22px] px-12 py-12 text-white md:flex md:flex-col">
          <Link href="/">
            <div className="text-[19px] font-semibold leading-none">
              Leon Manhimanzi
            </div>
            <div className="mt-2 text-[13px] font-medium uppercase tracking-[0.22em] text-white/72">
              Venue Simulation Tool
            </div>
          </Link>

          <div className="my-auto">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/22 bg-white/10 px-4 py-2 text-[13px] font-semibold text-white">
              <Sparkles size={16} />
              Your prompt is ready
            </div>
            <h1 className="mt-8 max-w-[500px] text-[36px] font-semibold leading-[1.08] tracking-[-0.03em]">
              Sign up to generate your venue from a prompt.
            </h1>
            <p className="mt-8 max-w-[400px] text-[18px] leading-8 text-white/78">
              Free for your first three projects. No credit card required.
            </p>
          </div>

          <div className="space-y-3 text-[18px] text-white/86">
            {[
              "Generate venues from a prompt or upload",
              "Place cameras, AV, and cable paths",
              "Export and share with your team",
            ].map((item) => (
              <div key={item} className="flex items-center gap-3">
                <span className="h-2 w-2 rounded-full bg-white" />
                <span>{item}</span>
              </div>
            ))}
          </div>

          <div className="mt-8 flex items-center gap-2 text-[13px] text-white/65">
            <Shield size={16} />
            Encrypted in transit. SSO available on Team plan.
          </div>
        </aside>

        <section className="px-8 py-8 md:px-12 md:py-12">
          <div className="flex items-center justify-between gap-5">
            <div className="text-[14px] font-semibold uppercase tracking-[0.22em] text-[#778580]">
              {isRegister ? "Create Account" : "Sign In"}
            </div>
            <Link
              href={switchHref}
              className="text-[15px] font-semibold text-[#6c7a75] transition hover:text-[#17211e]"
            >
              {isRegister ? "Have an account? Sign in" : "Need an account? Create one"}
            </Link>
          </div>

          <h2 className="mt-12 text-[34px] font-semibold leading-tight tracking-[-0.04em] text-[#1b2421] md:text-[38px]">
            {isRegister ? "Start your first simulation" : "Welcome back"}
          </h2>
          <p className="mt-3 text-[18px] leading-7 text-[#74817c]">
            {isRegister
              ? "It only takes a few seconds - your prompt is waiting."
              : "Sign in and continue building your venue."}
          </p>

          <button
            type="button"
            className="mt-8 flex h-14 w-full items-center justify-center gap-3 rounded-[8px] border border-[#e2e8e5] bg-white text-[18px] font-semibold text-[#27302d] shadow-[0_2px_8px_rgba(0,0,0,0.08)] opacity-70"
            title="Google sign-in is not configured yet"
          >
            <span className="font-bold text-[#4285f4]">G</span>
            Continue with Google
          </button>

          <div className="my-8 flex items-center gap-4">
            <div className="h-px flex-1 bg-[#dfe7e3]" />
            <div className="text-[13px] font-semibold uppercase tracking-[0.22em] text-[#88938f]">
              Or with email
            </div>
            <div className="h-px flex-1 bg-[#dfe7e3]" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <label className="block">
              <div className="mb-2 text-[15px] font-semibold text-[#71817a]">
                Work email
              </div>
              <div className="flex h-14 items-center gap-3 rounded-[8px] border border-[#e2e8e5] bg-white px-4 shadow-[0_2px_8px_rgba(0,0,0,0.08)]">
                <Mail size={21} className="text-[#92a19b]" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@studio.com"
                  className="min-w-0 flex-1 bg-transparent text-[18px] text-[#1d2724] placeholder:text-[#889692]"
                />
              </div>
            </label>

            <label className="block">
              <div className="mb-2 text-[15px] font-semibold text-[#71817a]">
                Password
              </div>
              <div className="flex h-14 items-center gap-3 rounded-[8px] border border-[#e2e8e5] bg-white px-4 shadow-[0_2px_8px_rgba(0,0,0,0.08)]">
                <Lock size={21} className="text-[#92a19b]" />
                <input
                  type="password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder={isRegister ? "Create a password" : "Enter your password"}
                  className="min-w-0 flex-1 bg-transparent text-[18px] text-[#1d2724] placeholder:text-[#889692]"
                />
              </div>
            </label>

            {error ? (
              <div className="rounded-[8px] border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-600">
                {error}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={isSubmitting}
              className="flex h-14 w-full items-center justify-center gap-3 rounded-[8px] bg-[#66887d] text-[18px] font-semibold text-white shadow-[0_3px_8px_rgba(0,0,0,0.22)] transition hover:bg-[#55786d] disabled:opacity-60"
            >
              {isSubmitting
                ? "Please wait..."
                : isRegister
                  ? "Create account & continue"
                  : "Sign in & continue"}
              <ArrowRight size={22} />
            </button>
          </form>

          <p className="mt-8 text-[14px] leading-6 text-[#71817a]">
            By continuing you agree to our{" "}
            <span className="underline underline-offset-2">Terms</span> and{" "}
            <span className="underline underline-offset-2">Privacy Policy</span>.
          </p>
        </section>
      </div>
    </main>
  );
}
