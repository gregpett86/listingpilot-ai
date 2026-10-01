import { RepToolsShell, ToolsPageHeader } from "@/components/rep-tools-shell";
import { ListingReportsPage } from "@/app/listing-reports/listing-reports-client";

export default function ToolsListingAiReportsPage() {
  return (
    <RepToolsShell activeLabel="Listing AI Reports">
      <ToolsPageHeader eyebrow="LISTING AI" title="Listing AI Reports" description="Your Listing AI report workspace." />
      <ListingReportsPage />
    </RepToolsShell>
  );
}
