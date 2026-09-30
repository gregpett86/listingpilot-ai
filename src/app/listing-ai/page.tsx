import { RealtyEdgeShell } from "@/components/realty-edge-shell";
import ListingEvaluationV2Client from "../listing-evaluation-v2/listing-evaluation-v2-client";

export const dynamic = "force-dynamic";

export default function ListingAiPage() {
  return (
    <RealtyEdgeShell activeLabel="Listing AI">
      <div className="h-full overflow-y-auto">
        <ListingEvaluationV2Client />
      </div>
    </RealtyEdgeShell>
  );
}
