import type { Metadata } from "next";
import { ArrowUpRight } from "lucide-react";
import { PublicHeading, PublicPage } from "@/shared/components/public/PublicPage";
import places from "@/lib/photoCreditsPlaces.json";
import vehicles from "@/lib/photoCreditsVehicles.json";

export const metadata: Metadata = {
  title: "Photo credits",
  alternates: { canonical: "/photo-credits" },
};

type Credit = {
  file: string;
  author: string;
  license: string;
  source: string;
  licenseUrl?: string;
  title?: string;
  description?: string;
};

function CreditList({ title, credits }: { title: string; credits: Credit[] }) {
  const bySource = new Map<string, Credit>();
  for (const credit of credits) {
    if (!bySource.has(credit.source)) bySource.set(credit.source, credit);
  }

  return <section className="mb-10 last:mb-0">
    <h2 className="mb-4 text-xl font-semibold tracking-tight sm:text-2xl">{title}</h2>
    <ul className="divide-y divide-[var(--border-default)] overflow-hidden rounded-xl border border-[var(--border-default)] bg-[var(--surface-raised)]">
      {[...bySource.values()].map((credit) => (
        <li key={credit.source} className="flex flex-wrap items-center justify-between gap-2 p-3.5 sm:p-4">
          <div className="min-w-0">
            <p className="break-words text-sm font-semibold">{credit.title || credit.description || credit.file.split("/").pop()?.replace(/\.webp$/, "")}</p>
            <p className="text-xs text-[var(--text-secondary)]">
              {credit.author} · {credit.licenseUrl ? <a href={credit.licenseUrl} className="underline underline-offset-2">{credit.license}</a> : credit.license}
            </p>
          </div>
          <a className="inline-flex min-h-10 items-center gap-1 text-sm font-medium underline-offset-4 hover:underline" href={credit.source}>
            Original photo <ArrowUpRight size={15} aria-hidden />
          </a>
        </li>
      ))}
    </ul>
  </section>;
}

export default function PhotoCreditsPage() {
  return <PublicPage>
    <PublicHeading label="Photography" title="The people behind the pictures.">
      Jaatri uses photographs shared under open licences. Some images were cropped or resized for the site. Vehicle photos show examples of the categories, not the exact vehicle assigned to a trip.
    </PublicHeading>
    <CreditList title="Places and journeys" credits={places} />
    <CreditList title="Vehicles" credits={vehicles} />
  </PublicPage>;
}
