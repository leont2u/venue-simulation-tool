"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next");
  const { login, register, isSubmitting } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");

  const isRegister = mode === "register";

  const meta = useMemo(
    () =>
      isRegister
        ? {
            title: "Create your account",
            subtitle: "Register to manage venue projects and access the 3D editor.",
            action: "Register",
            switchHref: "/login",
            switchText: "Already have an account? Log in",
          }
        : {
            title: "Welcome back",
            subtitle: "Sign in to access your dashboard and editor workspace.",
            action: "Login",
            switchHref: "/register",
            switchText: "Need an account? Register",
          },
    [isRegister],
  );

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    if (isRegister && password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    try {
      if (isRegister) {
        await register({ email, password });
      } else {
        await login({ email, password, redirectTo: nextPath || "/dashboard" });
      }
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Authentication failed.",
      );
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F7F8F5] px-6 py-12">
      <div className="w-full max-w-md rounded-[32px] border border-black/5 bg-white p-8 shadow-[0_30px_100px_rgba(47,62,70,0.12)]">
        <h1 className="text-3xl font-semibold text-[#2F3E46]">{meta.title}</h1>
        <p className="mt-2 text-sm leading-6 text-[#52796F]">{meta.subtitle}</p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <label className="block">
            <div className="mb-2 text-sm font-medium text-[#2F3E46]">Email</div>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              className="w-full rounded-2xl border border-black/10 bg-[#F8FAF7] px-4 py-3 text-[#2F3E46]"
            />
          </label>

          <label className="block">
            <div className="mb-2 text-sm font-medium text-[#2F3E46]">Password</div>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              className="w-full rounded-2xl border border-black/10 bg-[#F8FAF7] px-4 py-3 text-[#2F3E46]"
            />
          </label>

          {isRegister ? (
            <label className="block">
              <div className="mb-2 text-sm font-medium text-[#2F3E46]">
                Confirm Password
              </div>
              <input
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                required
                className="w-full rounded-2xl border border-black/10 bg-[#F8FAF7] px-4 py-3 text-[#2F3E46]"
              />
            </label>
          ) : null}

          {error ? (
            <div className="rounded-2xl border border-red-500/15 bg-red-500/10 px-4 py-3 text-sm text-red-500">
              {error}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-2xl bg-[#84A98C] px-5 py-3.5 text-sm font-medium text-white transition hover:bg-[#52796F] disabled:opacity-50"
          >
            {isSubmitting ? "Please wait..." : meta.action}
          </button>
        </form>

        <Link
          href={meta.switchHref}
          className="mt-6 inline-block text-sm text-[#52796F] underline-offset-4 hover:text-[#2F3E46] hover:underline"
        >
          {meta.switchText}
        </Link>
      </div>
    </main>
  );
}
