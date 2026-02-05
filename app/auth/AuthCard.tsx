"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type Mode = "login" | "signup";

type StoredUser = {
  email: string;
  password: string;
};

const STORAGE_KEY = "venuesim_mock_users";
const SESSION_KEY = "venuesim_mock_session";

function getUsers(): StoredUser[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as StoredUser[]) : [];
  } catch {
    return [];
  }
}

function saveUsers(users: StoredUser[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(users));
}

function setSession(email: string) {
  localStorage.setItem(
    SESSION_KEY,
    JSON.stringify({ email, createdAt: Date.now() }),
  );
}

export default function AuthCard() {
  const router = useRouter();

  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const isSignup = mode === "signup";

  const canSubmit = useMemo(() => {
    if (!email || !password) return false;
    if (isSignup && password !== confirmPassword) return false;
    if (password.length < 6) return false;
    return true;
  }, [email, password, confirmPassword, isSignup]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!canSubmit) return;

    setLoading(true);

    // simulate network delay
    await new Promise((r) => setTimeout(r, 600));

    try {
      const users = getUsers();
      const existing = users.find(
        (u) => u.email.toLowerCase() === email.toLowerCase(),
      );

      if (mode === "signup") {
        if (existing) {
          setError("An account with this email already exists. Please log in.");
          setLoading(false);
          return;
        }

        // MOCK: store user (never do this in production)
        const next = [...users, { email, password }];
        saveUsers(next);

        setSession(email);
        setSuccess("Account created! Redirecting…");
        setLoading(false);

        router.push("/workspace");
        return;
      }

      // login
      if (!existing || existing.password !== password) {
        setError("Invalid email or password.");
        setLoading(false);
        return;
      }

      setSession(existing.email);
      setSuccess("Logged in! Redirecting…");
      setLoading(false);

      router.push("/workspace");
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-md">
      <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm sm:p-8">
        {/* Tabs */}
        <div className="flex rounded-2xl bg-gray-50 p-1">
          <button
            type="button"
            onClick={() => {
              setMode("login");
              setError(null);
              setSuccess(null);
            }}
            className={[
              "flex-1 rounded-xl px-4 py-2 text-sm font-semibold transition",
              mode === "login"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-600 hover:text-gray-900",
            ].join(" ")}
          >
            Login
          </button>

          <button
            type="button"
            onClick={() => {
              setMode("signup");
              setError(null);
              setSuccess(null);
            }}
            className={[
              "flex-1 rounded-xl px-4 py-2 text-sm font-semibold transition",
              mode === "signup"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-600 hover:text-gray-900",
            ].join(" ")}
          >
            Create account
          </button>
        </div>

        <div className="mt-6">
          <h2 className="text-xl font-extrabold tracking-tight text-gray-900">
            {isSignup ? "Create your account" : "Sign in to your workspace"}
          </h2>
          <p className="mt-2 text-sm text-gray-500">
            {isSignup
              ? "Start generating 3D venues from prompts or sketches."
              : "Continue designing your 3D venue layouts."}
          </p>
        </div>

        {/* Alerts */}
        {error && (
          <div className="mt-4 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}
        {success && (
          <div className="mt-4 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {success}
          </div>
        )}

        {/* Form */}
        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <Field label="Email">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="h-12 w-full rounded-2xl border border-gray-200 bg-white px-4 text-sm text-gray-900 outline-none transition focus:border-indigo-300 focus:ring-4 focus:ring-indigo-100"
              required
            />
          </Field>

          <Field label="Password">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimum 6 characters"
              className="h-12 w-full rounded-2xl border border-gray-200 bg-white px-4 text-sm text-gray-900 outline-none transition focus:border-indigo-300 focus:ring-4 focus:ring-indigo-100"
              required
              minLength={6}
            />
          </Field>

          {isSignup && (
            <Field label="Confirm password">
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter password"
                className="h-12 w-full rounded-2xl border border-gray-200 bg-white px-4 text-sm text-gray-900 outline-none transition focus:border-indigo-300 focus:ring-4 focus:ring-indigo-100"
                required
                minLength={6}
              />
            </Field>
          )}

          {!isSignup && (
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm text-gray-600">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-200"
                />
                Remember me
              </label>

              <button
                type="button"
                className="text-sm font-semibold text-indigo-600 hover:text-indigo-700"
                onClick={() => alert("Mock: implement password reset later")}
              >
                Forgot password?
              </button>
            </div>
          )}

          <button
            type="submit"
            disabled={!canSubmit || loading}
            className={[
              "mt-2 inline-flex h-12 w-full items-center justify-center rounded-2xl px-6 text-sm font-semibold text-white shadow-sm transition",
              !canSubmit || loading
                ? "bg-gray-300"
                : "bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-4 focus:ring-indigo-200",
            ].join(" ")}
          >
            {loading ? "Please wait…" : isSignup ? "Create account" : "Sign in"}
          </button>

          <p className="text-center text-xs text-gray-500">
            By continuing, you agree to our{" "}
            <a
              className="font-semibold text-gray-700 hover:text-gray-900"
              href="#"
            >
              Terms
            </a>{" "}
            and{" "}
            <a
              className="font-semibold text-gray-700 hover:text-gray-900"
              href="#"
            >
              Privacy Policy
            </a>
            .
          </p>
        </form>

        {/* Optional: divider + mock SSO */}
        <div className="mt-6">
          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-gray-100" />
            <span className="text-xs font-semibold text-gray-400">OR</span>
            <div className="h-px flex-1 bg-gray-100" />
          </div>

          <button
            type="button"
            onClick={() => alert("Mock: SSO integration later")}
            className="mt-4 inline-flex h-12 w-full items-center justify-center rounded-2xl border border-gray-200 bg-white px-6 text-sm font-semibold text-gray-900 transition hover:bg-gray-50"
          >
            Continue with Google (mock)
          </button>
        </div>
      </div>

      {/* Small helper */}
      <p className="mt-4 text-center text-xs text-gray-400">
        Mock auth stores users in localStorage (for prototyping only).
      </p>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-semibold text-gray-700">
        {label}
      </label>
      {children}
    </div>
  );
}
