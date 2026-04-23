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
  const switchHref = useMemo(() => {
    const target = isRegister ? "/login" : "/register";
    return nextPath ? `${target}?next=${encodeURIComponent(nextPath)}` : target;
  }, [isRegister, nextPath]);

  const meta = useMemo(
    () =>
      isRegister
        ? {
            title: "Create your SpaceForge account",
            subtitle:
              "Register to save private venue projects, import plans, and generate layouts with AI.",
            action: "Create Account",
            switchText: "Already have an account? Log in",
          }
        : {
            title: "Welcome back to SpaceForge",
            subtitle:
              "Sign in to access your dashboard, resume saved prompts, and open the editor workspace.",
            action: "Log In",
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
        await register({
          email,
          password,
          redirectTo: nextPath
            ? `/login?next=${encodeURIComponent(nextPath)}`
            : "/login",
        });
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
    <main className="flex min-h-screen bg-[var(--sf-bg)]">
      <section className="hidden flex-1 border-r border-[var(--sf-border)] bg-white px-12 py-14 lg:flex lg:flex-col">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-[var(--sf-text)] text-[11px] font-semibold text-white">
            SF
          </div>
          <div className="text-[16px] font-semibold tracking-[-0.03em] text-[var(--sf-text)]">
            SpaceForge
          </div>
        </Link>

        <div className="my-auto max-w-[440px]">
          <div className="inline-block rounded-full bg-[var(--sf-surface-muted)] px-3 py-1 text-[12px] font-medium text-[var(--sf-text-muted)]">
            Venue planning workspace
          </div>
          <h1 className="mt-6 text-[44px] font-semibold leading-[1.05] tracking-[-0.05em] text-[var(--sf-text)]">
            Venue design, import, AI generation, and editor workflows in one shell.
          </h1>
          <p className="mt-5 text-[16px] leading-8 text-[var(--sf-text-muted)]">
            Your account keeps projects private per user, resumes saved prompt
            flows after login, and connects the same backend you already built.
          </p>

          <div className="mt-10 grid gap-3">
            {[
              "Prompt-to-3D generation with Ollama + Gemma3",
              "draw.io, XML, and HTML import into editable scenes",
              "Project save, share, export, and view-only client links",
            ].map((point) => (
              <div key={point} className="sf-panel-muted flex items-center gap-3 px-4 py-3">
                <div className="text-[var(--sf-accent-blue)]">•</div>
                <div className="text-[13px] text-[var(--sf-text-muted)]">{point}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="flex flex-1 items-center justify-center px-6 py-12">
        <div className="w-full max-w-[440px] rounded-[12px] border border-[var(--sf-border)] bg-white p-8 shadow-[var(--sf-shadow-md)]">
          <div className="text-[30px] font-semibold tracking-[-0.04em] text-[var(--sf-text)]">
            {meta.title}
          </div>
          <p className="mt-3 text-[14px] leading-7 text-[var(--sf-text-muted)]">
            {meta.subtitle}
          </p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            <label className="block">
              <div className="mb-2 text-[12px] font-medium text-[var(--sf-text-muted)]">
                Email
              </div>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                className="w-full rounded-[8px] border border-[var(--sf-border-strong)] bg-white px-4 py-3 text-[14px] text-[var(--sf-text)]"
              />
            </label>

            <label className="block">
              <div className="mb-2 text-[12px] font-medium text-[var(--sf-text-muted)]">
                Password
              </div>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                className="w-full rounded-[8px] border border-[var(--sf-border-strong)] bg-white px-4 py-3 text-[14px] text-[var(--sf-text)]"
              />
            </label>

            {isRegister ? (
              <label className="block">
                <div className="mb-2 text-[12px] font-medium text-[var(--sf-text-muted)]">
                  Confirm Password
                </div>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  required
                  className="w-full rounded-[8px] border border-[var(--sf-border-strong)] bg-white px-4 py-3 text-[14px] text-[var(--sf-text)]"
                />
              </label>
            ) : null}

            {error ? (
              <div className="rounded-[8px] border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-600">
                {error}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-[8px] bg-[var(--sf-text)] px-5 py-3 text-[14px] font-medium text-white transition hover:bg-[#333333] disabled:opacity-50"
            >
              {isSubmitting ? "Please wait..." : meta.action}
            </button>
          </form>

          <Link
            href={switchHref}
            className="mt-6 inline-block text-[13px] text-[var(--sf-text-muted)] transition hover:text-[var(--sf-text)]"
          >
            {meta.switchText}
          </Link>
        </div>
      </section>
    </main>
  );
}
