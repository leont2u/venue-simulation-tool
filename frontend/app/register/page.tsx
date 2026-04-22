import { AuthGate } from "@/components/auth/AuthGate";
import { AuthForm } from "@/components/auth/AuthForm";

export default function RegisterPage() {
  return (
    <AuthGate>
      <AuthForm mode="register" />
    </AuthGate>
  );
}
