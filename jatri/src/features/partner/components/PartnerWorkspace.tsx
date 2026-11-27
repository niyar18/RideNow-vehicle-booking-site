import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, CalendarDays, Car, ClipboardList, LayoutGrid, Wallet } from "lucide-react";

const workspaceLinks = [
  { title: "Overview", href: "/partners/dashboard", icon: LayoutGrid, key: "overview" },
  { title: "Requests", href: "/partner/pending-requests", icon: ClipboardList, key: "requests" },
  { title: "Trips", href: "/partner/bookings", icon: CalendarDays, key: "trips" },
  { title: "Wallet", href: "/partner/wallet", icon: Wallet, key: "wallet" },
] as const;

export const partnerAction = "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[var(--brand-primary)] px-4 text-sm font-semibold text-white transition-colors hover:bg-[var(--brand-strong)] disabled:opacity-50";
export const partnerSecondaryAction = "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-[var(--border-default)] bg-[var(--surface-raised)] px-4 text-sm font-semibold text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-subtle)]";

export function PartnerWorkspaceNav({ current }: { current: typeof workspaceLinks[number]["key"] }) {
  return (
    <nav aria-label="Driver workspace" className="border-b border-[var(--border-default)] bg-[var(--surface-raised)]">
      <div className="mx-auto flex max-w-5xl flex-col gap-2 px-4 pt-3 sm:flex-row sm:items-center sm:justify-between sm:gap-8 sm:px-6 sm:py-3">
        <Link href="/partners/dashboard" className="inline-flex min-h-10 w-fit items-center gap-2 rounded-lg pr-2 font-semibold text-[var(--text-primary)]">
          <span className="grid size-8 place-items-center rounded-lg bg-[#d9ea84] text-[#17221a]"><Car size={17} aria-hidden="true" /></span>
          Jaatri <span className="font-medium text-[var(--text-secondary)]">for drivers</span>
        </Link>
        <div className="grid grid-cols-4 gap-2 sm:flex sm:gap-1">
          {workspaceLinks.map(({ title, href, icon: Icon, key }) => (
            <Link
              aria-current={key === current ? "page" : undefined}
              className={`flex min-h-11 items-center justify-center gap-2 border-b-2 px-1 text-xs whitespace-nowrap transition-colors sm:rounded-lg sm:border-0 sm:px-3 sm:text-sm ${key === current
                ? "border-[var(--brand-primary)] font-semibold text-[var(--text-primary)] sm:bg-[var(--surface-subtle)]"
                : "border-transparent font-medium text-[var(--text-secondary)] hover:bg-[var(--surface-subtle)]"}`}
              key={key}
              href={href}
            >
              <Icon size={15} aria-hidden="true" className="hidden sm:block" />
              {title}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
}

export function PartnerPageTitle({ label, title, description, actions }: {
  label?: string;
  title: string;
  description: string;
  actions?: ReactNode;
}) {
  return (
    <header className="mb-5 flex flex-col gap-4 border-b border-[var(--border-default)] pb-5 sm:mb-7 sm:flex-row sm:items-end sm:justify-between sm:pb-7">
      <div>
        {label && <p className="mb-2 text-xs font-semibold text-[var(--text-secondary)]">{label}</p>}
        <h1 className="text-3xl leading-tight font-semibold tracking-[-0.04em] text-[var(--text-primary)] sm:text-4xl">{title}</h1>
        <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-[var(--text-secondary)]">{description}</p>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2 sm:shrink-0">{actions}</div>}
    </header>
  );
}

const setupSteps = ["Vehicle", "Documents", "Payouts"] as const;

export function PartnerSetupFrame({ children }: { children: ReactNode }) {
  return (
    <main className="min-h-screen bg-[var(--background)] px-4 py-5 text-[var(--text-primary)] sm:px-8 sm:py-10">
      <div className="mx-auto max-w-2xl">
        <div className="mb-4 flex items-center justify-between gap-3 border-b border-[var(--border-default)] pb-3 sm:mb-6">
          <Link href="/partners/dashboard" className="inline-flex min-h-10 items-center gap-2 text-sm font-semibold">
            <span className="grid size-8 place-items-center rounded-lg bg-[#d9ea84] text-[#17221a]"><Car size={17} aria-hidden="true" /></span>
            Jaatri <span className="font-medium text-[var(--text-secondary)]">for drivers</span>
          </Link>
          <Link href="/contact" className="inline-flex min-h-10 items-center gap-1.5 text-xs font-semibold text-[var(--text-secondary)] hover:underline sm:text-sm">
            Get help <ArrowRight size={14} aria-hidden="true" />
          </Link>
        </div>
        <div className="rounded-xl border border-[var(--border-default)] bg-[var(--surface-raised)] p-4 sm:p-8">
          {children}
        </div>
      </div>
    </main>
  );
}

export function PartnerSetupTitle({ step, title, description, onBack }: {
  step: 1 | 2 | 3;
  title: string;
  description: string;
  onBack: () => void;
}) {
  return (
    <>
      <div className="flex items-center justify-between gap-3">
        <button type="button" onClick={onBack} className={partnerSecondaryAction}><ArrowLeft size={16} aria-hidden="true" /> Back</button>
        <p className="text-sm font-medium text-[var(--text-secondary)]">Step {step} of 3</p>
      </div>
      <ol aria-label="Driver setup progress" className="mt-5 grid grid-cols-3 gap-2 sm:gap-3">
        {setupSteps.map((name, i) => (
          <li key={name} aria-current={i + 1 === step ? "step" : undefined} className={`border-t-2 pt-2.5 text-xs sm:text-sm ${i + 1 === step
            ? "border-[var(--brand-primary)] font-semibold text-[var(--text-primary)]"
            : i + 1 < step ? "border-[#a8b964] text-[var(--text-secondary)]" : "border-[var(--border-default)] text-[var(--text-secondary)]"}`}>
            {name}
          </li>
        ))}
      </ol>
      <h1 className="mt-6 text-2xl leading-tight font-semibold tracking-[-0.035em] sm:text-3xl">{title}</h1>
      <p className="mt-2 max-w-lg text-sm leading-relaxed text-[var(--text-secondary)]">{description}</p>
    </>
  );
}
