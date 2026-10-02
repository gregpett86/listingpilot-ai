import RepToolsAuthCard from "@/components/rep-tools-auth-card";
import RepToolsAuthLayout from "@/components/rep-tools-auth-layout";

export default function SignupPage() {
  return (
    <RepToolsAuthLayout>
      <RepToolsAuthCard mode="signup" />
    </RepToolsAuthLayout>
  );
}
