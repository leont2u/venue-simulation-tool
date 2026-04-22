import { AuthGate } from "@/components/auth/AuthGate";
import { AuthForm } from "@/components/auth/AuthForm";

export default function LoginPage() {
  return (
    <AuthGate>
      <AuthForm mode="login" />
    </AuthGate>
  );
}
