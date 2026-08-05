import { ListingEvaluationReportPage } from "../listing-evaluation-client";

export default async function ListingEvaluationReportRoute({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ListingEvaluationReportPage id={id} />;
}
