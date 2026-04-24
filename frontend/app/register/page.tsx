import { Suspense } from "react";
import { AuthGate } from "@/components/auth/AuthGate";
import { AuthExperience } from "@/components/auth/AuthExperience";

export default function RegisterPage() {
  return (
    <Suspense fallback={null}>
      <AuthGate>
        <AuthExperience mode="register" />
      </AuthGate>
    </Suspense>
  );
}
