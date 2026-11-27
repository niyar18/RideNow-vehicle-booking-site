import type { ReactNode } from "react";
import Link from "next/link";

const riderLinks = [
  { href: "/bookings", label: "Trips" },
  { href: "/wallet", label: "Wallet" },
  { href: "/profile", label: "Profile" },
  { href: "/settings", label: "Settings" },
] as const;

type RiderPageHeadProps = {
  title: string;
  description?: string;
  section?: string;
  current?: (typeof riderLinks)[number]["href"];
  action?: ReactNode;
};

export default function RiderPageHead({
  title,
  description,
  section = "Rider account",
  current,
  action,
}: RiderPageHeadProps) {
  return (
    <header className="mb-7 sm:mb-9">
      <div className="flex flex-wrap items-end justify-between gap-x-5 gap-y-4">
        <div className="min-w-0">
          <p className="mb-2.5 flex items-center gap-2 text-xs font-semibold text-[var(--text-secondary)]">
            <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-[var(--brand-primary)] dark:bg-[#d9ea84]" />
            {section}
          </p>
          <h1 className="text-[clamp(2rem,6vw,3.2rem)] leading-[1.04] font-semibold tracking-[-0.05em] text-[var(--text-primary)]">
            {title}
          </h1>
          {description && <p className="mt-3 max-w-[53ch] text-sm leading-relaxed text-[var(--text-secondary)] sm:text-base">{description}</p>}
        </div>
        {action}
      </div>
      {current && (
        <nav aria-label="Rider account" className="mt-6 grid grid-cols-4 border-b border-[var(--border-default)] sm:flex sm:gap-5">
          {riderLinks.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              aria-current={current === href ? "page" : undefined}
              className={`flex min-h-11 items-center justify-center border-b-2 px-1 text-sm font-medium transition-colors hover:text-[var(--text-primary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)] sm:justify-start sm:px-2 ${
                current === href
                  ? "border-[var(--brand-primary)] text-[var(--text-primary)] dark:border-[#d9ea84]"
                  : "border-transparent text-[var(--text-secondary)]"
              }`}
            >
              {label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}
