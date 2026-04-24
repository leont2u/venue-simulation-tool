import { Suspense } from "react";
import { AuthGate } from "@/components/auth/AuthGate";
import { AuthExperience } from "@/components/auth/AuthExperience";

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <AuthGate>
        <AuthExperience mode="login" />
      </AuthGate>
    </Suspense>
  );
}
