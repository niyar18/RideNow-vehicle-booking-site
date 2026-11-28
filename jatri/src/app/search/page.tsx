import { Suspense } from "react";
import SearchPageContent from "./SearchPageContent";

export default function SearchPage() {
  return (
    <Suspense fallback={<p role="status">Loading rides…</p>}>
      <SearchPageContent />
    </Suspense>
  );
}

export const metadata = { title: "Search rides" };
