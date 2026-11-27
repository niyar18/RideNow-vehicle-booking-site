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
    <PublicHeading label="Images & credits" title="Behind the pictures.">
      The location photographs below were shared under open licences. Some were cropped or resized for the site.
    </PublicHeading>
    <CreditList title="Places and journeys" credits={places} />
    <section className="mb-10 max-w-2xl">
      <h2 className="mb-2 text-xl font-semibold tracking-tight sm:text-2xl">Fleet illustrations</h2>
      <p className="text-sm leading-relaxed text-[var(--text-secondary)]">
        The fleet catalogue and some ride options use original AI-generated vehicle illustrations, separate from the real photos credited here. They show vehicle categories, not the exact model assigned to a ride.
      </p>
    </section>
    <CreditList title="Vehicle photography archive" credits={vehicles} />
  </PublicPage>;
}
