import Link from "next/link";
import { ArrowRight, Bike, FileCheck, Landmark } from "lucide-react";
import { PartnerSetupFrame, partnerAction } from "@/features/partner/components/PartnerWorkspace";

const steps = [
  {
    icon: Bike,
    title: "Add your vehicle",
    description: "Choose a vehicle type and enter its registration number.",
  },
  {
    icon: FileCheck,
    title: "Verify your documents",
    description: "Have a clear profile photo, your driving licence, registration and insurance ready.",
  },
  {
    icon: Landmark,
    title: "Set up your payouts",
    description: "Add the bank details you want to use for ride earnings.",
  },
];

export default function PartnerOnboard() {
  return (
    <PartnerSetupFrame>
      <header className="mb-5 border-b border-[var(--border-default)] pb-5 sm:mb-7 sm:pb-7">
        <p className="mb-2 text-sm font-semibold text-[var(--text-secondary)]">Partner registration</p>
        <h1 className="text-3xl leading-tight font-semibold tracking-[-0.045em] sm:text-4xl">Drive with Jaatri.</h1>
        <p className="mt-2 max-w-md text-sm leading-relaxed text-[var(--text-secondary)] sm:text-base">
          Get set up to drive with Jaatri and connect with people travelling across Assam.
        </p>
      </header>

      <ol aria-label="Registration steps" className="divide-y divide-[var(--border-default)]">
        {steps.map(({ icon: Icon, title, description }, index) => (
          <li key={title} className="grid grid-cols-[2.75rem_minmax(0,1fr)_auto] items-start gap-3 py-4 sm:gap-4">
            <span className="grid size-11 place-items-center rounded-lg border border-[var(--border-default)] bg-[var(--surface-subtle)] text-[var(--text-primary)]">
              <Icon size={20} aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-base font-semibold">{title}</h2>
              <p className="mt-0.5 text-sm leading-relaxed text-[var(--text-secondary)]">{description}</p>
            </div>
            <span className="mt-0.5 text-xs font-medium tabular-nums text-[var(--text-secondary)]">{`0${index + 1}`}</span>
          </li>
        ))}
      </ol>

      <div className="mt-4 flex flex-col gap-2 border-t border-[var(--border-default)] pt-5 sm:mt-6 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-[var(--text-secondary)]">Three steps to create your driver profile.</p>
        <Link href="/partner/onboard/vehicle" className={partnerAction}>
          Start registration <ArrowRight size={16} aria-hidden="true" />
        </Link>
      </div>
    </PartnerSetupFrame>
  );
}
