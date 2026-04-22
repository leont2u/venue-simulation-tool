"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";

export function AuthGate({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { isAuthenticated, isHydrating } = useAuth();

  useEffect(() => {
    if (!isHydrating && isAuthenticated) {
      router.replace("/dashboard");
    }
  }, [isAuthenticated, isHydrating, router]);

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
