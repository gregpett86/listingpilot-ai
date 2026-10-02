import RepToolsAuthCard from "@/components/rep-tools-auth-card";
import RepToolsAuthLayout from "@/components/rep-tools-auth-layout";

export default function SigninPage() {
  return (
    <RepToolsAuthLayout>
      <RepToolsAuthCard mode="signin" />
    </RepToolsAuthLayout>
  );
}
