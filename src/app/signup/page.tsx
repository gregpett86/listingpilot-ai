import RepToolsAuthLayout from "@/components/rep-tools-auth-layout";
import SignupClient from "./signup-client";
import { repToolsBillingMode, stripeConfig } from "@/lib/rep-tools/server-config";

export default function SignupPage() {
  const billingMode = repToolsBillingMode();
  const { publishableKey } = stripeConfig();
  return (
    <RepToolsAuthLayout>
      <SignupClient billingMode={billingMode} publishableKey={publishableKey} />
    </RepToolsAuthLayout>
  );
}
