import { RepToolsShell } from "@/components/rep-tools-shell";
import ListingEvaluationV2Client from "@/app/listing-evaluation-v2/listing-evaluation-v2-client";

export const dynamic = "force-dynamic";

export default function ToolsListingAiPage() {
  return (
    <RepToolsShell activeLabel="Create Listing AI">
      <ListingEvaluationV2Client />
    </RepToolsShell>
  );
}
