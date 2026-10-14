import RepToolsAuthLayout from "@/components/rep-tools-auth-layout";
import SignupCompleteClient from "./complete-client";

export default async function SignupCompletePage({ searchParams }: { searchParams: Promise<{ session_id?: string }> }) {
  const params = await searchParams;
  return (
    <RepToolsAuthLayout>
      <SignupCompleteClient sessionId={params.session_id ?? ""} />
    </RepToolsAuthLayout>
  );
}
