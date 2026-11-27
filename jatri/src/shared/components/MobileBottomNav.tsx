"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, Car, ClipboardList, Compass, House, Navigation, UserRound, Wallet, type LucideIcon } from "lucide-react";
import { useTranslation } from "@/context/LanguageContext";
import { useSelector } from "react-redux";
import type { RootState } from "@/redux/store";
import { useSession } from "next-auth/react";

const hiddenRoutes = [/^\/book$/, /^\/checkout$/, /^\/ride\//, /^\/track\//, /^\/video-kyc\//, /^\/admin/, /^\/partner\/active-ride/, /^\/partner\/onboard/];
type Tab = { href: string; label: string; key: string; Icon: LucideIcon; active?: string[] };
const riderTabs: Tab[] = [
  { href: "/", label: "Home", key: "home", Icon: House },
  { href: "/explore", label: "Explore", key: "explore", Icon: Compass, active: ["/explore", "/fleet", "/search"] },
  { href: "/book?fresh=true", label: "Book", key: "book", Icon: Car },
  { href: "/bookings", label: "Bookings", key: "bookings", Icon: CalendarDays },
  { href: "/profile", label: "Account", key: "account", Icon: UserRound, active: ["/profile", "/settings", "/wallet", "/referral"] },
];
const partnerTabs: Tab[] = [
  { href: "/partners/dashboard", label: "Dashboard", key: "dashboard", Icon: House, active: ["/partners/dashboard", "/partner/dashboard", "/partner"] },
  { href: "/partner/pending-requests", label: "Requests", key: "requests", Icon: ClipboardList },
  { href: "/partner/active-ride", label: "Active ride", key: "activeRide", Icon: Navigation },
  { href: "/partner/bookings", label: "Bookings", key: "bookings", Icon: CalendarDays },
  { href: "/partner/wallet", label: "Wallet", key: "wallet", Icon: Wallet },
];

export default function MobileBottomNav() {
  const pathname = usePathname();
  const { t } = useTranslation();
  const user = useSelector((state: RootState) => state.user.userData);
  const { data: session } = useSession();
  if (!pathname || hiddenRoutes.some((pattern) => pattern.test(pathname))) return null;

  const partner = (user || session?.user)?.role === "vendor" || /^\/partners?(?:\/|$)/.test(pathname);
  return <>
    <div aria-hidden className="pointer-events-none h-[calc(4.25rem+env(safe-area-inset-bottom,0px))] w-full shrink-0 md:hidden" />
    <nav
      aria-label={partner ? "Partner mobile navigation" : "Mobile navigation"}
      className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--border-default)] bg-[var(--surface-raised)] px-2 pb-[max(4px,env(safe-area-inset-bottom))] text-[var(--text-primary)] md:hidden"
    >
      <div className="mx-auto grid min-h-15 max-w-lg grid-cols-5 items-stretch gap-1">
        {(partner ? partnerTabs : riderTabs).map(({ href, label, key, Icon, active }) => {
          const current = (active || [href]).includes(pathname);
          const mainAction = key === "book" || key === "activeRide";
          const homeBook = key === "book" && pathname === "/";
          return <Link href={href} key={href} aria-current={current ? "page" : undefined}
            className={`flex min-h-14 min-w-0 flex-col items-center justify-center gap-1 rounded-md px-0.5 text-center text-[10px] leading-tight ${current ? "font-bold text-[var(--text-primary)]" : "font-semibold text-[var(--text-muted)]"}`}
          >
            <span className={`flex items-center justify-center ${homeBook ? "h-9 w-9 rounded-full bg-[var(--action-bg)] text-[var(--action-fg)]" : "h-7 w-10 rounded-md"} ${!homeBook && mainAction ? "bg-[var(--action-bg)] text-[var(--action-fg)]" : current ? "bg-[var(--surface-subtle)]" : ""}`}>
              <Icon size={19} strokeWidth={current ? 2.35 : 1.8} aria-hidden />
            </span>
            {t(`nav.${key}`, label)}
          </Link>;
        })}
      </div>
    </nav>
  </>;
}
