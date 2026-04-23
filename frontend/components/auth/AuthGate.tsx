"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";

export function AuthGate({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated, isHydrating } = useAuth();
  const nextPath = searchParams.get("next");

  useEffect(() => {
    if (!isHydrating && isAuthenticated) {
      router.replace(nextPath || "/dashboard");
    }
  }, [isAuthenticated, isHydrating, nextPath, router]);

  if (isHydrating) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F7F8F5] text-[#52796F]">
        Loading...
      </div>
    );
  }

  if (isAuthenticated) return null;

  return <>{children}</>;
}
