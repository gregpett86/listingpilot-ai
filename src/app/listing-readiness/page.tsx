import { redirect } from "next/navigation";

export default function ListingReadinessRedirect() {
  redirect("/listing-evaluation/new");
}
