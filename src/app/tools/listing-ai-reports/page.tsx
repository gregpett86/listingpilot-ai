import { RepToolsShell, ToolsPageHeader } from "@/components/rep-tools-shell";
import ListingAiReportsClient from "./listing-ai-reports-client";

export default function ToolsListingAiReportsPage() {
  return (
    <RepToolsShell activeLabel="Listing AI Reports">
      <ToolsPageHeader eyebrow="LISTING AI" title="Listing AI Reports" description="Saved property evaluations created from this Listing AI dashboard." />
      <div className="mx-auto max-w-7xl p-6 sm:p-10">
        <ListingAiReportsClient />
      </div>
    </RepToolsShell>
  );
}
